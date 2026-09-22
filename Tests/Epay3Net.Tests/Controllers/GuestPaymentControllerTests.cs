using Epay3Net.Controllers;
using Epay3Net.Custom.ActionResult;
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
using WebAR.Service.Services.API.Models;

namespace Epay3Net.Tests.Controllers;

public class GuestPaymentControllerTests
{
    private const string EncryptionKey = "test-encryption-key-long-enough";
    private const string CvvEncryptionKey = "test-cvv-encryption-key-long-enough";

    private static readonly ApplicationSecrets ApplicationSecrets = new()
    {
        EncryptionKey = EncryptionKey,
        CvvEncryptionKey = CvvEncryptionKey,
        RequestsTokenKey = "test-request-token-key"
    };

    private readonly Mock<IPaymentManager> _mockPaymentManager = new();
    private readonly Mock<ILanguageManager> _mockLanguageManager = new();
    private readonly Mock<IFeatureManager> _mockFeatureManager = new();
    private readonly GuestPaymentController _controller;

    public GuestPaymentControllerTests()
    {
        _mockLanguageManager
            .Setup(m => m.GetMessage(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns((string _, string _, string message) => message);

        _controller = new GuestPaymentController(
            _mockPaymentManager.Object,
            _mockLanguageManager.Object,
            ApplicationSecrets,
            _mockFeatureManager.Object);

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
    }

    [Fact]
    public async Task Post_ReturnsMappedPayerDetails_AndRemovesCardValidationCodes()
    {
        var request = new PayerDetailsRequest
        {
            CustomerNumber = "payer-1",
            CompanyCode = "1000",
            Action = "get",
            SalesArea = new Epay3Service.Models.SalesArea()
        };
        var payerDetails = new PayerDetail
        {
            IsAutoPayEnrolled = true,
            AddressData = new CompanyAddress { City = "Chicago", Country = "US" },
            CompanyData =
            [
                new CompanyDataWrapper
                {
                    Data = new CompanyData { CompanyCode = "2000" }
                }
            ],
            PaymentCards =
            [
                new PaymentCard
                {
                    PaymentCardType = "VI",
                    PaymentCardToken = "token-1",
                    PaymentCardName = "Primary card",
                    CardLast4Digit = "4242",
                    ValidTo = DateTime.UtcNow.AddYears(1).ToString("MM-dd-yyyy"),
                    CardValidationCode = "123"
                }
            ],
            PayerAutoPayStatus =
            [
                new AutoPayStatus
                {
                    CompanyCode = "2000",
                    Enrolled = true,
                    PaymentMethod = "CC",
                    PaymentCardToken = "token-1"
                }
            ]
        };

        _mockPaymentManager
            .Setup(manager => manager.GetGuestPayerDetails(request, "en"))
            .ReturnsAsync(payerDetails);

        ActionResult<UserPayerDetailsDto> result = await _controller.Post(request, "en");

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<UserPayerDetailsDto>(okResult.Value);
        var paymentCard = Assert.Single(dto.PaymentCards);
        var autoPayStatus = Assert.Single(dto.PayerAutoPayStatus);

        Assert.Equal("payer-1", dto.CustomerNumber);
        Assert.Equal("2000", dto.CompanyCode);
        Assert.True(dto.IsAutoPayEnrolled);
        Assert.Equal("Chicago", dto.AddressData!.City);
        Assert.Equal("VI", paymentCard.PaymentCardType);
        Assert.Equal("token-1", Encryption.Decrypt(paymentCard.PaymentCardToken!, EncryptionKey));
        Assert.Null(paymentCard.CardValidationCode);
        Assert.Equal("4242", autoPayStatus.CardLast4Digit);
        Assert.Equal("token-1", Encryption.Decrypt(autoPayStatus.PaymentCardToken, EncryptionKey));
        Assert.Null(payerDetails.PaymentCards![0].CardValidationCode);
    }

    [Fact]
    public async Task MakePayment_DecryptsCvvFromVRef()
    {
        string plainCvv = "789";
        string encryptedVRef = Encryption.Encrypt(plainCvv, CvvEncryptionKey);

        PaymentDetail? capturedPayment = null;
        _mockPaymentManager
            .Setup(m => m.MakeGuestPayment(
                It.IsAny<PayerData>(), It.IsAny<SoldToPayment>(), It.IsAny<List<PaymentInvoice>>(),
                It.IsAny<PaymentDetail>(), It.IsAny<string>(), It.IsAny<CardinalData?>(),
                It.IsAny<string?>(), It.IsAny<string>()))
            .Callback<PayerData, SoldToPayment, List<PaymentInvoice>, PaymentDetail, string, CardinalData?, string?, string>(
                (_, _, _, payment, _, _, _, _) => capturedPayment = payment)
            .ReturnsAsync(new PaymentReceipt());

        var request = new GuestPaymentRequest
        {
            Payer = new PayerData(),
            SoldTo = new SoldToPayment(),
            Payment = new PaymentDetail { CardValidationCode = string.Empty },
            Invoices = [new PaymentInvoice { PaymentAmount = 10 }],
            VRef = encryptedVRef
        };

        IActionResult result = await _controller.MakePayment(request, "en");

        Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(capturedPayment);
        Assert.Equal(plainCvv, capturedPayment!.CardValidationCode);
    }

    [Fact]
    public async Task MakePayment_UsesPlaintextCvv_WhenAlreadyPresent()
    {
        PaymentDetail? capturedPayment = null;
        _mockPaymentManager
            .Setup(m => m.MakeGuestPayment(
                It.IsAny<PayerData>(), It.IsAny<SoldToPayment>(), It.IsAny<List<PaymentInvoice>>(),
                It.IsAny<PaymentDetail>(), It.IsAny<string>(), It.IsAny<CardinalData?>(),
                It.IsAny<string?>(), It.IsAny<string>()))
            .Callback<PayerData, SoldToPayment, List<PaymentInvoice>, PaymentDetail, string, CardinalData?, string?, string>(
                (_, _, _, payment, _, _, _, _) => capturedPayment = payment)
            .ReturnsAsync(new PaymentReceipt());

        var request = new GuestPaymentRequest
        {
            Payer = new PayerData(),
            SoldTo = new SoldToPayment(),
            Payment = new PaymentDetail { CardValidationCode = "111" },
            Invoices = [new PaymentInvoice { PaymentAmount = 10 }],
            VRef = Encryption.Encrypt("222", CvvEncryptionKey)
        };

        IActionResult result = await _controller.MakePayment(request, "en");

        Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(capturedPayment);
        Assert.Equal("111", capturedPayment!.CardValidationCode);
    }

    [Fact]
    public async Task MakePayment_ReturnsBadRequest_WhenInvoicesMissing()
    {
        var request = new GuestPaymentRequest
        {
            Payer = new PayerData(),
            SoldTo = new SoldToPayment(),
            Payment = new PaymentDetail(),
            Invoices = []
        };

        IActionResult result = await _controller.MakePayment(request, "en");

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("No invoices", badRequest.Value);
        _mockPaymentManager.Verify(
            manager => manager.MakeGuestPayment(
                It.IsAny<PayerData>(),
                It.IsAny<SoldToPayment>(),
                It.IsAny<List<PaymentInvoice>>(),
                It.IsAny<PaymentDetail>(),
                It.IsAny<string>(),
                It.IsAny<CardinalData?>(),
                It.IsAny<string?>(),
                It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task MakePayment_ReturnsBadRequest_WhenInvoiceAmountIsZero()
    {
        var request = new GuestPaymentRequest
        {
            Payer = new PayerData(),
            SoldTo = new SoldToPayment(),
            Payment = new PaymentDetail(),
            Invoices = [new PaymentInvoice { PaymentAmount = 0 }]
        };

        IActionResult result = await _controller.MakePayment(request, "en");

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("No invoices", badRequest.Value);
        _mockPaymentManager.Verify(
            manager => manager.MakeGuestPayment(
                It.IsAny<PayerData>(),
                It.IsAny<SoldToPayment>(),
                It.IsAny<List<PaymentInvoice>>(),
                It.IsAny<PaymentDetail>(),
                It.IsAny<string>(),
                It.IsAny<CardinalData?>(),
                It.IsAny<string?>(),
                It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task MakePayment_PassesHeaderCountryAndGuestEmail_ToManager()
    {
        _controller.Request.Headers["X-Country"] = "US";

        string? capturedCountry = null;
        string? capturedGuestEmail = null;
        _mockPaymentManager
            .Setup(m => m.MakeGuestPayment(
                It.IsAny<PayerData>(), It.IsAny<SoldToPayment>(), It.IsAny<List<PaymentInvoice>>(),
                It.IsAny<PaymentDetail>(), It.IsAny<string>(), It.IsAny<CardinalData?>(),
                It.IsAny<string?>(), It.IsAny<string>()))
            .Callback<PayerData, SoldToPayment, List<PaymentInvoice>, PaymentDetail, string, CardinalData?, string?, string>(
                (_, _, _, _, country, _, guestEmail, _) =>
                {
                    capturedCountry = country;
                    capturedGuestEmail = guestEmail;
                })
            .ReturnsAsync(new PaymentReceipt());

        var request = new GuestPaymentRequest
        {
            Payer = new PayerData(),
            SoldTo = new SoldToPayment(),
            Payment = new PaymentDetail(),
            Invoices = [new PaymentInvoice { PaymentAmount = 10 }],
            GuestUserEmail = "guest@example.com"
        };

        IActionResult result = await _controller.MakePayment(request, "en");

        Assert.IsType<OkObjectResult>(result);
        Assert.Equal("US", capturedCountry);
        Assert.Equal("guest@example.com", capturedGuestEmail);
    }

    [Fact]
    public async Task MakePayment_LeavesCvvUnset_WhenVRefCannotBeDecrypted()
    {
        PaymentDetail? capturedPayment = null;
        _mockPaymentManager
            .Setup(m => m.MakeGuestPayment(
                It.IsAny<PayerData>(), It.IsAny<SoldToPayment>(), It.IsAny<List<PaymentInvoice>>(),
                It.IsAny<PaymentDetail>(), It.IsAny<string>(), It.IsAny<CardinalData?>(),
                It.IsAny<string?>(), It.IsAny<string>()))
            .Callback<PayerData, SoldToPayment, List<PaymentInvoice>, PaymentDetail, string, CardinalData?, string?, string>(
                (_, _, _, payment, _, _, _, _) => capturedPayment = payment)
            .ReturnsAsync(new PaymentReceipt());

        var request = new GuestPaymentRequest
        {
            Payer = new PayerData(),
            SoldTo = new SoldToPayment(),
            Payment = new PaymentDetail { CardValidationCode = null },
            Invoices = [new PaymentInvoice { PaymentAmount = 10 }],
            VRef = "not-valid-encrypted-data"
        };

        IActionResult result = await _controller.MakePayment(request, "en");

        Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(capturedPayment);
        Assert.Null(capturedPayment!.CardValidationCode);
    }

    [Fact]
    public async Task MakePayment_ReturnsExceptionResult_WhenManagerThrows()
    {
        _mockPaymentManager
            .Setup(m => m.MakeGuestPayment(
                It.IsAny<PayerData>(), It.IsAny<SoldToPayment>(), It.IsAny<List<PaymentInvoice>>(),
                It.IsAny<PaymentDetail>(), It.IsAny<string>(), It.IsAny<CardinalData?>(),
                It.IsAny<string?>(), It.IsAny<string>()))
            .ThrowsAsync(new InvalidOperationException("boom"));

        var request = new GuestPaymentRequest
        {
            Payer = new PayerData(),
            SoldTo = new SoldToPayment(),
            Payment = new PaymentDetail(),
            Invoices = [new PaymentInvoice { PaymentAmount = 10 }]
        };

        IActionResult result = await _controller.MakePayment(request, "en");

        Assert.IsType<ExceptionResult>(result);
    }

    [Fact]
    public async Task DoPreAuthentication_ReturnsOk_WhenFeatureDisabled()
    {
        _mockFeatureManager
            .Setup(manager => manager.IsEnabledAsync(FeatureFlags.EnablePreAuth))
            .ReturnsAsync(false);

        var request = new GuestPaymentPreAuthorizeCardRequest();

        IActionResult result = await _controller.DoPreAuthentication(request, "en");

        Assert.IsType<OkResult>(result);
        _mockPaymentManager.Verify(
            manager => manager.ManageGuestPaymentCard(
                It.IsAny<string>(),
                It.IsAny<PayerData>(),
                It.IsAny<List<PaymentCard>>(),
                It.IsAny<string>(),
                It.IsAny<bool>(),
                It.IsAny<SapPaymentCardAddressData?>()),
            Times.Never);
    }

    [Fact]
    public async Task DoPreAuthentication_DecryptsCvvAndCallsManager_WhenFeatureEnabled()
    {
        string encryptedVRef = Encryption.Encrypt("456", CvvEncryptionKey);
        var response = new PaymentCardsResponse
        {
            PreAuth = new PaymentCardPreAuthResponse { Action = "approved" }
        };

        string? capturedAction = null;
        PaymentCard? capturedCard = null;
        string? capturedLanguage = null;
        bool capturedReturnStatusOnSapError = false;
        SapPaymentCardAddressData? capturedAddress = null;

        _mockFeatureManager
            .Setup(manager => manager.IsEnabledAsync(FeatureFlags.EnablePreAuth))
            .ReturnsAsync(true);
        _mockPaymentManager
            .Setup(manager => manager.ManageGuestPaymentCard(
                It.IsAny<string>(),
                It.IsAny<PayerData>(),
                It.IsAny<List<PaymentCard>>(),
                It.IsAny<string>(),
                It.IsAny<bool>(),
                It.IsAny<SapPaymentCardAddressData?>()))
            .Callback<string, PayerData, List<PaymentCard>, string, bool, SapPaymentCardAddressData?>(
                (action, _, cards, language, returnStatusOnSapError, address) =>
                {
                    capturedAction = action;
                    capturedCard = cards.Single();
                    capturedLanguage = language;
                    capturedReturnStatusOnSapError = returnStatusOnSapError;
                    capturedAddress = address;
                })
            .ReturnsAsync(response);

        var address = new SapPaymentCardAddressData { City = "Dallas" };
        var request = new GuestPaymentPreAuthorizeCardRequest
        {
            PayerData = new PayerData(),
            PaymentCard = new PaymentCard { CardValidationCode = string.Empty },
            AddressData = address,
            VRef = encryptedVRef
        };

        IActionResult result = await _controller.DoPreAuthentication(request, "en");

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Same(response, okResult.Value);
        Assert.Equal("04", capturedAction);
        Assert.NotNull(capturedCard);
        Assert.Equal("456", capturedCard!.CardValidationCode);
        Assert.Equal("en", capturedLanguage);
        Assert.True(capturedReturnStatusOnSapError);
        Assert.Same(address, capturedAddress);
    }

    [Fact]
    public async Task DoPreAuthentication_LeavesCvvUnset_WhenVRefCannotBeDecrypted()
    {
        PaymentCard? capturedCard = null;

        _mockFeatureManager
            .Setup(manager => manager.IsEnabledAsync(FeatureFlags.EnablePreAuth))
            .ReturnsAsync(true);
        _mockPaymentManager
            .Setup(manager => manager.ManageGuestPaymentCard(
                It.IsAny<string>(),
                It.IsAny<PayerData>(),
                It.IsAny<List<PaymentCard>>(),
                It.IsAny<string>(),
                It.IsAny<bool>(),
                It.IsAny<SapPaymentCardAddressData?>()))
            .Callback<string, PayerData, List<PaymentCard>, string, bool, SapPaymentCardAddressData?>(
                (_, _, cards, _, _, _) => capturedCard = cards.Single())
            .ReturnsAsync(new PaymentCardsResponse());

        var request = new GuestPaymentPreAuthorizeCardRequest
        {
            PayerData = new PayerData(),
            PaymentCard = new PaymentCard { CardValidationCode = null },
            VRef = "not-valid-encrypted-data"
        };

        IActionResult result = await _controller.DoPreAuthentication(request, "en");

        Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(capturedCard);
        Assert.Null(capturedCard!.CardValidationCode);
    }

    [Fact]
    public async Task DoPreAuthentication_ReturnsExceptionResult_WhenManagerThrows()
    {
        _mockFeatureManager
            .Setup(manager => manager.IsEnabledAsync(FeatureFlags.EnablePreAuth))
            .ReturnsAsync(true);
        _mockPaymentManager
            .Setup(manager => manager.ManageGuestPaymentCard(
                It.IsAny<string>(),
                It.IsAny<PayerData>(),
                It.IsAny<List<PaymentCard>>(),
                It.IsAny<string>(),
                It.IsAny<bool>(),
                It.IsAny<SapPaymentCardAddressData?>()))
            .ThrowsAsync(new InvalidOperationException("boom"));

        var request = new GuestPaymentPreAuthorizeCardRequest
        {
            PayerData = new PayerData(),
            PaymentCard = new PaymentCard()
        };

        IActionResult result = await _controller.DoPreAuthentication(request, "en");

        Assert.IsType<ExceptionResult>(result);
    }
}
