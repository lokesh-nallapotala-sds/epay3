using System.Text;
using AutoMapper;
using Epay3Service.Clients.Interfaces;
using Epay3Service.Clients.Models;
using Epay3Service.Configuration;
using Epay3Service.Managers;
using Epay3Service.Models;
using Epay3Service.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace Epay3Service.Tests.Managers;

public class ApplicationConfigurationManagerHelpTests
{
    private readonly Mock<ISapHttpClient> _mockSapClient;
    private readonly List<AppValue> _store;
    private readonly ApplicationConfigurationManager _manager;

    public ApplicationConfigurationManagerHelpTests()
    {
        _store = new List<AppValue>();
        _mockSapClient = new Mock<ISapHttpClient>();

        _mockSapClient
            .Setup(c => c.Get<List<AppValue>>(
                "CNBS_GET_APP_VALUES", null, It.IsAny<string>(), It.IsAny<bool>()))
            .ReturnsAsync(() => new SapHttpData<List<AppValue>?> { Data = _store.ToList() });

        _mockSapClient
            .Setup(c => c.Post<SapiResponseBody<AppValue>>(
                "CNBS_GET_APP_VALUES_ACTION", null, It.IsAny<object>(), It.IsAny<string>(), It.IsAny<bool>()))
            .Returns<string, Dictionary<string, string?>?, object, string, bool>((_, _, body, _, _) =>
            {
                var request = (SapiActionRequestBody<AppValue>)body;
                _store.RemoveAll(v => v.Key == request.Data.Key);
                if (request.Action != "delete")
                {
                    _store.Add(request.Data);
                }

                return Task.FromResult(new SapHttpData<SapiResponseBody<AppValue>?>());
            });

        _manager = new ApplicationConfigurationManager(
            _mockSapClient.Object,
            Mock.Of<IMapper>(),
            NullLogger<ApplicationConfigurationManager>.Instance,
            new ApplicationSecrets(),
            Mock.Of<IMaintenanceCacheService>());
    }

    [Fact]
    public async Task UpdateHelpConfig_RoundTripsScreensAndEnabledFlag()
    {
        var request = new HelpConfigRequest
        {
            IsHelpEnabled = true,
            Screens = new List<HelpScreenConfig>
            {
                new()
                {
                    Name = "Home",
                    Path = "/home",
                    HelpText = new Dictionary<string, string> { ["en"] = "This is the home screen." },
                },
            },
        };

        await _manager.UpdateHelpConfig(request);
        HelpConfigRequest result = await _manager.GetHelpConfig();

        Assert.True(result.IsHelpEnabled);
        HelpScreenConfig screen = Assert.Single(result.Screens);
        Assert.Equal("Home", screen.Name);
        Assert.Equal("/home", screen.Path);
        Assert.Equal("This is the home screen.", screen.HelpText["en"]);
    }

    [Fact]
    public async Task UpdateHelpConfig_RoundTripsMultipleLanguagesForOneScreen()
    {
        var request = new HelpConfigRequest
        {
            IsHelpEnabled = true,
            Screens = new List<HelpScreenConfig>
            {
                new()
                {
                    Name = "Home",
                    Path = "/home",
                    HelpText = new Dictionary<string, string>
                    {
                        ["en"] = "This is the home screen.",
                        ["fr"] = "Ceci est l'écran d'accueil.",
                    },
                },
            },
        };

        await _manager.UpdateHelpConfig(request);
        HelpConfigRequest result = await _manager.GetHelpConfig();

        HelpScreenConfig screen = Assert.Single(result.Screens);
        Assert.Equal(2, screen.HelpText.Count);
        Assert.Equal("This is the home screen.", screen.HelpText["en"]);
        Assert.Equal("Ceci est l'écran d'accueil.", screen.HelpText["fr"]);
    }

    [Fact]
    public async Task UpdateHelpConfig_ReturnsWrittenData_WithoutDependingOnReadBack()
    {
        var request = new HelpConfigRequest
        {
            IsHelpEnabled = true,
            Screens = new List<HelpScreenConfig>
            {
                new()
                {
                    Name = "Home",
                    Path = "/home",
                    HelpText = new Dictionary<string, string> { ["en"] = "<p>Hello</p><script>x()</script>" },
                },
            },
        };

        HelpConfigRequest result = await _manager.UpdateHelpConfig(request);

        // The response is built from the sanitized data just written — a transient
        // SAP failure on a read-back must never surface as an empty config that the
        // admin form would then re-save, wiping the stored data.
        Assert.True(result.IsHelpEnabled);
        Assert.False(result.LoadFailed);
        HelpScreenConfig screen = Assert.Single(result.Screens);
        Assert.Contains("<p>Hello</p>", screen.HelpText["en"]);
        Assert.DoesNotContain("<script", screen.HelpText["en"], StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task GetHelpConfig_SkipsNestedNonStringHelpTextValues_WithoutAbortingTheParse()
    {
        // Hand-corrupted (or future-shaped) blob: one language maps to a nested
        // object. The converter must skip it and keep the remaining languages
        // instead of misaligning the reader and dropping every screen.
        var json = "[{\"Name\":\"Home\",\"Path\":\"/home\",\"HelpText\":{\"en\":{\"x\":1},\"fr\":\"Texte\"}}]";
        var base64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(json));
        _store.Add(new AppValue { Key = "Help.Config", Value = base64 });

        HelpConfigRequest result = await _manager.GetHelpConfig();

        HelpScreenConfig screen = Assert.Single(result.Screens);
        Assert.Equal(string.Empty, screen.HelpText["en"]);
        Assert.Equal("Texte", screen.HelpText["fr"]);
    }

    [Fact]
    public async Task GetHelpConfig_MigratesLegacyPlainStringHelpText_IntoEnglishEntry()
    {
        // Simulates data written before per-language support existed, where HelpText
        // was stored as a bare string rather than a { "en": ... } object.
        var legacyJson = "[{\"Name\":\"Home\",\"Path\":\"/home\",\"HelpText\":\"Legacy plain-text help.\"}]";
        var legacyBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(legacyJson));
        _store.Add(new AppValue { Key = "Help.Config", Value = legacyBase64 });

        HelpConfigRequest result = await _manager.GetHelpConfig();

        HelpScreenConfig screen = Assert.Single(result.Screens);
        Assert.Equal("Legacy plain-text help.", screen.HelpText["en"]);
    }

    [Fact]
    public async Task UpdateHelpConfig_OverwritesPreviousScreens_OnSubsequentSave()
    {
        await _manager.UpdateHelpConfig(new HelpConfigRequest
        {
            IsHelpEnabled = true,
            Screens = new List<HelpScreenConfig>
            {
                new() { Path = "/home", HelpText = new Dictionary<string, string> { ["en"] = "Home help" } },
                new() { Path = "/history", HelpText = new Dictionary<string, string> { ["en"] = "History help" } },
            },
        });

        // Simulate deleting the /history screen from the admin tab and saving again.
        await _manager.UpdateHelpConfig(new HelpConfigRequest
        {
            IsHelpEnabled = true,
            Screens = new List<HelpScreenConfig>
            {
                new() { Path = "/home", HelpText = new Dictionary<string, string> { ["en"] = "Home help" } },
            },
        });

        HelpConfigRequest result = await _manager.GetHelpConfig();

        HelpScreenConfig screen = Assert.Single(result.Screens);
        Assert.Equal("/home", screen.Path);
    }

    [Fact]
    public async Task UpdateHelpConfig_SanitizesHelpTextHtml_StrippingDisallowedTagsAndScripts()
    {
        var request = new HelpConfigRequest
        {
            IsHelpEnabled = true,
            Screens = new List<HelpScreenConfig>
            {
                new()
                {
                    Name = "Home",
                    Path = "/home",
                    HelpText = new Dictionary<string, string>
                    {
                        ["en"] =
                            "<h1>Overview</h1><h2 onclick=\"alert(1)\">Details</h2><h3>Too deep</h3><p>Welcome <strong>back</strong></p><script>alert('xss')</script><img src=x onerror=\"alert(1)\">",
                    },
                },
            },
        };

        await _manager.UpdateHelpConfig(request);
        HelpConfigRequest result = await _manager.GetHelpConfig();

        HelpScreenConfig screen = Assert.Single(result.Screens);
        Assert.Contains("<strong>back</strong>", screen.HelpText["en"]);
        Assert.Contains("<h1>Overview</h1>", screen.HelpText["en"]);
        // h2 survives but its event handler must not.
        Assert.Contains("<h2>Details</h2>", screen.HelpText["en"]);
        Assert.DoesNotContain("onclick", screen.HelpText["en"], StringComparison.OrdinalIgnoreCase);
        // Only h1/h2 are in the allow-list — deeper heading levels are stripped.
        Assert.DoesNotContain("<h3", screen.HelpText["en"], StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<script", screen.HelpText["en"], StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<img", screen.HelpText["en"], StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("onerror", screen.HelpText["en"], StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task UpdateHelpConfig_SanitizesEveryLanguageEntryIndependently()
    {
        var request = new HelpConfigRequest
        {
            IsHelpEnabled = true,
            Screens = new List<HelpScreenConfig>
            {
                new()
                {
                    Name = "Home",
                    Path = "/home",
                    HelpText = new Dictionary<string, string>
                    {
                        ["en"] = "<p>Safe</p>",
                        ["fr"] = "<p>Mauvais</p><script>alert('xss')</script>",
                    },
                },
            },
        };

        await _manager.UpdateHelpConfig(request);
        HelpConfigRequest result = await _manager.GetHelpConfig();

        HelpScreenConfig screen = Assert.Single(result.Screens);
        Assert.Contains("Safe", screen.HelpText["en"]);
        Assert.DoesNotContain("<script", screen.HelpText["fr"], StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task UpdateHelpConfig_StripsUnsafeLinkAttributesAndSchemes_ButKeepsSafeHref()
    {
        var request = new HelpConfigRequest
        {
            IsHelpEnabled = true,
            Screens = new List<HelpScreenConfig>
            {
                new()
                {
                    Name = "Home",
                    Path = "/home",
                    HelpText = new Dictionary<string, string>
                    {
                        ["en"] =
                            "<p><a href=\"javascript:alert(1)\">click</a> <a href=\"https://example.com\" onclick=\"evil()\">safe</a></p>",
                    },
                },
            },
        };

        await _manager.UpdateHelpConfig(request);
        HelpConfigRequest result = await _manager.GetHelpConfig();

        HelpScreenConfig screen = Assert.Single(result.Screens);
        Assert.DoesNotContain("javascript:", screen.HelpText["en"], StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("onclick", screen.HelpText["en"], StringComparison.OrdinalIgnoreCase);
        Assert.Contains("href=\"https://example.com\"", screen.HelpText["en"]);
    }

    [Fact]
    public async Task GetHelpConfig_ReturnsDefault_WhenNoDataStored()
    {
        HelpConfigRequest result = await _manager.GetHelpConfig();

        Assert.False(result.IsHelpEnabled);
        Assert.Empty(result.Screens);
    }

    [Fact]
    public async Task GetHelpConfig_ReturnsDefault_WhenSapThrows()
    {
        _mockSapClient
            .Setup(c => c.Get<List<AppValue>>(
                "CNBS_GET_APP_VALUES", null, It.IsAny<string>(), It.IsAny<bool>()))
            .ThrowsAsync(new InvalidOperationException("SAP unavailable"));

        HelpConfigRequest result = await _manager.GetHelpConfig();

        Assert.False(result.IsHelpEnabled);
        Assert.Empty(result.Screens);
        Assert.True(result.LoadFailed);
    }
}
