using System.Net;
using System.Text;
using Epay3Service.Clients.Interfaces;
using Epay3Service.Clients.Models;
using Epay3Service.Configuration;
using Epay3Service.Helpers;
using Epay3Service.Managers;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;
using Moq;
using Xunit;
using ManagePaymentStatus = WebAR.Service.Services.API.Models.Status;
using PaymentCardsResponse = WebAR.Service.Services.API.Models.PaymentCardsResponse;
using PaymentCardPreAuthResponse = WebAR.Service.Services.API.Models.PaymentCardPreAuthResponse;

namespace Epay3Service.Tests.Managers;

public class PaymentManagerTests
{
    private const string EncryptionKey = "encryption-key-that-is-long-enough";

    private readonly Mock<IMailer> _mockMailer = new();
    private readonly Mock<ISapHttpClient> _mockSapClient = new();
    private readonly Mock<ILanguageManager> _mockLanguageManager = new();
    private readonly Mock<IAccountManager> _mockAccountManager = new();
    private readonly Mock<IApplicationConfigurationManager> _mockApplicationConfigurationManager = new();
    private readonly PaymentManager _paymentManager;

    public PaymentManagerTests()
    {
        _mockLanguageManager
            .Setup(manager => manager.GetMessage(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns((string _, string _, string fallback) => fallback);

        _paymentManager = new PaymentManager(
            _mockMailer.Object,
            _mockSapClient.Object,
            new ApplicationSecrets { EncryptionKey = EncryptionKey },
            _mockLanguageManager.Object,
            _mockAccountManager.Object,
            _mockApplicationConfigurationManager.Object);
    }

    [Fact]
    public async Task ManagePaymentCard_NormalizesCardTypeDecryptsTokenAndMapsSapStatus()
    {
        var user = CreateUser();
        var payer = new PayerData { CustomerNumber = "payer-1", CompanyCode = "1000" };
        var addressData = new SapPaymentCardAddressData { Name = "Jane Buyer", Country = "US" };
        var encryptedToken = Encryption.Encrypt("plain-token", EncryptionKey);
        var paymentCards = new List<PaymentCard>
        {
            new() { PaymentCardType = "VI", PaymentCardToken = encryptedToken }
        };
        SetupCustomData();

        PaymentCardsRequest? capturedRequest = null;
        _mockSapClient
            .Setup(client => client.Post<PaymentCardsResponse>(
                "CNBS_MANAGE_PAYMENT",
                null,
                It.IsAny<object>(),
                "en",
                false))
            .Callback<string, Dictionary<string, string?>?, object, string, bool>(
                (_, _, body, _, _) => capturedRequest = Assert.IsType<PaymentCardsRequest>(body))
            .ReturnsAsync(new SapHttpData<PaymentCardsResponse?>
            {
                Status = new SapHttpStatus
                {
                    MessageType = "S",
                    Identifiaction = "ID",
                    Number = 7,
                    Line = "Saved"
                }
            });

        PaymentCardsResponse? result = await _paymentManager.ManagePaymentCard(
            user,
            "01",
            payer,
            paymentCards,
            "en",
            returnStatusOnSapError: false,
            addressData);

        Assert.NotNull(result);
        Assert.Equal("S", result!.Status!.message_type);
        Assert.Equal("ID", result.Status.message_identification);
        Assert.Equal(7, result.Status.message_number);
        Assert.Equal("Saved", result.Status.message_line_string);
        Assert.NotNull(capturedRequest);
        Assert.Same(payer, capturedRequest!.PayerData);
        Assert.Same(addressData, capturedRequest.AddressData);
        Assert.Equal("01", capturedRequest.Action);
        Assert.Equal("ADD_PAYMENT_CARD", capturedRequest.Log!.id);
        Assert.Equal(user.Email, capturedRequest.Log.login);
        var capturedCard = Assert.Single(capturedRequest.PaymentCards);
        Assert.Equal("VISA", capturedCard.PaymentCardType);
        Assert.Equal("plain-token", capturedCard.PaymentCardToken);
    }

    [Fact]
    public async Task ManagePaymentCard_ThrowsOnSapError_WhenReturnStatusOnSapErrorFalse()
    {
        SetupCustomData();
        _mockSapClient
            .Setup(client => client.Post<PaymentCardsResponse>(
                "CNBS_MANAGE_PAYMENT",
                null,
                It.IsAny<object>(),
                "en",
                false))
            .ReturnsAsync(new SapHttpData<PaymentCardsResponse?>
            {
                Status = new SapHttpStatus { MessageType = "E", Line = "SAP failed" }
            });

        Exception exception = await Assert.ThrowsAsync<Exception>(() =>
            _paymentManager.ManagePaymentCard(
                CreateUser(),
                "02",
                new PayerData(),
                [new PaymentCard { PaymentCardType = "VI" }],
                "en"));

        Assert.Contains("SAP failed", exception.Message);
    }

    [Fact]
    public async Task ManageGuestPaymentCard_UsesGuestLogAndReturnsErrorStatus_WhenRequested()
    {
        var response = new PaymentCardsResponse
        {
            PreAuth = new PaymentCardPreAuthResponse { Action = "04", Rccvv = "M" }
        };
        PaymentCardsRequest? capturedRequest = null;
        SetupCustomData();
        _mockSapClient
            .Setup(client => client.Post<PaymentCardsResponse>(
                "CNBS_MANAGE_PAYMENT",
                null,
                It.IsAny<object>(),
                "fr",
                false))
            .Callback<string, Dictionary<string, string?>?, object, string, bool>(
                (_, _, body, _, _) => capturedRequest = Assert.IsType<PaymentCardsRequest>(body))
            .ReturnsAsync(new SapHttpData<PaymentCardsResponse?>
            {
                Data = response,
                Status = new SapHttpStatus { MessageType = "E", Line = "CVV mismatch" }
            });

        PaymentCardsResponse? result = await _paymentManager.ManageGuestPaymentCard(
            "04",
            new PayerData { CustomerNumber = "guest-payer" },
            [new PaymentCard { PaymentCardType = "MAST" }],
            "fr",
            returnStatusOnSapError: true);

        Assert.NotNull(result);
        Assert.Same(response.PreAuth, result!.PreAuth);
        Assert.Equal("PRE-AUTHORIZATION", capturedRequest!.Log!.id);
        Assert.Equal("Guest User", capturedRequest.Log.login);
        Assert.Equal("MC", Assert.Single(capturedRequest.PaymentCards).PaymentCardType);
        Assert.Equal("E", result.Status!.message_type);
        Assert.Equal("CVV mismatch", result.Status.message_line_string);
    }

    [Fact]
    public async Task GetPayerDetails_UsesResolvedPayerContextAndSetsAutoPayEnrollment()
    {
        var user = CreatePayerUserWithAccount();
        Dictionary<string, string?>? capturedQuery = null;
        SetupPayerAccountResolution(user);
        _mockSapClient
            .Setup(client => client.Get<PayerDetail>(
                "CNBS_PAYER_PATH",
                It.IsAny<Dictionary<string, string?>>(),
                "en",
                true))
            .Callback<string, Dictionary<string, string?>?, string, bool>(
                (_, query, _, _) => capturedQuery = query)
            .ReturnsAsync(new SapHttpData<PayerDetail?>
            {
                Data = new PayerDetail
                {
                    PayerAutoPayStatus =
                    [
                        new AutoPayStatus { Enrolled = false },
                        new AutoPayStatus { Enrolled = true }
                    ]
                }
            });

        PayerDetail? result = await _paymentManager.GetPayerDetails(user, "sold-to-1", "payer-1", "en");

        Assert.NotNull(result);
        Assert.True(result!.IsAutoPayEnrolled);
        Assert.Equal("payer-1", capturedQuery!["customer_number"]);
        Assert.Equal("1000", capturedQuery["company_code"]);
        Assert.Equal("SO", capturedQuery["sales_organization"]);
        Assert.Equal("DC", capturedQuery["distribution_channel"]);
        Assert.Equal("DV", capturedQuery["division"]);
        Assert.Equal("user-1|Payer|payer-1|1000|SO|DC|DV", capturedQuery["cache_id"]);
    }

    [Fact]
    public async Task GetAccessToken_WithSessionECheckPaymentMethodBuildsTokenizedQuery()
    {
        var user = CreatePayerUserWithAccount();
        var token = new PaymentAccessToken { AccessToken = "access-token" };
        Dictionary<string, string?>? capturedQuery = null;

        SetupPayerAccountResolution(user);
        SetupPayerDetailsResponse(CreatePayerDetail());
        _mockSapClient
            .Setup(client => client.Get<PaymentAccessToken>(
                "CNBS_ACCESS_TOKEN",
                It.IsAny<Dictionary<string, string?>>(),
                "en",
                false))
            .Callback<string, Dictionary<string, string?>?, string, bool>(
                (_, query, _, _) => capturedQuery = query)
            .ReturnsAsync(new SapHttpData<PaymentAccessToken?> { Data = token });

        PaymentAccessToken? result = await _paymentManager.GetAccessToken(
            user,
            "sold-to-1",
            "payer-1",
            CreateCustomData(),
            cardKey: "",
            amount: 12.50m,
            currency: "USD",
            redirectURI: "https://return.example.test",
            language: "en",
            paymentMethod: new PaymentMethod
            {
                Name = "session echeck",
                CardType = "EC",
                Token = "session-token",
                ValidTo = ""
            },
            companyCode: "1000");

        Assert.Same(token, result);
        Assert.Equal("1250.00", capturedQuery!["amount"]);
        Assert.Equal("session-token", capturedQuery["payment_card_token"]);
        Assert.Equal("12", capturedQuery["expiration_month"]);
        Assert.Equal("9999", capturedQuery["expiration_year"]);
        Assert.Equal("TO", capturedQuery["payment_method"]);
        Assert.Equal("2.2", capturedQuery["threeds_version"]);
        Assert.Equal("https://return.example.test", capturedQuery["redirect_uri"]);
        Assert.False(capturedQuery.ContainsKey("fn_ccnum"));
    }

    [Fact]
    public async Task ScheduledPayment_FormatsValidDateAndPostsAsScheduled()
    {
        var user = CreatePayerUserWithAccount();
        SapPaymentRequest? capturedRequest = null;
        SetupPayerAccountResolution(user);
        SetupCustomData();
        SetupPayerDetailsResponse(CreatePayerDetail("card-token"));
        _mockSapClient
            .Setup(client => client.Post<SapHttpStatus>(
                "CNBS_PAYMENT_PATH",
                null,
                It.IsAny<object>(),
                "en",
                true))
            .Callback<string, Dictionary<string, string?>?, object, string, bool>(
                (_, _, body, _, _) => capturedRequest = Assert.IsType<SapPaymentRequest>(body))
            .ReturnsAsync(new SapHttpData<SapHttpStatus?> { Status = new SapHttpStatus { MessageType = "S" } });

        SapHttpStatus? result = await _paymentManager.ScheduledPayment(
            user,
            "sold-to-1",
            "payer-1",
            "1000",
            [new PaymentInvoice { PaymentAmount = 10, CurrencyKey = "USD" }],
            "123",
            null,
            "unit-test-agent",
            "US",
            "en",
            new PaymentMethod { Name = "Saved", CardType = "VI", Token = "card-token", ValidTo = "12-31-2099" },
            "2026-09-15");

        Assert.Equal("S", result!.MessageType);
        Assert.Equal("09-15-2026", capturedRequest!.ScheduledDate);
        Assert.Equal("VISA", capturedRequest.PaymentDetail!.PaymentCardType);
        Assert.Equal("CC", capturedRequest.PaymentDetail.PaymentMethod);
        Assert.Equal("123", capturedRequest.PaymentDetail.CardValidationCode);
        Assert.Equal("POST_INVOICE", capturedRequest.Log!.id);
        Assert.Equal("unit-test-agent", capturedRequest.Log.usrag);
    }

    [Fact]
    public async Task ScheduledPayment_ThrowsLocalizedError_WhenScheduledDateInvalid()
    {
        var user = CreatePayerUserWithAccount();
        SetupPayerAccountResolution(user);
        SetupCustomData();
        SetupPayerDetailsResponse(CreatePayerDetail());

        Exception exception = await Assert.ThrowsAsync<Exception>(() =>
            _paymentManager.ScheduledPayment(
                user,
                "sold-to-1",
                "payer-1",
                "1000",
                [new PaymentInvoice { PaymentAmount = 10, CurrencyKey = "USD" }],
                null,
                null,
                "agent",
                "US",
                "en",
                new PaymentMethod { Name = "Saved", CardType = "VI", Token = "card-token", ValidTo = "12-31-2099" },
                "not-a-date"));

        Assert.Equal("Invalid scheduled date", exception.Message);
        _mockSapClient.Verify(client => client.Post<SapHttpStatus>(
            It.IsAny<string>(),
            It.IsAny<Dictionary<string, string?>?>(),
            It.IsAny<object>(),
            It.IsAny<string>(),
            It.IsAny<bool>()), Times.Never);
    }

    [Fact]
    public async Task MakePayment_ReturnsPolicyErrorWithoutPostingPayment_WhenPaymentsGloballyDisabled()
    {
        var user = CreatePayerUserWithAccount();
        SetupPayerAccountResolution(user);
        SetupPayerDetailsResponse(CreatePayerDetail());
        SetupCustomData(disablePaymentsGlobally: true);

        PaymentReceipt? result = await _paymentManager.MakePayment(
            user,
            "sold-to-1",
            "payer-1",
            "1000",
            [new PaymentInvoice { PaymentAmount = 10, CurrencyKey = "USD" }],
            null,
            null,
            "agent",
            "US",
            "en",
            new PaymentMethod { Name = "Saved", CardType = "VI", Token = "card-token", ValidTo = "12-31-2099" });

        Assert.NotNull(result);
        Assert.Equal("E", result!.Error!.MessageType);
        Assert.Equal("Payments are currently disabled.", result.Error.Line);
        _mockSapClient.Verify(client => client.Post<PaymentReceipt>(
            "CNBS_PAYMENT_PATH",
            null,
            It.IsAny<object>(),
            It.IsAny<string>(),
            It.IsAny<bool>()), Times.Never);
    }

    [Fact]
    public async Task MakeGuestPayment_DecryptsEncryptedTokenAndReturnsEmailWarning_WhenReceiptEmailFails()
    {
        var encryptedToken = Encryption.Encrypt("plain-token", EncryptionKey);
        SapPaymentRequest? capturedRequest = null;
        SetupCustomData();
        _mockSapClient
            .Setup(client => client.Post<PaymentReceipt>(
                "CNBS_PAYMENT_PATH",
                null,
                It.IsAny<object>(),
                "en",
                false))
            .Callback<string, Dictionary<string, string?>?, object, string, bool>(
                (_, _, body, _, _) => capturedRequest = Assert.IsType<SapPaymentRequest>(body))
            .ReturnsAsync(new SapHttpData<PaymentReceipt?>
            {
                Status = new SapHttpStatus { MessageType = "S" },
                Data = new PaymentReceipt { Documents = [new PaymentDocument { DocumentNumberFinance = "9001" }] }
            });
        _mockMailer
            .Setup(mailer => mailer.SendReceipt("en", "US", It.IsAny<User>(), It.IsAny<SapPaymentRequest>()))
            .ThrowsAsync(new Exception("SMTP failed"));

        PaymentReceipt? result = await _paymentManager.MakeGuestPayment(
            new PayerData { CustomerNumber = "payer-1", CompanyCode = "1000" },
            new SoldToPayment { AccountNumber = "sold-to-1" },
            [new PaymentInvoice { PaymentAmount = 10, CurrencyKey = "USD" }],
            new PaymentDetail
            {
                PaymentMethod = "CC",
                PaymentCardType = "VI",
                PaymentCardToken = encryptedToken,
                PaymentCardName = "Guest Card",
                ValidTo = "12-31-2099"
            },
            "US",
            guestUserEmail: "guest@example.test",
            language: "en");

        Assert.NotNull(result);
        Assert.Equal("9001", Assert.Single(result!.Documents!).DocumentNumberFinance);
        Assert.Equal("warning.email.sending", result.EmailError!.Code);
        Assert.Equal("plain-token", capturedRequest!.PaymentDetail!.PaymentCardToken);
        Assert.Equal("VISA", capturedRequest.PaymentDetail.PaymentCardType);
        Assert.Equal("Guest User", capturedRequest.Custom!.HeaderText);
    }

    [Fact]
    public async Task ManageAutoPay_PostsEnrollmentRequest()
    {
        object? capturedRequest = null;
        var response = new AutoPayEnrollmentResponse();
        var user = CreateUser();
        var payer = new PayerData { CustomerNumber = "payer-1", CompanyCode = "1000" };
        _mockSapClient
            .Setup(client => client.Post<AutoPayEnrollmentResponse>(
                "CNBS_PAYER_AUTO_PAY_PATH",
                null,
                It.IsAny<object>(),
                "en",
                false))
            .Callback<string, Dictionary<string, string?>?, object, string, bool>(
                (_, _, body, _, _) => capturedRequest = body)
            .ReturnsAsync(new SapHttpData<AutoPayEnrollmentResponse?> { Data = response });

        AutoPayEnrollmentResponse? result = await _paymentManager.ManageAutoPay(
            user,
            payer,
            true,
            "CC",
            "card-token",
            "en");

        Assert.Same(response, result);
        Assert.NotNull(capturedRequest);
        Assert.Same(payer, GetPropertyValue<PayerData>(capturedRequest!, "PayerData"));
        Assert.True(GetPropertyValue<bool>(capturedRequest!, "Enrolled"));
        Assert.Equal("CC", GetPropertyValue<string>(capturedRequest!, "PaymentMethod"));
        Assert.Equal("card-token", GetPropertyValue<string>(capturedRequest!, "PaymentCardToken"));
        var log = GetPropertyValue<TraceLog>(capturedRequest!, "Log");
        Assert.Equal("POST_AUTO_PAY_ENROLLMENT", log!.id);
        Assert.Equal(user.Email, log.login);
    }

    [Fact]
    public async Task ManageAutoPay_ThrowsSerializedStatus_WhenSapReturnsStatusWithoutData()
    {
        _mockSapClient
            .Setup(client => client.Post<AutoPayEnrollmentResponse>(
                "CNBS_PAYER_AUTO_PAY_PATH",
                null,
                It.IsAny<object>(),
                "en",
                false))
            .ReturnsAsync(new SapHttpData<AutoPayEnrollmentResponse?>
            {
                Status = new SapHttpStatus { MessageType = "E", Line = "AutoPay failed" }
            });

        Exception exception = await Assert.ThrowsAsync<Exception>(() =>
            _paymentManager.ManageAutoPay(
                CreateUser(),
                new PayerData(),
                false,
                "EC",
                "",
                "en"));

        Assert.Contains("AutoPay failed", exception.Message);
    }

    [Fact]
    public async Task GetTokenResponse_ForwardsAccessTokenQueryAndDeserializesResponse()
    {
        Dictionary<string, string>? capturedQuery = null;
        _mockSapClient
            .Setup(client => client.GetAsync(
                "CNBS_ACCESS_TOKEN_RESPONSE",
                "",
                "GetAccessTokenResponse",
                It.IsAny<Dictionary<string, string>>(),
                It.IsAny<string>()))
            .Callback<string, object, string, Dictionary<string, string>, string>(
                (_, _, _, query, _) => capturedQuery = query)
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    """{"paymentcard":{"payment_card_type":"VI","payment_card_name":"Visa","payment_card_token":"tok","valid_from":"01-01-2026","valid_to":"12-31-2029"},"status":{"message_type":"S","message_identification":"ID","message_number":1,"message_line_string":"OK"}}""",
                    Encoding.UTF8,
                    "application/json")
            });

        TokenizationResponse result = await _paymentManager.GetTokenResponse(
            new TokenizationRequest { Action = "02", AccessToken = "access-token" },
            "en");

        Assert.Equal("02", capturedQuery!["action"]);
        Assert.Equal("access-token", capturedQuery["access_token"]);
        Assert.Equal("VI", result.PaymentCard.Type);
        Assert.Equal("S", result.Status.MessageType);
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

    private static User CreatePayerUserWithAccount()
    {
        var user = CreateUser(AccountType.Payer);
        user.Accounts =
        [
            new Account
            {
                PrimaryAcct = "payer-1",
                CompanyCode = "1000",
                SalesOrganization = "SO",
                DistributionChannel = "DC",
                Division = "DV",
                AccountTypeId = AccountType.Payer
            }
        ];
        return user;
    }

    private static SapCustomData CreateCustomData()
    {
        var customData = new SapCustomData { ApplicationId = "app" };
        customData.CompanyCodes.Add(new CompanyInfo
        {
            CompanyCode = "1000",
            CurrencyKey = "USD",
            IsActive = true,
            IsDepositEnabled = true,
            IsEcheckEnabled = true
        });
        customData.PaymentCards.Add(new PaymentCardInfo
        {
            PaymentCardType = "VI",
            SapCardType = "VISA",
            GatewayCardType = "VI",
            Provider = "PM",
            ExternalPaymentCardType = "VISA"
        });
        customData.PaymentCards.Add(new PaymentCardInfo
        {
            PaymentCardType = "MAST",
            SapCardType = "MC",
            GatewayCardType = "MC",
            Provider = "PM",
            ExternalPaymentCardType = "MASTERCARD"
        });
        customData.PaymentCards.Add(new PaymentCardInfo
        {
            PaymentCardType = "EC",
            SapCardType = "EC",
            GatewayCardType = "EC",
            Provider = "PM",
            ExternalPaymentCardType = "EC"
        });
        customData.PaymentProviders.Add(new PaymentProviderInfo
        {
            Provider = "PM",
            Description = "Worldpay",
            Secure3dsVersion = " 2.2 "
        });
        return customData;
    }

    private static PayerDetail CreatePayerDetail(string cardToken = "card-token") =>
        new()
        {
            AddressData = new CompanyAddress
            {
                Street = "1 Main St",
                City = "Lexington",
                Country = "US",
                PostalCodeCity = "40507",
                Region = "KY"
            },
            Communications = new Communications
            {
                Phones = [new Phone { Telephone = "8595550100", Standard = "X" }]
            },
            PaymentCards =
            [
                new PaymentCard
                {
                    PaymentCardType = "VI",
                    PaymentCardToken = cardToken,
                    PaymentCardName = "Saved Visa",
                    ValidTo = "12-31-2099"
                }
            ]
        };

    private void SetupCustomData(bool disablePaymentsGlobally = false)
    {
        _mockApplicationConfigurationManager
            .Setup(manager => manager.GetApplicationConfig(It.IsAny<bool>()))
            .ReturnsAsync(new ApplicationConfiguration { DisablePaymentsGlobally = disablePaymentsGlobally });
        _mockApplicationConfigurationManager
            .Setup(manager => manager.GetCustomConfig(It.IsAny<string>(), It.IsAny<bool>()))
            .ReturnsAsync(CreateCustomData());
    }

    private void SetupPayerAccountResolution(User user)
    {
        _mockAccountManager
            .Setup(manager => manager.FindLinkedAccount(user.Accounts, "payer-1", It.IsAny<string?>()))
            .Returns(user.Accounts!.Single());
    }

    private void SetupPayerDetailsResponse(PayerDetail payerDetail)
    {
        _mockSapClient
            .Setup(client => client.Get<PayerDetail>(
                "CNBS_PAYER_PATH",
                It.IsAny<Dictionary<string, string?>>(),
                It.IsAny<string>(),
                true))
            .ReturnsAsync(new SapHttpData<PayerDetail?> { Data = payerDetail });
    }

    private static T? GetPropertyValue<T>(object source, string propertyName) =>
        (T?)source.GetType().GetProperty(propertyName)!.GetValue(source);
}
