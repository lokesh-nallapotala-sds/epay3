using System.Security.Claims;
using Epay3Net.Controllers;
using Epay3Net.FeatureManagement;
using Epay3Net.Models;
using Epay3Service.Configuration;
using Epay3Service.Helpers;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.FeatureManagement;
using Moq;
using Xunit;
using ManagePaymentStatus = WebAR.Service.Services.API.Models.Status;
using PaymentCardsResponse = WebAR.Service.Services.API.Models.PaymentCardsResponse;
using PaymentCardPreAuthResponse = WebAR.Service.Services.API.Models.PaymentCardPreAuthResponse;

namespace Epay3Net.Tests.Controllers;

public class CustomerControllerTests
{
    private const string EncryptionKey = "encryption-key-that-is-long-enough";
    private const string CvvEncryptionKey = "cvv-encryption-key-that-is-long-enough";

    private readonly Mock<IPaymentManager> _mockPaymentManager = new();
    private readonly Mock<IAccountManager> _mockAccountManager = new();
    private readonly Mock<IUserManager> _mockUserManager = new();
    private readonly Mock<ILanguageManager> _mockLanguageManager = new();
    private readonly Mock<IApplicationConfigurationManager> _mockApplicationConfigurationManager = new();
    private readonly Mock<IFeatureManager> _mockFeatureManager = new();
    private readonly CustomerController _controller;

    public CustomerControllerTests()
    {
        _mockLanguageManager
            .Setup(manager => manager.GetMessage(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns((string _, string _, string message) => message);

        _controller = new CustomerController(
            _mockPaymentManager.Object,
            _mockAccountManager.Object,
            _mockUserManager.Object,
            _mockLanguageManager.Object,
            _mockApplicationConfigurationManager.Object,
            new ApplicationSecrets
            {
                EncryptionKey = EncryptionKey,
                CvvEncryptionKey = CvvEncryptionKey
            },
            _mockFeatureManager.Object);

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                    [new Claim("UserId", "user-1")],
                    "mock"))
            }
        };
    }

    [Fact]
    public async Task UpdatePaymentCards_ReturnsBadRequest_WhenActionMissing()
    {
        var request = new PaymentCardsRequest
        {
            Action = "",
            PayerData = new PayerData(),
            PaymentCards = []
        };

        IActionResult result = await _controller.UpdatePaymentCards(request, "en");

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Missing payment card action", badRequest.Value);
        _mockPaymentManager.Verify(
            manager => manager.ManagePaymentCard(
                It.IsAny<User>(),
                It.IsAny<string>(),
                It.IsAny<PayerData>(),
                It.IsAny<List<PaymentCard>>(),
                It.IsAny<string>(),
                It.IsAny<bool>(),
                It.IsAny<SapPaymentCardAddressData?>()),
            Times.Never);
    }

    [Fact]
    public async Task AddPaymentCard_WhenCvvControlDisabled_ClearsCvvAndReturnsStatus()
    {
        var user = CreateUser();
        var request = new AddPaymentCardRequest
        {
            PayerData = new PayerData { CustomerNumber = "payer-1", CompanyCode = "1000" },
            PaymentCard = new PaymentCard
            {
                PaymentCardType = "VI",
                PaymentCardToken = "token-1",
                CardValidationCode = "123"
            }
        };
        SetupCvvControl(enabled: false);
        SetupUser(user);

        List<PaymentCard>? capturedCards = null;
        bool? capturedReturnStatusOnSapError = null;
        var status = new ManagePaymentStatus { message_type = "S", message_line_string = "Saved" };
        _mockPaymentManager
            .Setup(manager => manager.ManagePaymentCard(
                user,
                "01",
                request.PayerData,
                It.IsAny<List<PaymentCard>>(),
                "en",
                It.IsAny<bool>(),
                null))
            .Callback<User, string, PayerData, List<PaymentCard>, string, bool, SapPaymentCardAddressData?>(
                (_, _, _, cards, _, returnStatusOnSapError, _) =>
                {
                    capturedCards = cards;
                    capturedReturnStatusOnSapError = returnStatusOnSapError;
                })
            .ReturnsAsync(new PaymentCardsResponse { Status = status });

        IActionResult result = await _controller.AddPaymentCard(request, "en");

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Same(status, okResult.Value);
        Assert.True(capturedReturnStatusOnSapError);
        var card = Assert.Single(capturedCards!);
        Assert.Null(card.CardValidationCode);
    }

    [Fact]
    public async Task AddPaymentCard_WhenCvvControlEnabled_DecryptsVRefForMissingCvv()
    {
        var user = CreateUser();
        var request = new AddPaymentCardRequest
        {
            PayerData = new PayerData { CustomerNumber = "payer-1", CompanyCode = "1000" },
            PaymentCard = new PaymentCard
            {
                PaymentCardType = "MC",
                PaymentCardToken = "token-1",
                CardValidationCode = null
            },
            VRef = Encryption.Encrypt("987", CvvEncryptionKey)
        };
        SetupCvvControl(enabled: true);
        SetupUser(user);

        string? capturedCvv = null;
        _mockPaymentManager
            .Setup(manager => manager.ManagePaymentCard(
                user,
                "01",
                request.PayerData,
                It.IsAny<List<PaymentCard>>(),
                "en",
                It.IsAny<bool>(),
                null))
            .Callback<User, string, PayerData, List<PaymentCard>, string, bool, SapPaymentCardAddressData?>(
                (_, _, _, cards, _, _, _) => capturedCvv = Assert.Single(cards).CardValidationCode)
            .ReturnsAsync(new PaymentCardsResponse { Status = new ManagePaymentStatus { message_type = "S" } });

        IActionResult result = await _controller.AddPaymentCard(request, "en");

        Assert.IsType<OkObjectResult>(result);
        Assert.Equal("987", capturedCvv);
    }

    [Fact]
    public async Task AddPaymentCard_WhenCvvControlEnabledAndVRefInvalid_ReturnsBadRequest()
    {
        var request = new AddPaymentCardRequest
        {
            PayerData = new PayerData(),
            PaymentCard = new PaymentCard
            {
                PaymentCardType = "VI",
                PaymentCardToken = "token-1"
            },
            VRef = "not-encrypted"
        };
        SetupCvvControl(enabled: true);

        IActionResult result = await _controller.AddPaymentCard(request, "en");

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Payment card CVV reference is invalid or expired", badRequest.Value);
        _mockUserManager.Verify(
            manager => manager.GetUserById(It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);
        _mockPaymentManager.Verify(
            manager => manager.ManagePaymentCard(
                It.IsAny<User>(),
                It.IsAny<string>(),
                It.IsAny<PayerData>(),
                It.IsAny<List<PaymentCard>>(),
                It.IsAny<string>(),
                It.IsAny<bool>(),
                It.IsAny<SapPaymentCardAddressData?>()),
            Times.Never);
    }

    [Fact]
    public async Task UpdatePaymentCard_DoesNotUseCvvControlAndCallsAction02()
    {
        var user = CreateUser();
        var request = new UpdatePaymentCardRequest
        {
            PayerData = new PayerData { CustomerNumber = "payer-1" },
            PaymentCard = new PaymentCard
            {
                PaymentCardType = "VI",
                PaymentCardToken = "token-1",
                CardValidationCode = null
            }
        };
        SetupUser(user);

        string? capturedAction = null;
        _mockPaymentManager
            .Setup(manager => manager.ManagePaymentCard(
                user,
                It.IsAny<string>(),
                request.PayerData,
                It.IsAny<List<PaymentCard>>(),
                "en",
                false,
                null))
            .Callback<User, string, PayerData, List<PaymentCard>, string, bool, SapPaymentCardAddressData?>(
                (_, action, _, _, _, _, _) => capturedAction = action)
            .ReturnsAsync(new PaymentCardsResponse { Status = new ManagePaymentStatus { message_type = "S" } });

        IActionResult result = await _controller.UpdatePaymentCard(request, "en");

        Assert.IsType<OkObjectResult>(result);
        Assert.Equal("02", capturedAction);
        _mockApplicationConfigurationManager.Verify(
            manager => manager.GetCustomConfig(It.IsAny<string>(), It.IsAny<bool>()),
            Times.Never);
    }

    [Fact]
    public async Task DoPreAuthentication_WhenFeatureDisabled_ReturnsEmptyOkWithoutCallingManager()
    {
        _mockFeatureManager.Setup(manager => manager.IsEnabledAsync(FeatureFlags.EnablePreAuth))
            .ReturnsAsync(false);

        IActionResult result = await _controller.DoPreAuthentication(new PreAuthorizePaymentCardRequest(), "en");

        var okResult = Assert.IsType<OkResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
        _mockPaymentManager.Verify(
            manager => manager.ManagePaymentCard(
                It.IsAny<User>(),
                It.IsAny<string>(),
                It.IsAny<PayerData>(),
                It.IsAny<List<PaymentCard>>(),
                It.IsAny<string>(),
                It.IsAny<bool>(),
                It.IsAny<SapPaymentCardAddressData?>()),
            Times.Never);
    }

    [Fact]
    public async Task DoPreAuthentication_WhenFeatureEnabled_ReturnsFullManagePaymentResponse()
    {
        var user = CreateUser();
        var addressData = new SapPaymentCardAddressData { Name = "Jane Buyer", Country = "US" };
        var request = new PreAuthorizePaymentCardRequest
        {
            PayerData = new PayerData { CustomerNumber = "payer-1" },
            PaymentCard = new PaymentCard { PaymentCardType = "VI", PaymentCardToken = "token-1" },
            AddressData = addressData
        };
        var response = new PaymentCardsResponse
        {
            PreAuth = new PaymentCardPreAuthResponse { Action = "04", Rccvv = "M" },
            Status = new ManagePaymentStatus { message_type = "S" }
        };
        _mockFeatureManager.Setup(manager => manager.IsEnabledAsync(FeatureFlags.EnablePreAuth))
            .ReturnsAsync(true);
        SetupUser(user);

        SapPaymentCardAddressData? capturedAddressData = null;
        bool? capturedReturnStatusOnSapError = null;
        _mockPaymentManager
            .Setup(manager => manager.ManagePaymentCard(
                user,
                "04",
                request.PayerData,
                It.IsAny<List<PaymentCard>>(),
                "en",
                It.IsAny<bool>(),
                It.IsAny<SapPaymentCardAddressData?>()))
            .Callback<User, string, PayerData, List<PaymentCard>, string, bool, SapPaymentCardAddressData?>(
                (_, _, _, _, _, returnStatusOnSapError, address) =>
                {
                    capturedReturnStatusOnSapError = returnStatusOnSapError;
                    capturedAddressData = address;
                })
            .ReturnsAsync(response);

        IActionResult result = await _controller.DoPreAuthentication(request, "en");

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Same(response, okResult.Value);
        Assert.True(capturedReturnStatusOnSapError);
        Assert.Same(addressData, capturedAddressData);
    }

    [Fact]
    public async Task EnableCardAutoPay_ReturnsNotFound_WhenPayerDetailsCannotBeResolved()
    {
        var user = CreateUser(AccountType.SoldTo);
        var request = CreateEnableAutoPayRequest();
        SetupUser(user);
        _mockAccountManager.Setup(manager => manager.GetAccountViewsByUser(user, "en", false))
            .ReturnsAsync([]);

        IActionResult result = await _controller.EnableCardAutoPay(request, "en");

        var notFound = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal("Payer detail not found.", notFound.Value);
        _mockPaymentManager.Verify(
            manager => manager.ManageAutoPay(
                It.IsAny<User>(),
                It.IsAny<PayerData>(),
                It.IsAny<bool>(),
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task EnableCardAutoPay_EnrollsMatchingEncryptedCardTokenAndReturnsUpdatedDetails()
    {
        var user = CreateUser(AccountType.SoldTo);
        var request = CreateEnableAutoPayRequest();
        request.CardToken = Encryption.Encrypt("plain-token", EncryptionKey);
        request.isAutoPayEnrolled = true;
        SetupUser(user);
        SetupAccountViews(
            user,
            CreatePayerDetail(isAutoPayEnrolled: false, paymentCardType: "VI", cardToken: "plain-token"),
            CreatePayerDetail(isAutoPayEnrolled: true, paymentCardType: "VI", cardToken: "plain-token"));

        PayerData? capturedPayerData = null;
        string? capturedPaymentMethodType = null;
        string? capturedPaymentCardToken = null;
        _mockPaymentManager
            .Setup(manager => manager.ManageAutoPay(
                user,
                It.IsAny<PayerData>(),
                true,
                It.IsAny<string>(),
                It.IsAny<string?>(),
                "en"))
            .Callback<User, PayerData, bool, string, string?, string>(
                (_, payerData, _, paymentMethodType, paymentCardToken, _) =>
                {
                    capturedPayerData = payerData;
                    capturedPaymentMethodType = paymentMethodType;
                    capturedPaymentCardToken = paymentCardToken;
                })
            .ReturnsAsync(new AutoPayEnrollmentResponse());

        IActionResult result = await _controller.EnableCardAutoPay(request, "en");

        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<UserPayerDetailsDto>(okResult.Value);
        Assert.True(response.IsAutoPayEnrolled);
        Assert.Equal(request.Payer, response.CustomerNumber);
        Assert.Equal(request.CompanyCode, response.CompanyCode);
        Assert.Equal("plain-token", Encryption.Decrypt(Assert.Single(response.PaymentCards).PaymentCardToken!, EncryptionKey));
        Assert.Equal(request.SelectedAccount, capturedPayerData!.CustomerNumber);
        Assert.Equal(request.CompanyCode, capturedPayerData.CompanyCode);
        Assert.Equal("CC", capturedPaymentMethodType);
        Assert.Equal("plain-token", capturedPaymentCardToken);
    }

    [Fact]
    public async Task UnEnrollAutoPay_WhenCurrentlyEnrolled_UnenrollsEcAndCc()
    {
        var user = CreateUser(AccountType.SoldTo);
        var request = new UnEnrollAutoPayRequest
        {
            SelectedAccount = "sold-to-1",
            Payer = "payer-1",
            CompanyCode = "1000"
        };
        SetupUser(user);
        SetupAccountViews(
            user,
            CreatePayerDetail(isAutoPayEnrolled: true, paymentCardType: "EC", cardToken: "ec-token"),
            CreatePayerDetail(isAutoPayEnrolled: false, paymentCardType: "EC", cardToken: "ec-token"));

        var capturedPaymentMethodTypes = new List<string>();
        _mockPaymentManager
            .Setup(manager => manager.ManageAutoPay(
                user,
                It.IsAny<PayerData>(),
                false,
                It.IsAny<string>(),
                "",
                "en"))
            .Callback<User, PayerData, bool, string, string?, string>(
                (_, _, _, paymentMethodType, _, _) => capturedPaymentMethodTypes.Add(paymentMethodType))
            .ReturnsAsync(new AutoPayEnrollmentResponse());

        IActionResult result = await _controller.UnEnrollAutoPay(request, "en");

        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<UserPayerDetailsDto>(okResult.Value);
        Assert.False(response.IsAutoPayEnrolled);
        Assert.Equal(["EC", "CC"], capturedPaymentMethodTypes);
    }

    private static User CreateUser(string primaryAccountType = AccountType.Payer) =>
        new()
        {
            UserId = "user-1",
            Login = "user",
            Email = "user@example.com",
            FirstName = "Test",
            LastName = "User",
            PrimaryAccountType = primaryAccountType,
            Role = "user"
        };

    private static EnableAutoPayCardRequest CreateEnableAutoPayRequest() =>
        new()
        {
            SelectedAccount = "sold-to-1",
            Payer = "payer-1",
            CompanyCode = "1000",
            CardToken = "plain-token"
        };

    private static PayerDetail CreatePayerDetail(bool isAutoPayEnrolled, string paymentCardType, string cardToken) =>
        new()
        {
            IsAutoPayEnrolled = isAutoPayEnrolled,
            CompanyData =
            [
                new CompanyDataWrapper
                {
                    Data = new CompanyData { CompanyCode = "1000" }
                }
            ],
            PaymentCards =
            [
                new PaymentCard
                {
                    PaymentCardType = paymentCardType,
                    PaymentCardToken = cardToken,
                    PaymentCardName = "Saved",
                    CardLast4Digit = "4242",
                    ValidTo = "12-31-2099"
                }
            ],
            PayerAutoPayStatus =
            [
                new AutoPayStatus
                {
                    CompanyCode = "1000",
                    Enrolled = isAutoPayEnrolled,
                    PaymentMethod = paymentCardType == "EC" ? "EC" : "CC",
                    PaymentCardToken = cardToken
                }
            ]
        };

    private void SetupUser(User user)
    {
        _mockUserManager.Setup(manager => manager.GetUserById(user.UserId!, It.IsAny<string>()))
            .ReturnsAsync(user);
    }

    private void SetupCvvControl(bool enabled)
    {
        _mockApplicationConfigurationManager
            .Setup(manager => manager.GetCustomConfig("en", It.IsAny<bool>()))
            .ReturnsAsync(new SapCustomData
            {
                GeneralData = new GeneralConfigInfo
                {
                    CvvUseControl = enabled ? "true" : "false"
                }
            });
    }

    private void SetupAccountViews(User user, PayerDetail initialPayerDetail, PayerDetail refreshedPayerDetail)
    {
        _mockAccountManager.Setup(manager => manager.GetAccountViewsByUser(user, "en", false))
            .ReturnsAsync([CreateAccountView(initialPayerDetail)]);
        _mockAccountManager.Setup(manager => manager.GetAccountViewsByUser(user, "en", true))
            .ReturnsAsync([CreateAccountView(refreshedPayerDetail)]);
    }

    private static AccountView CreateAccountView(PayerDetail payerDetail) =>
        new()
        {
            PrimaryAcct = "sold-to-1",
            CompanyCode = "1000",
            DefaultPayer = new RelatedAccount { PrimaryAccount = "payer-1" },
            ResolvedPayerDetails = payerDetail
        };
}
