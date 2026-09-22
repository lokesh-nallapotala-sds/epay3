using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Nodes;
using AutoMapper;
using Epay3Net.Controllers;
using Epay3Net.FeatureManagement;
using Epay3Net.Models.config;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;
using Epay3Service.Models.ConfigRequest;
using Epay3Service.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.FeatureManagement;
using Moq;
using Xunit;

namespace Epay3Net.Tests.Controllers;

public class ConfigControllerTests
{
    private readonly Mock<IApplicationConfigurationManager> _mockManager = new();
    private readonly Mock<IMapper> _mockMapper = new();
    private readonly Mock<IMaintenanceCacheService> _mockMaintenanceCache = new();
    private readonly Mock<IFeatureManager> _mockFeatureManager = new();
    private readonly IConfiguration _configuration;
    private readonly ConfigController _controller;

    public ConfigControllerTests()
    {
        _configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AvsKey"] = "AVS_CONFIG"
            })
            .Build();

        _controller = new ConfigController(
            _mockManager.Object,
            _mockMapper.Object,
            _configuration,
            _mockMaintenanceCache.Object,
            _mockFeatureManager.Object);

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
    }

    [Fact]
    public async Task GetApplicationConfig_Anonymous_ReturnsOnlyPublicFieldsAndLegacyFeatureFlags()
    {
        var appConfig = CreateApplicationConfiguration();
        _mockManager.Setup(manager => manager.GetApplicationConfig(true))
            .ReturnsAsync(appConfig);
        SetupFeatureFlag(FeatureFlags.ShowInvoicePdfActions, true);
        SetupFeatureFlag(FeatureFlags.ShowInvoiceDaysTillDue, false);
        SetupFeatureFlag(FeatureFlags.ShowInvoiceHistoryFilter, true);
        SetupFeatureFlag(FeatureFlags.ShowPaymentHistoryFilter, false);
        SetupFeatureFlag(FeatureFlags.EnablePreAuth, true);

        IActionResult result = await _controller.GetApplicationConfig(isRefresh: true);

        var response = GetJsonObject(result);
        AssertJsonKeys(response, PublicConfigPolicy.AnonymousApplicationConfigFields.Except(["featureFlags"]));
        Assert.True(response["allowRegistration"]!.GetValue<bool>());
        Assert.Equal("privacy", response["privacyPolicy"]!.GetValue<string>());
        Assert.True(response["allowGuestPayment"]!.GetValue<bool>());
        Assert.True(response["enablePreAuth"]!.GetValue<bool>());
        Assert.False(response.ContainsKey("registrationEmail"));
        Assert.False(response.ContainsKey("disablePaymentsGlobally"));
        Assert.False(response.ContainsKey("applicationUrl"));
        Assert.False(response.ContainsKey("companyName"));
        Assert.False(response.ContainsKey("applicationName"));
        Assert.False(response.ContainsKey("showInvoicePdfActions"));
        Assert.False(response.ContainsKey("ShowInvoiceDaysTillDue"));
        _mockManager.Verify(manager => manager.GetApplicationConfig(true), Times.Once);
    }

    [Fact]
    public async Task GetApplicationConfig_Authenticated_RemovesDeadFieldsButKeepsAdminFields()
    {
        SetAuthenticatedUser();
        var appConfig = CreateApplicationConfiguration();
        _mockManager.Setup(manager => manager.GetApplicationConfig(false))
            .ReturnsAsync(appConfig);
        SetupAllLegacyFeatureFlags(false);

        IActionResult result = await _controller.GetApplicationConfig();

        var response = GetJsonObject(result);
        Assert.Equal("admin@example.com", response["registrationEmail"]!.GetValue<string>());
        Assert.True(response["disablePaymentsGlobally"]!.GetValue<bool>());
        Assert.False(response["showInvoicePdfActions"]!.GetValue<bool>());
        Assert.False(response["ShowInvoiceDaysTillDue"]!.GetValue<bool>());
        Assert.False(response["ShowInvoiceHistoryFilter"]!.GetValue<bool>());
        Assert.False(response["ShowPaymentHistoryFilter"]!.GetValue<bool>());
        Assert.False(response["enablePreAuth"]!.GetValue<bool>());
        Assert.False(response.ContainsKey("applicationUrl"));
        Assert.False(response.ContainsKey("companyName"));
        Assert.False(response.ContainsKey("applicationName"));
    }

    [Fact]
    public async Task UpdateApplicationConfig_SanitizesStringFieldsBeforeCallingManager()
    {
        ApplicationConfigRequest? capturedRequest = null;
        var request = new ApplicationConfigReq
        {
            AllowRegistration = true,
            RegistrationEmail = "admin@example.com",
            PrivacyPolicy = "  <p>privacy</p>  ",
            TermsAndConditions = " null ",
            ContactUs = null,
            MaxPaymentAllowed = "  100.00 ",
            MaxECheckPaymentAllowed = "NULL",
            AllowCVV = true,
            AllowGuestPayment = true,
            IsAccountLinkingEnabled = true,
            PaymentIntegrationType = "hosted"
        };

        _mockManager
            .Setup(manager => manager.UpdateApplicationConfig(It.IsAny<ApplicationConfigRequest>(), It.IsAny<string>()))
            .Callback<ApplicationConfigRequest, string>((config, _) => capturedRequest = config)
            .ReturnsAsync((ApplicationConfigRequest config, string _) => config);

        IActionResult result = await _controller.UpdateApplicationConfig(request);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Same(capturedRequest, okResult.Value);
        Assert.NotNull(capturedRequest);
        Assert.Equal("<p>privacy</p>", capturedRequest!.PrivacyPolicy);
        Assert.Equal("", capturedRequest.TermsAndConditions);
        Assert.Equal("", capturedRequest.ContactUs);
        Assert.Equal("100.00", capturedRequest.MaxPaymentAllowed);
        Assert.Equal("", capturedRequest.MaxECheckPaymentAllowed);
        Assert.True(capturedRequest.AllowCVV);
        Assert.Equal("hosted", capturedRequest.PaymentIntegrationType);
    }

    [Fact]
    public async Task GetCustomConfig_Anonymous_RedactsSensitiveFieldsWithoutMutatingSourceConfig()
    {
        var customConfig = CreateCustomConfig();
        _mockManager.Setup(manager => manager.GetCustomConfig("en", true))
            .ReturnsAsync(customConfig);

        IActionResult result = await _controller.GetCustomConfig(isRefresh: true);

        var response = GetJsonObject(result);
        AssertJsonKeys(response, PublicConfigPolicy.AnonymousCustomConfigFields);
        Assert.False(response.ContainsKey("parameters"));
        Assert.False(response.ContainsKey("salesOrganizations"));
        Assert.False(response.ContainsKey("paymentReasonCodes"));

        var provider = response["paymentProviders"]!.AsArray()[0]!.AsObject();
        Assert.Equal("PM", provider["provider"]!.GetValue<string>());
        Assert.True(provider["isSecure3dsEnabled"]!.GetValue<bool>());
        Assert.False(provider.ContainsKey("providerKey"));
        Assert.False(provider.ContainsKey("initializationUrl"));
        Assert.False(provider.ContainsKey("merchantGuid"));
        Assert.False(provider.ContainsKey("providerVersion"));

        Assert.Equal("secret-provider-key", customConfig.PaymentProviders[0].ProviderKey);
        Assert.Equal("https://init.example.test", customConfig.PaymentProviders[0].InitializationUrl);
    }

    [Fact]
    public async Task GetCustomConfig_Authenticated_KeepsAuthenticatedFieldsButRedactsProviderSecrets()
    {
        SetAuthenticatedUser();
        var customConfig = CreateCustomConfig();
        _mockManager.Setup(manager => manager.GetCustomConfig("en", false))
            .ReturnsAsync(customConfig);

        IActionResult result = await _controller.GetCustomConfig(isRefresh: false);

        var response = GetJsonObject(result);
        Assert.True(response.ContainsKey("salesOrganizations"));
        Assert.True(response.ContainsKey("paymentReasonCodes"));
        Assert.True(response.ContainsKey("paymentMethods"));
        Assert.False(response.ContainsKey("parameters"));
        Assert.False(response.ContainsKey("applicationId"));

        var provider = response["paymentProviders"]!.AsArray()[0]!.AsObject();
        Assert.False(provider.ContainsKey("providerKey"));
        Assert.False(provider.ContainsKey("initializationUrl"));
    }

    [Fact]
    public async Task GetPaymentCardTypes_ReturnsCommaSeparatedNonBlankCardTypes()
    {
        var customConfig = new SapCustomData { ApplicationId = "app" };
        customConfig.PaymentCards.Add(new PaymentCardInfo { PaymentCardType = "VI" });
        customConfig.PaymentCards.Add(new PaymentCardInfo { PaymentCardType = "" });
        customConfig.PaymentCards.Add(new PaymentCardInfo { PaymentCardType = "MC" });
        _mockManager.Setup(manager => manager.GetCustomConfig("en", true))
            .ReturnsAsync(customConfig);

        IActionResult result = await _controller.GetPaymentCardTypes(isRefresh: true);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal("VI,MC", okResult.Value);
    }

    [Fact]
    public async Task GetThemeConfig_ReturnsDefaultTheme_WhenManagerReturnsEmptyArray()
    {
        _mockManager.Setup(manager => manager.GetThemeConfig(It.IsAny<string>()))
            .ReturnsAsync([]);

        IActionResult result = await _controller.GetThemeConfig();

        var okResult = Assert.IsType<OkObjectResult>(result);
        var themes = Assert.IsType<ThemeConfig[]>(okResult.Value);
        var theme = Assert.Single(themes);
        Assert.Equal("theme_default", theme.Name);
        Assert.Equal("ChronarPay", theme.ApplicationName);
    }

    [Fact]
    public async Task GetThemeForUrl_ReturnsDefaultTheme_WhenManagerReturnsNull()
    {
        _mockManager.Setup(manager => manager.GetThemeForUrl("missing.example.test"))
            .ReturnsAsync((ThemeConfig)null!);

        IActionResult result = await _controller.GetThemeForUrl("missing.example.test");

        var okResult = Assert.IsType<OkObjectResult>(result);
        var theme = Assert.IsType<ThemeConfig>(okResult.Value);
        Assert.Equal("theme_default", theme.Name);
        Assert.Equal("ChronarPay", theme.ApplicationName);
    }

    [Fact]
    public async Task GetSmtpConfig_MasksPasswordAndPreservesHasPasswordFlag()
    {
        _mockManager.Setup(manager => manager.GetSmtpConfig(It.IsAny<string>()))
            .ReturnsAsync(new EmailConfigRequest
            {
                SmtpAddress = "smtp.example.test",
                SmtpPort = "587",
                SmtpUseUser = true,
                SmtpUser = "smtp-user",
                SmtpPassword = "secret-password",
                RegistrationRequestEmail = "registration@example.test",
                OverrideEmail = "override@example.test",
                SecurityEmail = "security@example.test",
                FromAddress = "from@example.test",
                FromAddressName = "Sender",
                RegistrationRequestEmailContent = "registration",
                WelcomeEmailContent = "welcome",
                ResetPasswordEmailContent = "reset",
                EmailConfirmationContent = "confirmation",
                applicationUrl = "https://app.example.test",
                companyName = "Example Co"
            });

        IActionResult result = await _controller.GetSmtpConfig();

        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<EmailConfigRequest>(okResult.Value);
        Assert.True(response.HasPassword);
        Assert.Null(response.SmtpPassword);
        Assert.Equal("smtp.example.test", response.SmtpAddress);
        Assert.Equal("smtp-user", response.SmtpUser);
    }

    [Theory]
    [InlineData(false, "")]
    [InlineData(true, "Some email templates are blank. Please check the Email tab of Configuration.")]
    public async Task CheckAllEmailTemplates_ReturnsHealthMessage(bool hasMissingTemplates, string expectedMessage)
    {
        _mockManager.Setup(manager => manager.CheckEmailTemplates("fr"))
            .ReturnsAsync(new EmailTemplateHealthCheck { HasMissingTemplates = hasMissingTemplates });

        IActionResult result = await _controller.CheckAllEmailTemplates("fr");

        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = ToJsonObject(okResult.Value!);
        Assert.Equal(hasMissingTemplates, response["hasMissingTemplates"]!.GetValue<bool>());
        Assert.Equal(expectedMessage, response["message"]!.GetValue<string>());
    }

    [Fact]
    public async Task GetAvsConfigParameter_ReturnsOnlyConfiguredAvsKeyAndRedactsCredentials()
    {
        var customConfig = new SapCustomData { ApplicationId = "app" };
        customConfig.Parameters.Add(new ParameterInfo
        {
            Name = "AVS_CONFIG",
            Value = """{"username":"user","password":"secret","endpoint":"https://avs.example.test"}"""
        });
        customConfig.Parameters.Add(new ParameterInfo
        {
            Name = "OTHER_CONFIG",
            Value = """{"password":"should-not-return"}"""
        });
        _mockManager.Setup(manager => manager.GetCustomConfig("en", true))
            .ReturnsAsync(customConfig);

        IActionResult result = await _controller.GetAvsConfigParameter();

        var okResult = Assert.IsType<OkObjectResult>(result);
        var parameters = Assert.IsType<List<ParameterInfo>>(okResult.Value);
        var parameter = Assert.Single(parameters);
        Assert.Equal("AVS_CONFIG", parameter.Name);
        Assert.DoesNotContain("username", parameter.Value);
        Assert.DoesNotContain("password", parameter.Value);
        Assert.Contains("endpoint", parameter.Value);
    }

    [Fact]
    public void CheckFileExists_ReturnsBadRequest_WhenPathEscapesCurrentDirectory()
    {
        var originalDirectory = Directory.GetCurrentDirectory();
        var tempDirectory = Path.Combine(Path.GetTempPath(), $"epay3-config-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDirectory);

        try
        {
            Directory.SetCurrentDirectory(tempDirectory);

            IActionResult result = _controller.CheckFileExists("../outside.txt");

            Assert.IsType<BadRequestObjectResult>(result);
        }
        finally
        {
            Directory.SetCurrentDirectory(originalDirectory);
            Directory.Delete(tempDirectory, recursive: true);
        }
    }

    private static ApplicationConfiguration CreateApplicationConfiguration() =>
        new()
        {
            AllowRegistration = true,
            PrivacyPolicy = "privacy",
            TermsAndConditions = "terms",
            ContactUs = "contact",
            IsPaymentDisabled = true,
            RegistrationEmail = "admin@example.com",
            RegistrationEmailExpiration = "7",
            ExpirationMessage = "expired",
            DisablePaymentsGlobally = true,
            AddressValidationOptions = "full",
            AllowGuestPayment = true,
            IsAccountLinkingEnabled = true,
            MessageLanguage = "en",
            PaymentDisableMessageText = new Dictionary<string, string> { ["en"] = "disabled" },
            MaxPaymentAllowed = "100",
            ApplicationUrl = "https://app.example.test",
            CompanyName = "Example Co",
            MaxECheckPaymentAllowed = "200",
            isPaymentsDisable = "true",
            notificationLanguage = "en",
            notificationText = "maintenance",
            maintenanceUrl = "https://maintenance.example.test",
            selectedlanguage = "en",
            fromDateLocal = "2026-01-01",
            toDateLocal = "2026-01-02",
            IsSignInDisable = true,
            ApplicationName = "Internal App",
            IsAutoPayEnabled = true,
            IsSchedulePaymentsEnabled = true,
            ScheduledPaymentPolicy = new ScheduledPaymentPolicy(),
            AllowCVV = true,
            PaymentIntegrationType = "iframe"
        };

    private static SapCustomData CreateCustomConfig()
    {
        var customConfig = new SapCustomData
        {
            ApplicationId = "secret-app-id",
            Description = "internal description",
            ReleaseInfo = new ReleaseInfo { ReleaseVersion = "1", ServicePackVersion = "2", PublishDate = "20260101" },
            SapCustomer = new SAPCustomer()
        };
        customConfig.CompanyCodes.Add(new CompanyInfo { CompanyCode = "1000", CurrencyKey = "USD", IsActive = true });
        customConfig.SalesOrganizations.Add(new SalesOrganizationInfo { SalesOrganizationCode = "SO", DivisionCode = "D1", DistributionChannelCode = "DC", IsActive = true });
        customConfig.PaymentProviders.Add(new PaymentProviderInfo
        {
            Provider = "PM",
            Description = "Paymetric",
            ProviderKey = "secret-provider-key",
            InitializationUrl = "https://init.example.test",
            MerchantGuid = "merchant-guid",
            ProviderVersion = "v1",
            IsSecure3dsEnabled = true,
            Secure3dsVersion = "2.0"
        });
        customConfig.PaymentCards.Add(new PaymentCardInfo { PaymentCardType = "VI", SapCardType = "VISA", GatewayCardType = "VI", Provider = "PM", ExternalPaymentCardType = "VI" });
        customConfig.PaymentTypes!.Add(new PaymentTypeInfo { PaymentTypeCode = "D", Description = "Direct", IsActive = true });
        customConfig.PaymentReasonCodes.Add(new PaymentReasonCodeInfo { ReasonCode = "A1", Description = "Adjustment" });
        customConfig.PaymentMethods.Add(new PaymentMethodInfo { PaymentMethod = "CC", PaymentTypeCode = "D", IsActive = true });
        customConfig.DocumentTypes.Add(new DocumentTypeInfo { DocumentTypeId = "INV", StatusId = "OPEN" });
        customConfig.DocumentStatuses.Add(new DocumentStatusInfo { StatusId = "OPEN", Status = "Open" });
        customConfig.FunctionModules.Add(new FunctionModuleInfo { ModuleName = "Z_SECRET" });
        customConfig.Parameters.Add(new ParameterInfo { Name = "SECRET", Value = "secret-value" });
        customConfig.LogEvents.Add(new LogEventInfo { EventId = "LOG", Description = "internal log" });
        return customConfig;
    }

    private void SetAuthenticatedUser()
    {
        _controller.ControllerContext.HttpContext.User = new ClaimsPrincipal(
            new ClaimsIdentity(
                [new Claim("UserId", "user-1")],
                "mock"));
    }

    private void SetupFeatureFlag(string flagName, bool isEnabled)
    {
        _mockFeatureManager.Setup(manager => manager.IsEnabledAsync(flagName))
            .ReturnsAsync(isEnabled);
    }

    private void SetupAllLegacyFeatureFlags(bool isEnabled)
    {
        SetupFeatureFlag(FeatureFlags.ShowInvoicePdfActions, isEnabled);
        SetupFeatureFlag(FeatureFlags.ShowInvoiceDaysTillDue, isEnabled);
        SetupFeatureFlag(FeatureFlags.ShowInvoiceHistoryFilter, isEnabled);
        SetupFeatureFlag(FeatureFlags.ShowPaymentHistoryFilter, isEnabled);
        SetupFeatureFlag(FeatureFlags.EnablePreAuth, isEnabled);
    }

    private static JsonObject GetJsonObject(IActionResult result)
    {
        var okResult = Assert.IsType<OkObjectResult>(result);
        return Assert.IsType<JsonObject>(okResult.Value);
    }

    private static JsonObject ToJsonObject(object value) =>
        JsonSerializer.SerializeToNode(value, new JsonSerializerOptions(JsonSerializerDefaults.Web))!.AsObject();

    private static void AssertJsonKeys(JsonObject response, IEnumerable<string> expectedKeys)
    {
        Assert.Equal(
            expectedKeys.OrderBy(key => key, StringComparer.OrdinalIgnoreCase),
            response.Select(kvp => kvp.Key).OrderBy(key => key, StringComparer.OrdinalIgnoreCase),
            StringComparer.OrdinalIgnoreCase);
    }
}
