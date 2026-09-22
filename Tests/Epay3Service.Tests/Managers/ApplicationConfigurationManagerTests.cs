using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using AutoMapper;
using Epay3Service.Clients.Interfaces;
using Epay3Service.Clients.Models;
using Epay3Service.Configuration;
using Epay3Service.Helpers;
using Epay3Service.Managers;
using Epay3Service.Models;
using Epay3Service.Models.ConfigRequest;
using Epay3Service.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Newtonsoft.Json;
using Moq;

namespace Epay3Service.Tests.Managers;

public class ApplicationConfigurationManagerTests
{
    private readonly Mock<ISapHttpClient> _sapHttpClient = new();
    private readonly Mock<IMapper> _mapper = new();
    private readonly Mock<IMaintenanceCacheService> _maintenanceCache = new();
    private readonly ApplicationSecrets _appSecrets = new()
    {
        RegistrationKey = "test-registration-key",
        EncryptionKey = "12345678901234567890123456789012",
        CvvEncryptionKey = "12345678901234567890123456789012",
        RequestsTokenKey = "test-requests-token-key"
    };

    [Fact]
    public async Task GetValues_ReturnsCachedValues_WhenRefreshIsFalse()
    {
        var values = CreateAppValues(("AllowRegistration", "true"));
        SetupGetValues(values);
        var sut = CreateSut();

        var first = await sut.GetValues();
        var second = await sut.GetValues();

        Assert.Same(first, second);
        Assert.Single(second);
        _sapHttpClient.Verify(
            client => client.Get<List<AppValue>>("CNBS_GET_APP_VALUES", null, "en", true),
            Times.Once);
    }

    [Fact]
    public async Task GetValues_RefreshesValues_WhenRefreshIsTrue()
    {
        var firstValues = CreateAppValues(("AllowRegistration", "true"));
        var refreshedValues = CreateAppValues(("AllowRegistration", "false"));
        _sapHttpClient
            .SetupSequence(client => client.Get<List<AppValue>>("CNBS_GET_APP_VALUES", null, "en", true))
            .ReturnsAsync(CreateGetResponse(firstValues))
            .ReturnsAsync(CreateGetResponse(refreshedValues));

        var sut = CreateSut();

        var first = await sut.GetValues();
        var second = await sut.GetValues(refresh: true);

        Assert.NotSame(first, second);
        Assert.Equal("false", second.Single().Value);
        _sapHttpClient.Verify(
            client => client.Get<List<AppValue>>("CNBS_GET_APP_VALUES", null, "en", true),
            Times.Exactly(2));
    }

    [Fact]
    public async Task ArePaymentsDisabled_ReturnsTrue_WhenAppValueIsTrue()
    {
        SetupGetValues(CreateAppValues(("isPaymentsDisable", "true")));
        var sut = CreateSut();

        var result = await sut.ArePaymentsDisabled();

        Assert.True(result);
    }

    [Fact]
    public async Task ArePaymentsDisabled_ReturnsFalse_WhenAppValueIsMissing()
    {
        SetupGetValues(CreateAppValues(("OtherKey", "value")));
        var sut = CreateSut();

        var result = await sut.ArePaymentsDisabled();

        Assert.False(result);
    }

    [Fact]
    public void GetLanguageFile_ReturnsFileContents_WhenLanguageFileExists()
    {
        var languageDirectory = Path.Combine(Path.GetDirectoryName(AppContext.BaseDirectory)!, "Config", "Languages");
        Directory.CreateDirectory(languageDirectory);
        var filePath = Path.Combine(languageDirectory, "zz-test.json");
        File.WriteAllText(filePath, "{\"hello\":\"world\"}");
        var sut = CreateSut();

        try
        {
            var result = sut.GetLanguageFile("zz-test");

            Assert.Equal("{\"hello\":\"world\"}", result);
        }
        finally
        {
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
            }
        }
    }

    [Fact]
    public void GetLanguageFile_ReturnsEmptyString_WhenLanguageFileDoesNotExist()
    {
        var sut = CreateSut();

        var result = sut.GetLanguageFile("missing-language-file");

        Assert.Equal(string.Empty, result);
    }

    [Fact]
    public async Task GetApplicationConfig_BindsScalarDictionaryAndScheduledPolicyValues()
    {
        SetupGetValues(CreateAppValues(
            ("AllowRegistration", "true"),
            ("RegistrationEmail", "reg@example.com"),
            ("AllowGuestPayment", "true"),
            ("DisablePaymentsGlobally", "false"),
            ("PaymentDisableMessageText_en", "Payments disabled"),
            ("PaymentDisableMessageText_fr", "Paiements desactives"),
            ("ScheduledPaymentPolicy", EncodePolicy(new ScheduledPaymentPolicy
            {
                Mode = ScheduleMode.Weekday,
                AllowedWeekdays = ["Mon", "Tue"],
                AllowedMonthDays = null
            }))));
        var sut = CreateSut();

        var result = await sut.GetApplicationConfig();

        Assert.True(result.AllowRegistration);
        Assert.Equal("reg@example.com", result.RegistrationEmail);
        Assert.True(result.AllowGuestPayment);
        Assert.NotNull(result.PaymentDisableMessageText);
        Assert.Equal("Payments disabled", result.PaymentDisableMessageText["en"]);
        Assert.Equal("Paiements desactives", result.PaymentDisableMessageText["fr"]);
        Assert.NotNull(result.ScheduledPaymentPolicy);
        Assert.Equal(ScheduleMode.Weekday, result.ScheduledPaymentPolicy.Mode);
        Assert.Equal(["Mon", "Tue"], result.ScheduledPaymentPolicy.AllowedWeekdays);
        Assert.Null(result.ScheduledPaymentPolicy.AllowedMonthDays);
    }

    [Fact]
    public async Task GetApplicationConfig_UsesSafeDefaultPolicy_WhenPolicyValueIsInvalid()
    {
        SetupGetValues(CreateAppValues(("ScheduledPaymentPolicy", "not-valid-base64-or-json")));
        var sut = CreateSut();

        var result = await sut.GetApplicationConfig();

        Assert.NotNull(result.ScheduledPaymentPolicy);
        Assert.Equal(ScheduleMode.None, result.ScheduledPaymentPolicy.Mode);
        Assert.Null(result.ScheduledPaymentPolicy.AllowedWeekdays);
        Assert.Null(result.ScheduledPaymentPolicy.AllowedMonthDays);
    }

    [Fact]
    public async Task GetPaymentConfig_BindsExpectedValues()
    {
        SetupGetValues(CreateAppValues(
            ("MaxPaymentAllowed", "150.5"),
            ("MaxECheckPaymentAllowed", "75.25"),
            ("DisablePaymentsGlobally", "true"),
            ("AddressValidationOptions", "Strict")));
        var sut = CreateSut();

        var result = await sut.GetPaymentConfig();

        Assert.Equal(150.5, result.MaximumAllowedCCAmount);
        Assert.Equal(75.25, result.MaximumAllowedECAmount);
        Assert.True(result.IsPaymentDisabled);
        Assert.Equal("Strict", result.AddressValidationOptions);
    }

    [Fact]
    public async Task GetCustomConfig_MapsAndCachesResponse()
    {
        var mapped = new SapCustomData
        {
            ApplicationId = "app-1",
            Description = "mapped"
        };
        mapped.PaymentReasonCodes.Add(new PaymentReasonCodeInfo { ReasonCode = "R1", Description = "Reason 1" });
        var sapClient = new FakeSapHttpClient
        {
            GetFactory = (type, _, _, _) =>
                type.Name == "SapCustomData"
                    ? Activator.CreateInstance(type, nonPublic: true)
                    : null
        };
        _mapper.Setup(mapper => mapper.Map<SapCustomData>(It.IsAny<object>())).Returns(mapped);

        var sut = CreateSut(sapHttpClient: sapClient);

        var first = await sut.GetCustomConfig();
        var second = await sut.GetCustomConfig();

        Assert.Same(mapped, first);
        Assert.Same(first, second);
        Assert.Equal(1, sapClient.GetInvocations.Count(call => call.pathKey == "CNBS_CUSTOM_DATA_URL"));
    }

    [Fact]
    public async Task GetCustomConfig_ReturnsNull_WhenSapThrows()
    {
        var sapClient = new FakeSapHttpClient
        {
            GetException = new InvalidOperationException("SAP unavailable")
        };
        var sut = CreateSut(sapHttpClient: sapClient);

        var result = await sut.GetCustomConfig();

        Assert.Null(result);
    }

    [Fact]
    public async Task GetThemeConfig_GroupsThemeKeysIntoThemeObjects()
    {
        SetupGetValues(CreateAppValues(
            ("theme_default.Name", "theme_default"),
            ("theme_default.BrandTitle", "Default Brand"),
            ("theme_default.Urls", "merchant/default+merchant/shared"),
            ("theme_default.LoginPage.bannerContent.en", "<p>Default banner</p>"),
            ("theme_default.LoginPage.bannerText1.en", "Welcome"),
            ("theme_acme.Name", "theme_acme"),
            ("theme_acme.BrandTitle", "Acme Brand"),
            ("theme_acme.PrimaryColor", "#112233"),
            ("theme_acme.Urls", "merchant/acme+merchant/acme-alt"),
            ("theme_acme.LoginPage.bannerContent.en", "<p>Acme banner</p>"),
            ("theme_acme.LoginPage.bannerText1.en", "Acme title"),
            ("theme_acme.LoginPage.bannerText2.en", "Acme subtitle")));
        var sut = CreateSut();

        var result = await sut.GetThemeConfig();

        Assert.Equal(2, result.Length);

        var defaultTheme = Assert.Single(result.Where(theme => theme.Name == "theme_default"));
        Assert.Equal("Default Brand", defaultTheme.BrandTitle);
        Assert.Equal(["merchant/default", "merchant/shared"], defaultTheme.Urls);
        var defaultBanner = Assert.Single(defaultTheme.Banners!);
        Assert.Equal("en", defaultBanner.Language);
        Assert.Equal("<p>Default banner</p>", defaultBanner.Content);
        Assert.Equal("Welcome", defaultBanner.Text1);

        var acmeTheme = Assert.Single(result.Where(theme => theme.Name == "theme_acme"));
        Assert.Equal("Acme Brand", acmeTheme.BrandTitle);
        Assert.Equal("#112233", acmeTheme.PrimaryColor);
        Assert.Equal(["merchant/acme", "merchant/acme-alt"], acmeTheme.Urls);
        var acmeBanner = Assert.Single(acmeTheme.Banners!);
        Assert.Equal("Acme title", acmeBanner.Text1);
        Assert.Equal("Acme subtitle", acmeBanner.Text2);
    }

    [Fact]
    public async Task GetThemeForUrl_ReturnsMatchingTheme_WhenUrlMatchesConfiguredUrl()
    {
        SetupGetValues(CreateAppValues(
            ("theme_default.Name", "theme_default"),
            ("theme_default.Urls", "merchant/default"),
            ("theme_acme.Name", "theme_acme"),
            ("theme_acme.Urls", "merchant/acme")));
        var sut = CreateSut();

        var result = await sut.GetThemeForUrl("Merchant/Acme/checkout");

        Assert.Equal("theme_acme", result.Name);
    }

    [Fact]
    public async Task GetThemeForUrl_FallsBackToThemeDefault_WhenNoUrlMatches()
    {
        SetupGetValues(CreateAppValues(
            ("theme_default.Name", "theme_default"),
            ("theme_default.Urls", "merchant/default"),
            ("theme_acme.Name", "theme_acme"),
            ("theme_acme.Urls", "merchant/acme")));
        var sut = CreateSut();

        var result = await sut.GetThemeForUrl("merchant/unknown");

        Assert.Equal("theme_default", result.Name);
    }

    [Fact]
    public async Task UpdateThemeConfig_UpdatesBannersUrlsAndProperties_AndSkipsInvalidBrandIcon()
    {
        var postedBodies = new List<SapiActionRequestBody<AppValue>>();
        var initialValues = CreateAppValues(("ExistingKey", "existing"));
        var refreshedValues = CreateAppValues(
            ("theme_acme.Name", "theme_acme"),
            ("theme_acme.BrandTitle", "Acme"),
            ("theme_acme.Urls", "merchant/acme+merchant/acme-alt"),
            ("theme_acme.BrandIcon", "data:image/x-icon;base64,AAA"),
            ("theme_acme.LoginPage.bannerContent.en", "<p>Banner</p>"),
            ("theme_acme.LoginPage.bannerText1.en", "Title"),
            ("theme_acme.LoginPage.bannerText2.en", "Subtitle"));
        _sapHttpClient
            .SetupSequence(client => client.Get<List<AppValue>>("CNBS_GET_APP_VALUES", null, "en", true))
            .ReturnsAsync(CreateGetResponse(initialValues))
            .ReturnsAsync(CreateGetResponse(refreshedValues));
        SetupPostCapture(body => postedBodies.Add(Assert.IsType<SapiActionRequestBody<AppValue>>(body)));
        var sut = CreateSut();
        var request = new[]
        {
            new ThemeConfig
            {
                Name = "theme_acme",
                BrandTitle = "Acme",
                BrandIcon = "not-a-data-url",
                Urls = ["merchant/acme", "merchant/acme-alt"],
                Banners =
                [
                    new Banner
                    {
                        Language = "en",
                        Content = "<p>Banner</p>",
                        Text1 = "Title",
                        Text2 = "Subtitle"
                    }
                ]
            }
        };

        var result = await sut.updateThemeConfig(request);

        Assert.Single(result);
        Assert.Contains(postedBodies, body => body.Data.Key == "theme_acme.LoginPage.bannerText1.en" && body.Data.Value == "Title");
        Assert.Contains(postedBodies, body => body.Data.Key == "theme_acme.LoginPage.bannerText2.en" && body.Data.Value == "Subtitle");
        Assert.Contains(postedBodies, body => body.Data.Key == "theme_acme.LoginPage.bannerContent.en" && body.Data.Value == "<p>Banner</p>");
        Assert.Contains(postedBodies, body => body.Data.Key == "theme_acme.Urls" && body.Data.Value == "merchant/acme+merchant/acme-alt");
        Assert.Contains(postedBodies, body => body.Data.Key == "theme_acme.Name" && body.Data.Value == "theme_acme");
        Assert.Contains(postedBodies, body => body.Data.Key == "theme_acme.BrandTitle" && body.Data.Value == "Acme");
        Assert.DoesNotContain(postedBodies, body => body.Data.Key == "theme_acme.BrandIcon");
    }

    [Fact]
    public async Task UpdateThemeConfig_Throws_WhenThemeNameIsMissing()
    {
        SetupGetValues(CreateAppValues(("ExistingKey", "existing")));
        var sut = CreateSut();

        var ex = await Assert.ThrowsAsync<ArgumentException>(() => sut.updateThemeConfig([new ThemeConfig { Name = null, Banners = [], Urls = [] }]));

        Assert.Equal("Theme name cannot be empty", ex.Message);
    }

    [Fact]
    public async Task DeleteThemeConfig_DeletesExpectedKeys()
    {
        var postedBodies = new List<SapiActionRequestBody<AppValue>>();
        var initialValues = CreateAppValues(
            ("theme_acme.LoginPage.bannerContent.en", "banner"),
            ("theme_acme.Urls", "merchant/acme"),
            ("theme_acme.Name", "theme_acme"),
            ("theme_acme.BrandTitle", "Acme"));
        var refreshedValues = CreateAppValues();
        _sapHttpClient
            .SetupSequence(client => client.Get<List<AppValue>>("CNBS_GET_APP_VALUES", null, "en", true))
            .ReturnsAsync(CreateGetResponse(initialValues))
            .ReturnsAsync(CreateGetResponse(refreshedValues));
        SetupPostCapture(body => postedBodies.Add(Assert.IsType<SapiActionRequestBody<AppValue>>(body)));
        var sut = CreateSut();

        await sut.deleteThemeConfig(
            [
                new ThemeConfig
                {
                    Name = "theme_acme",
                    Banners = [new Banner { Language = "en" }],
                    Urls = ["merchant/acme"],
                    BrandTitle = "Acme"
                }
            ]);

        Assert.Contains(postedBodies, body => body.Action == "delete" && body.Data.Key == "theme_acme.LoginPage.bannerContent.en");
        Assert.Contains(postedBodies, body => body.Action == "delete" && body.Data.Key == "theme_acme.Urls");
        Assert.Contains(postedBodies, body => body.Action == "delete" && body.Data.Key == "theme_acme.Name");
        Assert.Contains(postedBodies, body => body.Action == "delete" && body.Data.Key == "theme_acme.BrandTitle");
    }

    [Fact]
    public async Task DeleteThemeConfig_Throws_WhenThemeNameIsMissing()
    {
        SetupGetValues(CreateAppValues(("ExistingKey", "existing")));
        var sut = CreateSut();

        var ex = await Assert.ThrowsAsync<ArgumentException>(() => sut.deleteThemeConfig([new ThemeConfig { Name = string.Empty, Banners = [], Urls = [] }]));

        Assert.Equal("Theme name cannot be empty", ex.Message);
    }

    [Fact]
    public async Task GetPaymentReasonCodes_ReturnsReasonCodes_FromCustomConfig()
    {
        var mapped = new SapCustomData { ApplicationId = "app-1" };
        mapped.PaymentReasonCodes.Add(new PaymentReasonCodeInfo { ReasonCode = "R1", Description = "Reason 1" });
        var sapClient = new FakeSapHttpClient
        {
            GetFactory = (type, _, _, _) =>
                type.Name == "SapCustomData"
                    ? Activator.CreateInstance(type, nonPublic: true)
                    : null
        };
        _mapper.Setup(mapper => mapper.Map<SapCustomData>(It.IsAny<object>())).Returns(mapped);
        var sut = CreateSut(sapHttpClient: sapClient);

        var result = await sut.GetPaymentReasonCodes();

        var item = Assert.Single(result!);
        Assert.Equal("R1", item.ReasonCode);
    }

    [Fact]
    public async Task GetPaymentReasonCodes_ReturnsCachedReasonCodes_WhenCustomDataAlreadyLoaded()
    {
        var mapped = new SapCustomData { ApplicationId = "app-1" };
        mapped.PaymentReasonCodes.Add(new PaymentReasonCodeInfo { ReasonCode = "R1" });
        var sapClient = new FakeSapHttpClient
        {
            GetFactory = (type, _, _, _) =>
                type.Name == "SapCustomData"
                    ? Activator.CreateInstance(type, nonPublic: true)
                    : null
        };
        _mapper.Setup(mapper => mapper.Map<SapCustomData>(It.IsAny<object>())).Returns(mapped);
        var sut = CreateSut(sapHttpClient: sapClient);
        await sut.GetCustomConfig();

        var result = await sut.GetPaymentReasonCodes();

        Assert.Single(result!);
        Assert.Equal(1, sapClient.GetInvocations.Count(call => call.pathKey == "CNBS_CUSTOM_DATA_URL"));
    }

    [Fact]
    public async Task GetPaymentCards_ReturnsCards_FromCustomConfig()
    {
        var mapped = new SapCustomData { ApplicationId = "app-1" };
        mapped.PaymentCards.Add(new PaymentCardInfo { PaymentCardType = "VI", SapCardType = "VISA", GatewayCardType = "VI", Provider = "P", ExternalPaymentCardType = "V", UsesPreauthorization = false });
        var sapClient = new FakeSapHttpClient
        {
            GetFactory = (type, _, _, _) =>
                type.Name == "SapCustomData"
                    ? Activator.CreateInstance(type, nonPublic: true)
                    : null
        };
        _mapper.Setup(mapper => mapper.Map<SapCustomData>(It.IsAny<object>())).Returns(mapped);
        var sut = CreateSut(sapHttpClient: sapClient);

        var result = await sut.GetPaymentCards();

        var item = Assert.Single(result!);
        Assert.Equal("VI", item.PaymentCardType);
    }

    [Fact]
    public async Task UpdateAppValue_CallsModify_WhenKeyAlreadyExists()
    {
        object? postedBody = null;
        SetupGetValues(CreateAppValues(("ExistingKey", "old-value")));
        SetupPostCapture(body => postedBody = body);
        var sut = CreateSut();

        await sut.UpdateAppValue("ExistingKey", "new-value");

        var request = Assert.IsType<SapiActionRequestBody<AppValue>>(postedBody);
        Assert.Equal("modify", request.Action);
        Assert.Equal("ExistingKey", request.Data.Key);
        Assert.Equal("new-value", request.Data.Value);
    }

    [Fact]
    public async Task UpdateAppValue_CallsCreate_WhenKeyDoesNotExist()
    {
        object? postedBody = null;
        SetupGetValues(CreateAppValues(("DifferentKey", "old-value")));
        SetupPostCapture(body => postedBody = body);
        var sut = CreateSut();

        await sut.UpdateAppValue("NewKey", "new-value");

        var request = Assert.IsType<SapiActionRequestBody<AppValue>>(postedBody);
        Assert.Equal("create", request.Action);
        Assert.Equal("NewKey", request.Data.Key);
        Assert.Equal("new-value", request.Data.Value);
    }

    [Fact]
    public async Task DeleteAppValue_CallsDelete_WhenKeyExists()
    {
        object? postedBody = null;
        SetupGetValues(CreateAppValues(("DeleteKey", "existing")));
        SetupPostCapture(body => postedBody = body);
        var sut = CreateSut();

        await sut.DeleteAppValue("DeleteKey");

        var request = Assert.IsType<SapiActionRequestBody<AppValue>>(postedBody);
        Assert.Equal("delete", request.Action);
        Assert.Equal("DeleteKey", request.Data.Key);
        Assert.Null(request.Data.Value);
    }

    [Fact]
    public async Task DeleteAppValue_DoesNothing_WhenKeyDoesNotExist()
    {
        SetupGetValues(CreateAppValues(("OtherKey", "existing")));
        SetupPostCapture(_ => { });
        var sut = CreateSut();

        await sut.DeleteAppValue("MissingKey");

        _sapHttpClient.Verify(
            client => client.Post<SapiResponseBody<AppValue>>(
                It.IsAny<string>(),
                It.IsAny<Dictionary<string, string?>?>(),
                It.IsAny<SapiActionRequestBody<AppValue>>(),
                It.IsAny<string>(),
                It.IsAny<bool>()),
            Times.Never);
    }

    [Fact]
    public async Task UpdateApplicationConfig_SerializesScheduledPaymentPolicy_AsBase64Json()
    {
        var postedBodies = new List<SapiActionRequestBody<AppValue>>();
        _sapHttpClient
            .SetupSequence(client => client.Get<List<AppValue>>("CNBS_GET_APP_VALUES", null, "en", true))
            .ReturnsAsync(CreateGetResponse(CreateAppValues(("ExistingKey", "existing"))))
            .ReturnsAsync(CreateGetResponse(CreateAppValues(
                ("AllowRegistration", "true"),
                ("ScheduledPaymentPolicy", EncodePolicy(new ScheduledPaymentPolicy
                {
                    Mode = ScheduleMode.Monthly,
                    AllowedWeekdays = null,
                    AllowedMonthDays = [1, 15]
                })))));
        SetupPostCapture(body => postedBodies.Add(Assert.IsType<SapiActionRequestBody<AppValue>>(body)));
        var sut = CreateSut();
        var request = new ApplicationConfigRequest
        {
            AllowRegistration = true,
            ScheduledPaymentPolicy = new ScheduledPaymentPolicy
            {
                Mode = ScheduleMode.Monthly,
                AllowedWeekdays = null,
                AllowedMonthDays = [1, 15]
            }
        };

        await sut.UpdateApplicationConfig(request);

        var scheduledRequest = Assert.Single(postedBodies.Where(body => body.Data.Key == "ScheduledPaymentPolicy"));
        var json = Encoding.UTF8.GetString(Convert.FromBase64String(scheduledRequest.Data.Value!));
        using var document = JsonDocument.Parse(json);
        Assert.Equal("Monthly", document.RootElement.GetProperty("Mode").GetString());
        Assert.Equal([1, 15], document.RootElement.GetProperty("AllowedMonthDays").EnumerateArray().Select(e => e.GetInt32()).ToArray());
    }

    [Fact]
    public async Task UpdateApplicationConfig_UpdatesDictionaryAndReturnsBoundValues()
    {
        var postedBodies = new List<SapiActionRequestBody<AppValue>>();
        _sapHttpClient
            .SetupSequence(client => client.Get<List<AppValue>>("CNBS_GET_APP_VALUES", null, "en", true))
            .ReturnsAsync(CreateGetResponse(CreateAppValues(("ExistingKey", "existing"))))
            .ReturnsAsync(CreateGetResponse(CreateAppValues(
                ("AllowRegistration", "true"),
                ("PaymentDisableMessageText_en", "Disabled"),
                ("PaymentDisableMessageText_fr", "Desactive"))));
        SetupPostCapture(body => postedBodies.Add(Assert.IsType<SapiActionRequestBody<AppValue>>(body)));
        var sut = CreateSut();

        var result = await sut.UpdateApplicationConfig(new ApplicationConfigRequest
        {
            AllowRegistration = true,
            PaymentDisableMessageText = new Dictionary<string, string>
            {
                ["en"] = "Disabled",
                ["fr"] = "Desactive"
            }
        });

        Assert.True(result.AllowRegistration);
        Assert.Equal("Disabled", result.PaymentDisableMessageText!["en"]);
        Assert.Equal("Desactive", result.PaymentDisableMessageText["fr"]);
        Assert.Contains("PaymentDisableMessageText_en", postedBodies.Select(body => body.Data.Key));
        Assert.Contains("PaymentDisableMessageText_fr", postedBodies.Select(body => body.Data.Key));
    }

    [Fact]
    public async Task GetSmtpConfig_ReturnsDefault_WhenSapReadThrows()
    {
        _sapHttpClient
            .Setup(client => client.Get<List<AppValue>>("CNBS_GET_APP_VALUES", null, "en", true))
            .ThrowsAsync(new InvalidOperationException("SAP unavailable"));
        var sut = CreateSut();

        var result = await sut.GetSmtpConfig();

        Assert.NotNull(result);
        Assert.Null(result.SmtpAddress);
        Assert.False(result.SmtpUseUser);
    }

    [Fact]
    public async Task GetSmtpConfig_DecryptsPasswordAndBindsValues()
    {
        SetupGetValues(CreateAppValues(
            ("SmtpAddress", "smtp.example.com"),
            ("SmtpPort", "2525"),
            ("SmtpUseUser", "true"),
            ("SmtpUser", "mailer"),
            ("SmtpPassword", SimpleEncrypt.EncryptString("secret-password", _appSecrets.EncryptionKey))));
        var sut = CreateSut();

        var result = await sut.GetSmtpConfig();

        Assert.Equal("smtp.example.com", result.SmtpAddress);
        Assert.Equal("2525", result.SmtpPort);
        Assert.True(result.SmtpUseUser);
        Assert.Equal("mailer", result.SmtpUser);
        Assert.Equal("secret-password", result.SmtpPassword);
    }

    [Fact]
    public async Task UpdateEmailConfig_EncryptsPasswordAndReturnsBoundValues()
    {
        var postedBodies = new List<SapiActionRequestBody<AppValue>>();
        _sapHttpClient
            .SetupSequence(client => client.Get<List<AppValue>>("CNBS_GET_APP_VALUES", null, "en", true))
            .ReturnsAsync(CreateGetResponse(CreateAppValues(("ExistingKey", "existing"))))
            .ReturnsAsync(CreateGetResponse(CreateAppValues(
                ("SmtpAddress", "smtp.example.com"),
                ("SmtpUseUser", "true"),
                ("SmtpUser", "mailer"),
                ("SmtpPassword", SimpleEncrypt.EncryptString("secret-password", _appSecrets.EncryptionKey)))));
        SetupPostCapture(body => postedBodies.Add(Assert.IsType<SapiActionRequestBody<AppValue>>(body)));
        var sut = CreateSut();

        var result = await sut.UpdateEmailConfig(new EmailConfigRequest
        {
            SmtpAddress = "smtp.example.com",
            SmtpUseUser = true,
            SmtpUser = "mailer",
            SmtpPassword = "secret-password"
        });

        var passwordRequest = Assert.Single(postedBodies.Where(body => body.Data.Key == "SmtpPassword"));
        Assert.StartsWith("v2:", passwordRequest.Data.Value);
        Assert.Equal("secret-password", SimpleEncrypt.DecryptString(passwordRequest.Data.Value!, _appSecrets.EncryptionKey));
        Assert.Equal("secret-password", result.SmtpPassword);
    }

    [Fact]
    public async Task UpdateEmailTemplate_EncodesTemplatesAndReturnsTrue()
    {
        var postedBodies = new List<SapiActionRequestBody<AppValue>>();
        SetupGetValues(CreateAppValues(("ExistingKey", "existing")));
        SetupPostCapture(body => postedBodies.Add(Assert.IsType<SapiActionRequestBody<AppValue>>(body)));
        var sut = CreateSut();

        var result = await sut.UpdateEmailTemplate("welcome_email_content", new EmailConfig
        {
            Templates = new Dictionary<string, EmailTemplate>
            {
                ["en"] = new() { Language = "en", Email = "body", Title = "Welcome" },
                ["fr"] = new() { Language = "fr", Email = "corps", Title = "Bienvenue" }
            }
        });

        Assert.True(result);
        var enRequest = Assert.Single(postedBodies.Where(body => body.Data.Key == "EmailTemplate.welcome_email_content.en"));
        var decoded = SapSafe.Decode(enRequest.Data.Value!);
        var template = JsonConvert.DeserializeObject<EmailTemplate>(decoded);
        Assert.Equal("en", template!.Language);
        Assert.Equal("body", template.Email);
    }

    [Fact]
    public async Task GetEmailTemplates_DecodesStoredTemplates()
    {
        SetupGetValues(CreateAppValues(
            ("EmailTemplate.welcome_email_content.en", SapSafe.Encode(JsonConvert.SerializeObject(new EmailTemplate { Language = "en", Email = "body", Title = "Welcome" }))),
            ("EmailTemplate.welcome_email_content.fr", SapSafe.Encode(JsonConvert.SerializeObject(new EmailTemplate { Language = "fr", Email = "corps", Title = "Bienvenue" })))));
        var sut = CreateSut();

        var result = await sut.GetEmailTemplates("welcome_email_content");

        Assert.True(result.IsEnabled);
        Assert.Equal("welcome_email_content", result.Key);
        Assert.Equal(2, result.Templates.Count);
        Assert.Equal("body", result.Templates["en"].Email);
        Assert.Equal("corps", result.Templates["fr"].Email);
    }

    [Fact]
    public async Task CheckEmailTemplates_FlagsMissingAndInvalidTemplates()
    {
        var appValues = new List<AppValue>
        {
            new()
            {
                Key = "EmailTemplate.welcome_email_content.en",
                Value = SapSafe.Encode(JsonConvert.SerializeObject(new EmailTemplate
                {
                    Language = "en",
                    Email = "welcome body",
                    Title = "Welcome"
                }))
            },
            new()
            {
                Key = "EmailTemplate.confirmation_email_content.en",
                Value = SapSafe.Encode(JsonConvert.SerializeObject(new EmailTemplate
                {
                    Language = "en",
                    Email = "",
                    Title = "Invalid"
                }))
            }
        };
        SetupGetValues(appValues);
        var sut = CreateSut();

        var result = await sut.CheckEmailTemplates();

        Assert.True(result.HasMissingTemplates);
        Assert.DoesNotContain("welcome_email_content", result.MissingKeys);
        Assert.Contains("confirmation_email_content", result.MissingKeys);
        Assert.Contains("reset_password_email_content", result.MissingKeys);
    }

    [Fact]
    public async Task GetMaintenanceConfig_ReturnsDefaultWithoutCaching_WhenSapReturnsEmptyList()
    {
        SetupGetValues(CreateAppValues());
        var sut = CreateSut();

        var result = await sut.GetMaintenanceConfig();

        Assert.NotNull(result);
        Assert.False(result.IsSignInDisable);
        Assert.Null(result.MaintenanceUrl);
        _maintenanceCache.Verify(cache => cache.SetCache(It.IsAny<MaintenanceConfigRequest>()), Times.Never);
    }

    [Fact]
    public async Task GetMaintenanceConfig_BindsAndCaches_WhenValuesExist()
    {
        SetupGetValues(CreateAppValues(
            ("IsSignInDisable", "true"),
            ("FromDateLocal", "2026-08-10T12:00:00+05:30"),
            ("ToDateLocal", "2026-08-11T12:00:00+05:30"),
            ("MaintenanceUrl", "https://status.example.com"),
            ("NotificationText_en", "English message")));
        var sut = CreateSut();

        var result = await sut.GetMaintenanceConfig();

        Assert.True(result.IsSignInDisable);
        Assert.Equal("https://status.example.com", result.MaintenanceUrl);
        Assert.NotNull(result.NotificationText);
        Assert.Equal("English message", result.NotificationText["en"]);
        _maintenanceCache.Verify(
            cache => cache.SetCache(It.Is<MaintenanceConfigRequest>(config =>
                config.IsSignInDisable &&
                config.MaintenanceUrl == "https://status.example.com")),
            Times.Once);
    }

    [Fact]
    public async Task UpdateMaintenanceConfig_ReturnsRequestAndDoesNotOverwriteCache_WhenConfirmationReadIsEmpty()
    {
        var initialValues = CreateAppValues(("ExistingKey", "existing"));
        _sapHttpClient
            .SetupSequence(client => client.Get<List<AppValue>>("CNBS_GET_APP_VALUES", null, "en", true))
            .ReturnsAsync(CreateGetResponse(initialValues))
            .ReturnsAsync(CreateGetResponse(CreateAppValues()));
        SetupPostCapture(_ => { });
        var sut = CreateSut();
        var request = new MaintenanceConfigRequest
        {
            IsSignInDisable = true,
            FromDateLocal = new DateTimeOffset(2026, 8, 11, 9, 0, 0, TimeSpan.FromHours(5.5)),
            ToDateLocal = new DateTimeOffset(2026, 8, 11, 17, 0, 0, TimeSpan.FromHours(5.5)),
            MaintenanceUrl = "https://status.example.com",
            NotificationLanguage = "en",
            NotificationText = new Dictionary<string, string> { ["en"] = "Maintenance now" }
        };

        var result = await sut.UpdateMaintenanceConfig(request);

        Assert.Same(request, result);
        _maintenanceCache.Verify(cache => cache.SetCache(It.IsAny<MaintenanceConfigRequest>()), Times.Never);
    }

    [Fact]
    public async Task UpdateMaintenanceConfig_BindsRefreshResultAndUpdatesCache_WhenConfirmationReadSucceeds()
    {
        var initialValues = CreateAppValues(("ExistingKey", "existing"));
        var refreshedValues = CreateAppValues(
            ("IsSignInDisable", "true"),
            ("FromDateLocal", "2026-08-11T09:00:00+05:30"),
            ("ToDateLocal", "2026-08-11T17:00:00+05:30"),
            ("MaintenanceUrl", "https://status.example.com"),
            ("NotificationLanguage", "en"),
            ("NotificationText_en", "Maintenance now"));
        _sapHttpClient
            .SetupSequence(client => client.Get<List<AppValue>>("CNBS_GET_APP_VALUES", null, "en", true))
            .ReturnsAsync(CreateGetResponse(initialValues))
            .ReturnsAsync(CreateGetResponse(refreshedValues));
        SetupPostCapture(_ => { });
        var sut = CreateSut();
        var request = new MaintenanceConfigRequest
        {
            IsSignInDisable = true,
            FromDateLocal = new DateTimeOffset(2026, 8, 11, 9, 0, 0, TimeSpan.FromHours(5.5)),
            ToDateLocal = new DateTimeOffset(2026, 8, 11, 17, 0, 0, TimeSpan.FromHours(5.5)),
            MaintenanceUrl = "https://status.example.com",
            NotificationLanguage = "en",
            NotificationText = new Dictionary<string, string> { ["en"] = "Maintenance now" }
        };

        var result = await sut.UpdateMaintenanceConfig(request);

        Assert.True(result.IsSignInDisable);
        Assert.Equal("https://status.example.com", result.MaintenanceUrl);
        Assert.NotNull(result.NotificationText);
        Assert.Equal("Maintenance now", result.NotificationText["en"]);
        _maintenanceCache.Verify(
            cache => cache.SetCache(It.Is<MaintenanceConfigRequest>(config =>
                config.IsSignInDisable &&
                config.NotificationText != null &&
                config.NotificationText["en"] == "Maintenance now")),
            Times.Once);
    }

    [Fact]
    public async Task UpdateSystemConfig_UpdatesPropertiesAndReturnsBoundValues()
    {
        var postedBodies = new List<SapiActionRequestBody<AppValue>>();
        _sapHttpClient
            .SetupSequence(client => client.Get<List<AppValue>>("CNBS_GET_APP_VALUES", null, "en", true))
            .ReturnsAsync(CreateGetResponse(CreateAppValues(("ExistingKey", "existing"))))
            .ReturnsAsync(CreateGetResponse(CreateAppValues(
                ("ApplicationUrl", "https://app.example.com"),
                ("CompanyName", "Example Co"))));
        SetupPostCapture(body => postedBodies.Add(Assert.IsType<SapiActionRequestBody<AppValue>>(body)));
        var sut = CreateSut();

        var result = await sut.UpdateSystemConfig(new SystemConfig
        {
            ApplicationUrl = "https://app.example.com",
            CompanyName = "Example Co"
        });

        Assert.Equal("https://app.example.com", result.ApplicationUrl);
        Assert.Equal("Example Co", result.CompanyName);
        Assert.Contains(postedBodies, body => body.Data.Key == "ApplicationUrl" && body.Data.Value == "https://app.example.com");
        Assert.Contains(postedBodies, body => body.Data.Key == "CompanyName" && body.Data.Value == "Example Co");
    }

    private ApplicationConfigurationManager CreateSut(
        ISapHttpClient? sapHttpClient = null,
        IMapper? mapper = null,
        IMaintenanceCacheService? maintenanceCache = null) =>
        new(
            sapHttpClient ?? _sapHttpClient.Object,
            mapper ?? _mapper.Object,
            NullLogger<ApplicationConfigurationManager>.Instance,
            _appSecrets,
            maintenanceCache ?? _maintenanceCache.Object);

    private void SetupGetValues(List<AppValue> values)
    {
        _sapHttpClient
            .Setup(client => client.Get<List<AppValue>>("CNBS_GET_APP_VALUES", null, "en", true))
            .ReturnsAsync(CreateGetResponse(values));
    }

    private void SetupPostCapture(Action<object> capture)
    {
        _sapHttpClient
            .Setup(client => client.Post<SapiResponseBody<AppValue>>(
                "CNBS_GET_APP_VALUES_ACTION",
                null,
                It.IsAny<SapiActionRequestBody<AppValue>>(),
                It.IsAny<string>(),
                true))
            .Callback<string, Dictionary<string, string?>?, object, string, bool>((_, _, body, _, _) => capture(body))
            .ReturnsAsync(new SapHttpData<SapiResponseBody<AppValue>?>
            {
                Data = new SapiResponseBody<AppValue>
                {
                    Data = new AppValue { Key = "result", Value = "ok" },
                    Status = new SapiStatus()
                }
            });
    }

    private static SapHttpData<List<AppValue>?> CreateGetResponse(List<AppValue> values) =>
        new() { Data = values };

    private static List<AppValue> CreateAppValues(params (string Key, string? Value)[] values) =>
        values.Select(value => new AppValue
        {
            Key = value.Key,
            Value = value.Value
        }).ToList();

    private static string EncodePolicy(ScheduledPaymentPolicy policy)
    {
        var json = System.Text.Json.JsonSerializer.Serialize(
            policy,
            new JsonSerializerOptions
            {
                Converters = { new JsonStringEnumConverter() }
            });
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(json));
    }

    private sealed class FakeSapHttpClient : ISalesforceHttpClient
    {
        public Func<Type, string, string, bool, object?>? GetFactory { get; init; }
        public Exception? GetException { get; init; }
        public List<(Type type, string pathKey, string language, bool wrapped)> GetInvocations { get; } = [];

        public Task<SapHttpData<T?>> Get<T>(string pathKey, Dictionary<string, string?>? parameters, string language = "en", bool wrapped = true) where T : class
        {
            GetInvocations.Add((typeof(T), pathKey, language, wrapped));
            if (GetException != null)
            {
                throw GetException;
            }

            var data = (T?)GetFactory?.Invoke(typeof(T), pathKey, language, wrapped);
            return Task.FromResult(new SapHttpData<T?> { Data = data });
        }

        public Task<SapHttpData<T?>> Post<T>(string pathKey, Dictionary<string, string?>? parameters, dynamic body, string language = "en", bool wrapped = true) where T : class =>
            throw new NotSupportedException();

        public Task<SapHttpData<T?>> Delete<T>(string pathKey, Dictionary<string, string?>? parameters, dynamic body, string language = "en", bool wrapped = true) where T : class =>
            throw new NotSupportedException();

        public Task<byte[]?> GetPdf(string pathKey, dynamic data, string language = "en") =>
            throw new NotSupportedException();

        public Task<SapHttpData<T?>> GetData<T>(string pathKey, Dictionary<string, string?>? parameters, string language = "en") where T : class =>
            throw new NotSupportedException();

        public Task<HttpResponseMessage> GetAsync(string url, dynamic body, string action, Dictionary<string, string>? queryParams = null, string language = "en") =>
            throw new NotSupportedException();

        public Task<T?> GetAsync<T>(string endpointOrPath, Dictionary<string, string?>? queryParams = null, CancellationToken cancellationToken = default) where T : class =>
            throw new NotSupportedException();

        public Task<T?> PostAsync<T>(string endpointOrPath, object? body, Dictionary<string, string?>? queryParams = null, CancellationToken cancellationToken = default) where T : class =>
            throw new NotSupportedException();

        public Task<T?> PatchAsync<T>(string endpointOrPath, object? body, Dictionary<string, string?>? queryParams = null, CancellationToken cancellationToken = default) where T : class =>
            throw new NotSupportedException();

        public Task<bool> DeleteAsync(string endpointOrPath, Dictionary<string, string?>? queryParams = null, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<SalesforceQueryResult<T>?> QueryAsync<T>(string soqlQuery, CancellationToken cancellationToken = default) where T : class =>
            throw new NotSupportedException();

        public Task<string> GetAccessTokenAsync(bool forceRefresh = false, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();
    }
}
