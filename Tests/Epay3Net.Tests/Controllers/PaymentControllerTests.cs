using System.Security.Claims;
using Epay3Net.Controllers;
using Epay3Net.Authorization;
using Epay3Net.Models;
using Epay3Service.Clients.Models;
using Epay3Service.Configuration;
using Epay3Service.Helpers;
using Epay3Service.Models;
using Epay3Service.Managers.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;
using ApiPaymentMethod = Epay3Net.Models.PaymentMethod;
using ServicePaymentMethod = Epay3Service.Models.PaymentMethod;
using ServiceThemeConfig = Epay3Service.Models.ThemeConfig;

namespace Epay3Net.Tests.Controllers;

public class PaymentControllerTests
{
    private const string EncryptionKey = "encryption-key-that-is-long-enough";
    private const string CvvEncryptionKey = "cvv-encryption-key-that-is-long-enough";

    private readonly Mock<IPaymentManager> _mockPaymentManager = new();
    private readonly Mock<IAccountManager> _mockAccountManager = new();
    private readonly Mock<IUserManager> _mockUserManager = new();
    private readonly Mock<ILanguageManager> _mockLanguageManager = new();
    private readonly Mock<IAuthorizationService> _mockAuthorizationService = new();
    private readonly Mock<IApplicationConfigurationManager> _mockApplicationConfigurationManager = new();
    private readonly PaymentController _controller;

    public PaymentControllerTests()
    {
        _controller = new PaymentController(
            _mockPaymentManager.Object,
            _mockAccountManager.Object,
            _mockUserManager.Object,
            _mockLanguageManager.Object,
            _mockAuthorizationService.Object,
            new ApplicationSecrets
            {
                EncryptionKey = EncryptionKey,
                CvvEncryptionKey = CvvEncryptionKey
            },
            _mockApplicationConfigurationManager.Object);

        _mockLanguageManager
            .Setup(manager => manager.GetMessage(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns((string _, string _, string message) => message);

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                    new[] { new Claim("UserId", "user-1") }, "mock"))
            }
        };
    }

    [Fact]
    public async Task GetPaymentMethods_RemovesCardValidationCodesFromPayerDetails()
    {
        // Arrange
        const string selectedAccount = "sold-to-1";
        const string payer = "payer-1";
        var user = new User
        {
            UserId = "user-1",
            Login = "user",
            Email = "user@example.com",
            FirstName = "Test",
            LastName = "User",
            PrimaryAccountType = AccountType.Payer,
            Role = "user"
        };
        var accounts = new List<Account>
        {
            new() { PrimaryAcct = payer, AccountTypeId = AccountType.Payer }
        };
        var payerDetail = new PayerDetail
        {
            PaymentCards =
            [
                new PaymentCard
                {
                    PaymentCardType = "VI",
                    PaymentCardToken = "card-token-1234",
                    PaymentCardName = "Card",
                    ValidTo = DateTime.UtcNow.AddYears(1).ToString("MM-dd-yyyy"),
                    CardValidationCode = "123",
                    Default = "X"
                }
            ]
        };

        _mockUserManager.Setup(manager => manager.GetUserById("user-1", It.IsAny<string>()))
            .ReturnsAsync(user);
        _mockAccountManager.Setup(manager => manager.GetLinkedAccountsByUser(user, It.IsAny<string>(), It.IsAny<bool>()))
            .ReturnsAsync(accounts);
        _mockAccountManager.Setup(manager => manager.FindLinkedAccount(accounts, payer, null))
            .Returns(accounts[0]);
        _mockAuthorizationService
            .Setup(service => service.AuthorizeAsync(
                It.IsAny<ClaimsPrincipal>(),
                selectedAccount,
                It.Is<IEnumerable<IAuthorizationRequirement>>(requirements =>
                    requirements.Contains(UserOperations.UserAccount))))
            .ReturnsAsync(AuthorizationResult.Success());
        _mockPaymentManager.Setup(manager => manager.GetPayerDetails(user, selectedAccount, payer, It.IsAny<string>()))
            .ReturnsAsync(payerDetail);

        // Act
        var result = await _controller.GetPaymentMethods(selectedAccount, payer);

        // Assert
        Assert.IsType<OkObjectResult>(result);
        Assert.Null(payerDetail.PaymentCards[0].CardValidationCode);
    }

    [Fact]
    public async Task GetPaymentMethods_ReturnsOnlyValidCardsWithMappedResponse()
    {
        const string selectedAccount = "sold-to-1";
        const string payer = "payer-1";
        var user = CreateUser(AccountType.Payer);
        var accounts = new List<Account> { CreateAccount(payer, AccountType.Payer) };
        var validTo = new DateTime(DateTime.Now.Year + 1, 12, 31);
        var payerDetail = new PayerDetail
        {
            PaymentCards =
            [
                new PaymentCard
                {
                    PaymentCardType = "VI",
                    PaymentCardToken = "card-token-1234",
                    PaymentCardName = "Business",
                    CardLast4Digit = "4242",
                    ValidTo = validTo.ToString("MM-dd-yyyy"),
                    Default = "X"
                },
                new PaymentCard
                {
                    PaymentCardType = "MC",
                    PaymentCardToken = "expired-token",
                    PaymentCardName = "Expired",
                    CardLast4Digit = "0000",
                    ValidTo = "01-01-2000"
                }
            ]
        };

        SetupAuthorizedUser(user, accounts, selectedAccount, payer);
        _mockPaymentManager.Setup(manager => manager.GetPayerDetails(user, selectedAccount, payer, It.IsAny<string>()))
            .ReturnsAsync(payerDetail);

        IActionResult result = await _controller.GetPaymentMethods(selectedAccount, payer, lang: "en");

        var okResult = Assert.IsType<OkObjectResult>(result);
        var methods = Assert.IsType<List<ValidPaymentMethodResponse>>(okResult.Value);
        var method = Assert.Single(methods);
        Assert.Equal("VI", method.CardType);
        Assert.Equal("VISA", method.SapCardType);
        Assert.Equal("VI", method.GatewayCardType);
        Assert.Equal("card-token-1234", method.Token);
        Assert.Equal("card-token-1234", Encryption.Decrypt(method.Key!, EncryptionKey));
        Assert.True(method.Default);
        Assert.Equal("VI-4242-Business", method.Name);
        Assert.Equal(validTo.ToString("MM/yy"), method.ValidTo);
    }

    [Fact]
    public async Task MakePayment_DecryptsCvvFromVRef()
    {
        var user = new User
        {
            UserId = "user-1",
            Login = "user",
            Email = "user@example.com",
            FirstName = "Test",
            LastName = "User",
            PrimaryAccountType = AccountType.Payer,
            Role = "user"
        };
        var accounts = new List<Account>
        {
            new() { PrimaryAcct = "payer-1", AccountTypeId = AccountType.Payer }
        };
        var request = new PaymentRequest
        {
            SelectedAccount = "sold-to-1",
            Payer = "payer-1",
            Invoices = [new PaymentInvoice { PaymentAmount = 10, CurrencyKey = "USD" }],
            VRef = Encryption.Encrypt("123", "cvv-encryption-key-that-is-long-enough")
        };
        string? capturedCvv = null;

        _mockUserManager.Setup(manager => manager.GetUserById("user-1", It.IsAny<string>()))
            .ReturnsAsync(user);
        _mockAccountManager.Setup(manager => manager.GetLinkedAccountsByUser(user, It.IsAny<string>(), It.IsAny<bool>()))
            .ReturnsAsync(accounts);
        _mockAccountManager.Setup(manager => manager.FindLinkedAccount(accounts, request.Payer, null))
            .Returns(accounts[0]);
        _mockAuthorizationService
            .Setup(service => service.AuthorizeAsync(
                It.IsAny<ClaimsPrincipal>(),
                request.SelectedAccount,
                It.IsAny<IEnumerable<IAuthorizationRequirement>>()))
            .ReturnsAsync(AuthorizationResult.Success());
        _mockPaymentManager
            .Setup(manager => manager.MakePayment(
                user,
                request.SelectedAccount,
                request.Payer,
                request.CompanyCode ?? "",
                request.Invoices,
                It.IsAny<string?>(),
                request.CardinalData,
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<Epay3Service.Models.PaymentMethod>()))
            .Callback<User, string, string, string, List<PaymentInvoice>, string?, CardinalData?, string, string, string, Epay3Service.Models.PaymentMethod?>(
                (_, _, _, _, _, cvv, _, _, _, _, _) => capturedCvv = cvv)
            .ReturnsAsync(new PaymentReceipt());

        IActionResult result = await _controller.MakePayment(request, "en");

        Assert.IsType<OkObjectResult>(result);
        Assert.Equal("123", capturedCvv);
    }

    [Fact]
    public async Task MakePayment_ReturnsForbid_WhenRequestedUserIdDiffersWithoutImpersonate()
    {
        var request = CreatePaymentRequest();
        request.UserId = "user-2";

        IActionResult result = await _controller.MakePayment(request, "en");

        Assert.IsType<ForbidResult>(result);
        _mockUserManager.Verify(
            manager => manager.GetUserById(It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);
        _mockPaymentManager.Verify(
            manager => manager.MakePayment(
                It.IsAny<User>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<List<PaymentInvoice>>(),
                It.IsAny<string?>(),
                It.IsAny<CardinalData?>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<ServicePaymentMethod?>()),
            Times.Never);
    }

    [Fact]
    public async Task MakePayment_ReturnsBadRequest_WhenInvoicesMissing()
    {
        var user = CreateUser(AccountType.Payer);
        var accounts = new List<Account> { CreateAccount("payer-1", AccountType.Payer) };
        var request = CreatePaymentRequest();
        request.Invoices = [];

        SetupAuthorizedUser(user, accounts, request.SelectedAccount, request.Payer);

        IActionResult result = await _controller.MakePayment(request, "en");

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("No invoices", badRequest.Value);
        _mockPaymentManager.Verify(
            manager => manager.MakePayment(
                It.IsAny<User>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<List<PaymentInvoice>>(),
                It.IsAny<string?>(),
                It.IsAny<CardinalData?>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<ServicePaymentMethod?>()),
            Times.Never);
    }

    [Fact]
    public async Task MakePayment_ReturnsBadRequest_WhenInvoiceAmountIsZero()
    {
        var user = CreateUser(AccountType.Payer);
        var accounts = new List<Account> { CreateAccount("payer-1", AccountType.Payer) };
        var request = CreatePaymentRequest();
        request.Invoices = [new PaymentInvoice { PaymentAmount = 0, CurrencyKey = "USD" }];

        SetupAuthorizedUser(user, accounts, request.SelectedAccount, request.Payer);

        IActionResult result = await _controller.MakePayment(request, "en");

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("No invoices", badRequest.Value);
        _mockPaymentManager.Verify(
            manager => manager.MakePayment(
                It.IsAny<User>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<List<PaymentInvoice>>(),
                It.IsAny<string?>(),
                It.IsAny<CardinalData?>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<ServicePaymentMethod?>()),
            Times.Never);
    }

    [Fact]
    public async Task MakePayment_MapsPaymentMethodAndRequestHeadersForManager()
    {
        var user = CreateUser(AccountType.Payer);
        var accounts = new List<Account> { CreateAccount("payer-1", AccountType.Payer) };
        var request = CreatePaymentRequest();
        request.CompanyCode = null;
        request.PaymentMethod = new ApiPaymentMethod
        {
            Name = "Saved Card",
            Key = "key-1",
            CardType = "MASTERCARD",
            Default = true,
            Token = Encryption.Encrypt("payment-token-1", EncryptionKey),
            ValidFrom = "01/26",
            ValidTo = "12/28"
        };
        _controller.Request.Headers["User-Agent"] = "unit-test-agent";
        _controller.Request.Headers["X-Country"] = "US";

        ServicePaymentMethod? capturedPaymentMethod = null;
        string? capturedCompanyCode = null;
        string? capturedUserAgent = null;
        string? capturedCountry = null;
        SetupAuthorizedUser(user, accounts, request.SelectedAccount, request.Payer);
        _mockPaymentManager
            .Setup(manager => manager.MakePayment(
                user,
                request.SelectedAccount,
                request.Payer,
                It.IsAny<string>(),
                request.Invoices,
                It.IsAny<string?>(),
                request.CardinalData,
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<ServicePaymentMethod?>()))
            .Callback<User, string, string, string, List<PaymentInvoice>, string?, CardinalData?, string, string, string, ServicePaymentMethod?>(
                (_, _, _, companyCode, _, _, _, userAgent, country, _, paymentMethod) =>
                {
                    capturedCompanyCode = companyCode;
                    capturedUserAgent = userAgent;
                    capturedCountry = country;
                    capturedPaymentMethod = paymentMethod;
                })
            .ReturnsAsync(new PaymentReceipt());

        IActionResult result = await _controller.MakePayment(request, "en");

        Assert.IsType<OkObjectResult>(result);
        Assert.Equal("", capturedCompanyCode);
        Assert.Equal("unit-test-agent", capturedUserAgent);
        Assert.Equal("US", capturedCountry);
        Assert.NotNull(capturedPaymentMethod);
        Assert.Equal("Saved Card", capturedPaymentMethod!.Name);
        Assert.Equal("key-1", capturedPaymentMethod.Key);
        Assert.Equal("MC", capturedPaymentMethod.CardType);
        Assert.Equal("MC", capturedPaymentMethod.SapCardType);
        Assert.Equal("MC", capturedPaymentMethod.GatewayCardType);
        Assert.True(capturedPaymentMethod.Default);
        Assert.Equal("payment-token-1", capturedPaymentMethod.Token);
        Assert.Equal("01/26", capturedPaymentMethod.ValidFrom);
        Assert.Equal("12/28", capturedPaymentMethod.ValidTo);
    }

    [Fact]
    public async Task MakePayment_UsesNullCvv_WhenVRefCannotBeDecrypted()
    {
        var user = CreateUser(AccountType.Payer);
        var accounts = new List<Account> { CreateAccount("payer-1", AccountType.Payer) };
        var request = CreatePaymentRequest();
        request.Cvv = null;
        request.VRef = "not-valid-encrypted-data";

        string? capturedCvv = "not-null";
        SetupAuthorizedUser(user, accounts, request.SelectedAccount, request.Payer);
        _mockPaymentManager
            .Setup(manager => manager.MakePayment(
                user,
                request.SelectedAccount,
                request.Payer,
                request.CompanyCode ?? "",
                request.Invoices,
                It.IsAny<string?>(),
                request.CardinalData,
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<ServicePaymentMethod?>()))
            .Callback<User, string, string, string, List<PaymentInvoice>, string?, CardinalData?, string, string, string, ServicePaymentMethod?>(
                (_, _, _, _, _, cvv, _, _, _, _, _) => capturedCvv = cvv)
            .ReturnsAsync(new PaymentReceipt());

        IActionResult result = await _controller.MakePayment(request, "en");

        Assert.IsType<OkObjectResult>(result);
        Assert.Null(capturedCvv);
    }

    [Fact]
    public async Task ScheduledPayment_PassesScheduledDateToManager()
    {
        var user = CreateUser(AccountType.Payer);
        var accounts = new List<Account> { CreateAccount("payer-1", AccountType.Payer) };
        var request = CreatePaymentRequest();
        request.ScheduledDate = "2026-09-15";
        var receipt = new SapHttpStatus { MessageType = "S", Line = "Scheduled" };

        string? capturedScheduledDate = null;
        SetupAuthorizedUser(user, accounts, request.SelectedAccount, request.Payer);
        _mockPaymentManager
            .Setup(manager => manager.ScheduledPayment(
                user,
                request.SelectedAccount,
                request.Payer,
                request.CompanyCode ?? "",
                request.Invoices,
                It.IsAny<string?>(),
                request.CardinalData,
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<ServicePaymentMethod?>(),
                It.IsAny<string?>()))
            .Callback<User, string, string, string, List<PaymentInvoice>, string?, CardinalData?, string, string, string, ServicePaymentMethod?, string?>(
                (_, _, _, _, _, _, _, _, _, _, _, scheduledDate) => capturedScheduledDate = scheduledDate)
            .ReturnsAsync(receipt);

        IActionResult result = await _controller.ScheduledPayment(request, "en");

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Same(receipt, okResult.Value);
        Assert.Equal("2026-09-15", capturedScheduledDate);
    }

    [Fact]
    public async Task DeleteScheduledPayment_AuthorizesCustomerNumberAndCallsManager()
    {
        var user = CreateUser(AccountType.SoldTo);
        var accounts = new List<Account> { CreateAccount("sold-to-1", AccountType.SoldTo) };
        var request = new DeleteScheduledPaymentRequest
        {
            ScheduleId = "schedule-1",
            CustomerNumber = "sold-to-1",
            CompanyCode = "1000",
            Payer = "payer-1"
        };
        var receipt = new SapHttpStatus { MessageType = "S", Line = "Deleted" };
        object? authorizationResource = null;

        SetupAuthorizedUser(user, accounts, request.CustomerNumber, request.CustomerNumber);
        _mockAuthorizationService
            .Setup(service => service.AuthorizeAsync(
                It.IsAny<ClaimsPrincipal>(),
                It.IsAny<object>(),
                It.IsAny<IEnumerable<IAuthorizationRequirement>>()))
            .Callback<ClaimsPrincipal, object, IEnumerable<IAuthorizationRequirement>>((_, resource, _) =>
                authorizationResource = resource)
            .ReturnsAsync(AuthorizationResult.Success());
        _mockPaymentManager
            .Setup(manager => manager.DeleteSchedulepayment(
                user,
                request.ScheduleId,
                request.Payer,
                request.CompanyCode,
                It.IsAny<string>()))
            .ReturnsAsync(receipt);

        IActionResult result = await _controller.DeleteScheduledPayment(request, "en");

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Same(receipt, okResult.Value);
        Assert.Equal(request.CustomerNumber, authorizationResource);
        _mockPaymentManager.Verify(
            manager => manager.DeleteSchedulepayment(user, request.ScheduleId, request.Payer, request.CompanyCode, "en"),
            Times.Once);
    }

    [Fact]
    public async Task MakeDeposit_NormalizesMastercardAndDecryptsCvvFromVRef()
    {
        var user = CreateUser(AccountType.SoldTo);
        var accounts = new List<Account> { CreateAccount("sold-to-1", AccountType.SoldTo) };
        var request = new DepositRequest
        {
            SelectedAccount = "sold-to-1",
            Payer = "payer-1",
            CompanyCode = "1000",
            depositDetails = new DepositDetail { AmountToProcess = 25, CurrencyKey = "USD" },
            PaymentMethod = new ServicePaymentMethod { CardType = "MASTERCARD", Token = "token-1" },
            VRef = Encryption.Encrypt("777", CvvEncryptionKey)
        };
        var receipt = new DepositsResponse();

        string? capturedCvv = null;
        ServicePaymentMethod? capturedPaymentMethod = null;
        SetupAuthorizedUser(user, accounts, request.SelectedAccount, request.SelectedAccount);
        _mockPaymentManager
            .Setup(manager => manager.MakeDeposit(
                user,
                request.SelectedAccount,
                request.CompanyCode!,
                request.Payer,
                request.depositDetails,
                "",
                It.IsAny<string?>(),
                request.CardinalData,
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<ServicePaymentMethod?>()))
            .Callback<User, string, string, string, DepositDetail, string, string?, CardinalData?, string, string, ServicePaymentMethod?>(
                (_, _, _, _, _, _, cvv, _, _, _, paymentMethod) =>
                {
                    capturedCvv = cvv;
                    capturedPaymentMethod = paymentMethod;
                })
            .ReturnsAsync(receipt);

        IActionResult result = await _controller.MakeDeposit(request, "en");

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Same(receipt, okResult.Value);
        Assert.Equal("777", capturedCvv);
        Assert.NotNull(capturedPaymentMethod);
        Assert.Equal("MC", capturedPaymentMethod!.CardType);
    }

    [Fact]
    public async Task GetPaymentReasonCodes_ReturnsConfiguredReasonCodes()
    {
        var reasonCodes = new List<PaymentReasonCodeInfo>
        {
            new() { ReasonCode = "A1", CompanyCode = "1000", Description = "Deposit" }
        };
        _mockApplicationConfigurationManager
            .Setup(manager => manager.GetPaymentReasonCodes(It.IsAny<string>()))
            .ReturnsAsync(reasonCodes);

        IActionResult result = await _controller.GetPaymentReasonCodes();

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Same(reasonCodes, okResult.Value);
    }

    [Fact]
    public async Task GetPaymentStyles_UsesThemeFromCssPath_WhenColorsMissing()
    {
        _controller.Request.Scheme = "https";
        _controller.Request.Host = new HostString("payments.example.test");
        _mockApplicationConfigurationManager
            .Setup(manager => manager.GetThemeForUrl("merchant/acme"))
            .ReturnsAsync(new ServiceThemeConfig
            {
                ButtonColor = "#112233",
                ButtonHoverColor = "#223344",
                ContrastColor = "#334455",
                ButtonBorderColor = "#445566",
                ButtonBorderHoverColor = "#556677"
            });

        IActionResult result = await _controller.GetPaymentStyles(
            p: null,
            h: null,
            s: null,
            b: null,
            bh: null,
            m: "EC",
            t: "H",
            u: "merchant/acme.css");

        var contentResult = Assert.IsType<ContentResult>(result);
        Assert.Equal("text/css", contentResult.ContentType);
        Assert.Contains("@import url('https://payments.example.test/assets/paymetric/ec_hosted.css');", contentResult.Content);
        Assert.Contains("--p-p: #112233", contentResult.Content);
        Assert.Contains("--p-h: #223344", contentResult.Content);
        Assert.Contains("--p-s: #334455", contentResult.Content);
        Assert.Contains("--p-b: #445566", contentResult.Content);
        Assert.Contains("--p-bh: #556677", contentResult.Content);
        _mockApplicationConfigurationManager.Verify(manager => manager.GetThemeForUrl("merchant/acme"), Times.Once);
    }

    private static User CreateUser(string primaryAccountType, string userId = "user-1") =>
        new()
        {
            UserId = userId,
            Login = "user",
            Email = "user@example.com",
            FirstName = "Test",
            LastName = "User",
            PrimaryAccountType = primaryAccountType,
            Role = "user"
        };

    private static Account CreateAccount(string primaryAccount, string accountType) =>
        new() { PrimaryAcct = primaryAccount, AccountTypeId = accountType };

    private static PaymentRequest CreatePaymentRequest() =>
        new()
        {
            SelectedAccount = "sold-to-1",
            Payer = "payer-1",
            Invoices = [new PaymentInvoice { PaymentAmount = 10, CurrencyKey = "USD" }],
            PaymentMethod = null
        };

    private void SetupAuthorizedUser(User user, List<Account> accounts, string authorizationAccount, string linkedAccount)
    {
        _mockUserManager.Setup(manager => manager.GetUserById(user.UserId!, It.IsAny<string>()))
            .ReturnsAsync(user);
        _mockAccountManager.Setup(manager => manager.GetLinkedAccountsByUser(user, It.IsAny<string>(), It.IsAny<bool>()))
            .ReturnsAsync(accounts);
        _mockAccountManager.Setup(manager => manager.FindLinkedAccount(accounts, linkedAccount, null))
            .Returns(accounts.First(account => account.PrimaryAcct == linkedAccount));
        _mockAuthorizationService
            .Setup(service => service.AuthorizeAsync(
                It.IsAny<ClaimsPrincipal>(),
                authorizationAccount,
                It.IsAny<IEnumerable<IAuthorizationRequirement>>()))
            .ReturnsAsync(AuthorizationResult.Success());
    }
}
