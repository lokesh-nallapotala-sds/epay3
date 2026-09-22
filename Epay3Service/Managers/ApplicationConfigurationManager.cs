using AutoMapper;
using Epay3Service.Clients.Interfaces;
using Epay3Service.Configuration;
using Epay3Service.Custom.Attributes;
using Epay3Service.Extensions;
using Epay3Service.Helpers;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;
using Epay3Service.Models.ConfigRequest;
using Epay3Service.Services;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Epay3Service.Managers;

public class ApplicationConfigurationManager(
    ISapHttpClient sapHttpClient,
    IMapper mapper,
    ILogger<ApplicationConfigurationManager> logger,
    ApplicationSecrets appSecrets,
    IMaintenanceCacheService maintenanceCache
    ) : IApplicationConfigurationManager
{
    private const string ApplicationLinksKey = "ApplicationLinks";
    private static readonly (string Field, string Label, string Id)[] LegacyApplicationLinks =
    [
        ("PrivacyPolicy", "Privacy Policy", "application-link-1"),
        ("TermsAndConditions", "Terms and Conditions", "application-link-2"),
        ("ContactUs", "Contact Us", "application-link-3")
    ];

    private readonly ISapHttpClient sapHttpClient = sapHttpClient;
    private readonly IMapper mapper = mapper;
    private readonly ILogger<ApplicationConfigurationManager> logger = logger;
    private List<AppValue> appValues = new();
    private SapCustomData? customData = null;
    private readonly ApplicationSecrets appSecrets = appSecrets;
    private readonly IMaintenanceCacheService maintenanceCache = maintenanceCache;

    public async Task<bool> ArePaymentsDisabled()
    {
        List<AppValue> values = await GetValues();
        var isPaymentDisabled = values.FirstOrDefault(x => x.Key == "isPaymentsDisable")?.Value;

        return "true".Equals(isPaymentDisabled);
    }

    public string GetLanguageFile(string language)
    {
        var filename = Path.Join(Path.GetDirectoryName(AppContext.BaseDirectory), "Config", "Languages", $"{language}.json");
        //var filename = $"{Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location)}\\Config\\Languages\\{language}.json";
        var text = "";

        if (File.Exists(filename))
        {
            text = File.ReadAllText(filename);
        }

        return text;
    }

    public async Task<ApplicationConfiguration> GetApplicationConfig(bool isRefresh = false)
    {
        List<AppValue> values = await GetValues(isRefresh);

        ApplicationConfiguration config = Bind<ApplicationConfiguration>(values);

        return config;
    }

    // consider making the custom data interface more granular, i.e. separate endpoints for sales orgs, payment methods, etc.
    // that way we can enforce access policy on particular endpoints.
    public async Task<SapCustomData?> GetCustomConfig(string language = "en", bool isRefresh = false)
    {
        if (customData == null || isRefresh)
        {
            //NOTE: the try is only to catch potential mapping errors - should eventually be removed
            try
            {
                Clients.Models.SapHttpData<DTOs.SapCustomData?> response = await sapHttpClient.Get<DTOs.SapCustomData>("CNBS_CUSTOM_DATA_URL", null, language, false);

                customData = mapper.Map<SapCustomData>(response.Data);
            }
            catch (Exception ex)
            {
                logger.LogError(ex.Message);
            }
        }

        return customData;
    }

    public async Task<PaymentConfiguration> GetPaymentConfig(string language = "en")
    {
        List<AppValue> values = await GetValues(true);

        PaymentConfiguration config = Bind<PaymentConfiguration>(values);

        return config;
    }

    //public async Task<EmailTemplate> GetEmailConfig(string language = "en")
    //{
    //    List<AppValue> values = await this.GetValues(true);

    //    var emailTemplateKeys = new HashSet<string>
    //{
    //    "welcome_email_content",
    //    "confirmation_email_content",
    //    "reset_password_email_content",
    //    "password_changed_email_content",
    //    "invoice_receipt_content",
    //    "guest_invoice_receipt_content"
    //};

    //    var templates = values
    //        .Where(v => emailTemplateKeys.Contains(v.Key))
    //        .Select(v => new EmailTemplate
    //        {
    //            Key = v.Key,
    //            Content = v.Value
    //        })
    //        .ToList();

    //    return new EmailTemplate
    //    {
    //        Templates = templates
    //    };
    //}


    public async Task<ThemeConfig> GetThemeForUrl(string url)
    {
        ThemeConfig[] themes = await GetThemeConfig();
        ThemeConfig? matchTheme = themes.FirstOrDefault(
                            x => x.Urls.Any(y =>
                              y.Contains(url, StringComparison.InvariantCultureIgnoreCase)
                              || url.Contains(y, StringComparison.InvariantCultureIgnoreCase)));

        if (matchTheme == null)
        {
            matchTheme = themes.FirstOrDefault(x => x.Name == "theme_default");
        }
        return matchTheme;
    }
    public async Task<ThemeConfig[]> GetThemeConfig(string language = "en")
    {
        // Assume GetValuesAsync is a method that retrieves key-value pairs from a data source
        List<AppValue> values = await GetValues(true);

        // Filter values based on the selected language and theme prefix
        var themeValues = values.Where(x => x.Key.StartsWith("theme_")).OrderBy(x => x.Key).ToList();

        var dict = new Dictionary<string, ThemeConfig>();

        PropertyInfo[] props = typeof(ThemeConfig).GetProperties();

        foreach (AppValue? value in themeValues)
        {
            var name = value.Key.Split('.')[0];

            if (!dict.TryGetValue(name, out ThemeConfig? config))
            {
                config = new ThemeConfig
                {
                    Banners = new List<Banner>(),
                    Urls = new List<string>()
                };
                dict.Add(name, config);
            }

            if (value.Key.Contains("LoginPage.bannerContent") ||
                value.Key.Contains("LoginPage.bannerText1") ||
                value.Key.Contains("LoginPage.bannerText2"))
            {
                var lang = value.Key.Substring(value.Key.Length - 2, 2);
                config.Banners ??= new List<Banner>();
                var banner = config.Banners.FirstOrDefault(b => b.Language == lang);
                if (banner == null)
                {
                    banner = new Banner { Language = lang };
                    config.Banners.Add(banner);
                }

                if (value.Key.Contains("bannerContent"))
                    banner.Content = value.Value ?? string.Empty;
                else if (value.Key.Contains("bannerText1"))
                    banner.Text1 = value.Value;
                else if (value.Key.Contains("bannerText2"))
                    banner.Text2 = value.Value;
            }
            else if (value.Key.Contains("Urls"))
            {
                if (!string.IsNullOrEmpty(value.Value))
                {
                    config.Urls = value.Value.Split('+').ToList();
                }
            }
            else
            {
                // A malformed or unknown key (hand-edited SAP row, a field from
                // a newer build) must not take down theme loading for every
                // caller — skip it instead of throwing.
                var keyParts = value.Key.Split('.');
                if (keyParts.Length < 2)
                {
                    continue;
                }
                PropertyInfo? property = props.SingleOrDefault(x => x.Name == keyParts[1]);
                if (property == null || !property.CanWrite || property.PropertyType != typeof(string))
                {
                    continue;
                }
                property.SetValue(config, value.Value);
            }

        }

        ThemeConfig[] themeConfig = dict.Values
           .Where(x => !string.IsNullOrEmpty(x.Name))
           .ToArray();
        return themeConfig;
    }
    public async Task<ThemeConfig[]> updateThemeConfig(ThemeConfig[] request, string language = "en")
    {
        foreach (ThemeConfig themeConfig in request)
        {
            var themeName = themeConfig.Name;
            if (string.IsNullOrEmpty(themeName))
            {
                throw new ArgumentException("Theme name cannot be empty");
            }

            // Update banners
            foreach (Banner banner in themeConfig.Banners)
            {
                if (banner.Text1 != null)
                {
                    var text1Key = $"{themeName}.LoginPage.bannerText1.{banner.Language}";
                    await UpdateAppValue(text1Key, banner.Text1, language);
                }

                if (banner.Text2 != null)
                {
                    var text2Key = $"{themeName}.LoginPage.bannerText2.{banner.Language}";
                    await UpdateAppValue(text2Key, banner.Text2, language);
                }

                if (!string.IsNullOrEmpty(banner.Content))
                {
                    var bannerKey = $"{themeName}.LoginPage.bannerContent.{banner.Language}";
                    await UpdateAppValue(bannerKey, banner.Content, language);
                }
            }

            // Update URLs
            var urlsKey = $"{themeName}.Urls";
            var urlsValue = themeConfig.Urls != null && themeConfig.Urls.Count > 0
                ? string.Join('+', themeConfig.Urls)
                : string.Empty;
            await UpdateAppValue(urlsKey, urlsValue, language);

            // Update other properties
            foreach (PropertyInfo property in themeConfig.GetType().GetProperties())
            {
                if (property.Name != "Banners" && property.Name != "Urls")
                {
                    var value = property.GetValue(themeConfig, null)?.ToString();
                    if (value != null && !string.IsNullOrEmpty(value))
                    {
                        if (property.Name == "BrandIcon" && !value.StartsWith("data:image/x-icon;base64"))
                        {
                            continue;
                        }

                        var propertyKey = $"{themeName}.{property.Name}";
                        await UpdateAppValue(propertyKey, value, language);
                    }
                }
            }
        }

        // Refresh values and bind updated configuration
        ThemeConfig[] updatedConfig = await GetThemeConfig(language);

        return updatedConfig;
    }

    public async Task<ThemeConfig[]> deleteThemeConfig(ThemeConfig[] request, string language = "en")
    {
        foreach (ThemeConfig themeConfig in request)
        {
            var themeName = themeConfig.Name;
            if (string.IsNullOrEmpty(themeName))
            {
                throw new ArgumentException("Theme name cannot be empty");
            }

            // Delete banner content keys
            foreach (Banner banner in themeConfig.Banners)
            {
                var bannerKey = $"{themeName}.LoginPage.bannerContent.{banner.Language}";
                await DeleteAppValue(bannerKey, language);
            }

            // Delete URLs key
            var urlsKey = $"{themeName}.Urls";
            await DeleteAppValue(urlsKey, language);

            // Delete other properties
            foreach (PropertyInfo property in themeConfig.GetType().GetProperties())
            {
                if (property.Name != "Banners" && property.Name != "Urls")
                {
                    var propertyKey = $"{themeName}.{property.Name}";
                    await DeleteAppValue(propertyKey, language);
                }
            }
        }

        // Return the updated theme config (post-deletion)
        ThemeConfig[] updatedConfig = await GetThemeConfig(language);
        return updatedConfig;
    }



    //TODO: this just returns the same data as GetCustomConfig().
    // we should either:
    // + pull the payment data out and return (only) that, or
    // + let the callers (controllers) use GetCustomConfig() and be responsible
    //   for extracting what they want - and remove this method.
    public async Task<List<PaymentReasonCodeInfo>?> GetPaymentReasonCodes(string language = "en")
    {
        if (customData == null)
        {
            SapCustomData? data = await GetCustomConfig(language);
            return data.PaymentReasonCodes;
        }
        else
        {
            return customData.PaymentReasonCodes ?? new List<PaymentReasonCodeInfo>();
        }
    }

    public async Task<List<PaymentCardInfo>?> GetPaymentCards(string language = "en")
    {
        if (customData == null)
        {
            SapCustomData? data = await GetCustomConfig(language);
            return data?.PaymentCards;
        }
        else
        {
            return customData.PaymentCards ?? new List<PaymentCardInfo>();
        }
    }

    public async Task<List<AppValue>> GetValues(bool refresh = false)
    {
        if (appValues == null || appValues.Count == 0 || refresh)
        {
            Clients.Models.SapHttpData<List<AppValue>?> response = await sapHttpClient.Get<List<AppValue>>("CNBS_GET_APP_VALUES", null);

            appValues = response?.Data ?? new List<AppValue>();
        }

        return appValues;
    }

    private T Bind<T>(List<AppValue> appValues) where T : new()
    {
        PropertyInfo[] properties = typeof(T).GetProperties();
        var obj = new T();

        foreach (PropertyInfo property in properties)
        {
            // Handle properties with the custom attribute
            ApplicationValueAttribute? attribute = property.GetCustomAttribute<ApplicationValueAttribute>();
            string propertyName = attribute?.AppValueName ?? property.Name;

            if (property.PropertyType == typeof(ScheduledPaymentPolicy))
            {
                var policy = ReadPolicyOrDefault(appValues);
                property.SetValue(obj, policy);
                continue;
            }

            if (property.PropertyType == typeof(List<ApplicationLinkItem>))
            {
                var links = ReadApplicationLinksOrDefault(appValues);
                property.SetValue(obj, links);
                continue;
            }

            if (property.PropertyType == typeof(Dictionary<string, string>) && property.CanWrite)
            {
                // Initialize dictionary
                var dictionary = new Dictionary<string, string>();

                // Filter appValues for keys that start with the property name
                var relevantValues = appValues.Where(x => x.Key.StartsWith(propertyName + "_")).ToList();

                foreach (AppValue? appValue in relevantValues)
                {
                    // Extract language code from the key (e.g., "MessageText_en" -> "en")
                    var languageCode = appValue.Key.Substring(propertyName.Length + 1); // After "MessageText_"

                    if (!string.IsNullOrEmpty(languageCode))
                    {
                        dictionary[languageCode] = appValue?.Value ?? "";
                    }
                }

                // Set the dictionary value to the property
                property.SetValue(obj, dictionary, null);
            }
            else
            {
                // Handle non-dictionary properties
                AppValue? appValue = appValues.SingleOrDefault(x => x.Key == propertyName);
                if (appValue != null && !string.IsNullOrEmpty(appValue.Value) && property.CanWrite)
                {
                    if (property.PropertyType == typeof(DateTimeOffset))
                    {
                        property.SetValue(
                            obj,
                            DateTimeOffset.Parse(
                                appValue.Value,
                                System.Globalization.CultureInfo.InvariantCulture,
                                System.Globalization.DateTimeStyles.RoundtripKind
                            ),
                            null
                        );
                    }
                    else
                    {
                        property.SetValue(obj, Convert.ChangeType(appValue.Value, property.PropertyType), null);
                    }
                }
            }
        }

        return obj;
    }


    private T BindWithOutAttributes<T>(List<AppValue> appValues) where T : new()
    {
        PropertyInfo[] properties = typeof(T).GetProperties();
        var obj = new T();

        foreach (PropertyInfo property in properties)
        {
            if (property.Name == "SmtpPassword")
            {
                var passValue = appValues.GetValueOrDefault(property.Name);
                if (passValue != null && passValue != "null")
                {
                    var appValue = SimpleEncrypt.DecryptString(passValue, appSecrets.EncryptionKey);
                    if (appValue != null && !string.IsNullOrEmpty(appValue) && property.CanWrite)
                    {
                        property.SetValue(obj, Convert.ChangeType(appValue, property.PropertyType), null);
                    }
                }
            }
            else
            {
                // Handle properties with the custom attribute
                ApplicationValueAttribute? attribute = property.GetCustomAttribute<ApplicationValueAttribute>();
                string propertyName = attribute?.AppValueName ?? property.Name;

                // Special handling for Dictionary<string, string>
                if (property.PropertyType == typeof(Dictionary<string, string>) && property.CanWrite)
                {
                    // Initialize dictionary
                    var dictionary = new Dictionary<string, string>();

                    // Filter appValues for keys that start with the property name
                    var relevantValues = appValues.Where(x => x.Key.StartsWith(propertyName + "_")).ToList();

                    foreach (AppValue? appValue in relevantValues)
                    {
                        // Extract language code from the key (e.g., "MessageText_en" -> "en")
                        var languageCode = appValue.Key.Substring(propertyName.Length + 1); // After "MessageText_"

                        if (!string.IsNullOrEmpty(languageCode))
                        {
                            dictionary[languageCode] = appValue?.Value ?? "";
                        }
                    }

                    // Set the dictionary value to the property
                    property.SetValue(obj, dictionary, null);
                }
                else
                {
                    // Handle non-dictionary properties
                    AppValue? appValue = appValues.SingleOrDefault(x => x.Key == propertyName);
                    if (appValue != null && !string.IsNullOrEmpty(appValue.Value) && property.CanWrite)
                    {
                        if (property.PropertyType == typeof(DateTimeOffset))
                        {
                            property.SetValue(
                                obj,
                                DateTimeOffset.Parse(
                                    appValue.Value,
                                    System.Globalization.CultureInfo.InvariantCulture,
                                    System.Globalization.DateTimeStyles.RoundtripKind
                                ),
                                null
                            );
                        }
                        else
                        {
                            property.SetValue(obj, Convert.ChangeType(appValue.Value, property.PropertyType), null);
                        }
                    }
                }
            }
        }

        return obj;
    }

    public async Task<EmailConfigRequest> GetSmtpConfig(string language = "en")
    {
        try
        {
            List<AppValue> values = await GetValues();

            if (values.Count == 0)
            {
                return new EmailConfigRequest();
            }
            EmailConfigRequest config = BindWithOutAttributes<EmailConfigRequest>(values);
            return config;
        }
        catch (Exception ex)
        {
            // SAP/app-values fetch can fail (e.g. SAP unavailable). Degrade gracefully
            // with a default config so the admin Configuration page still renders,
            // mirroring GetMaintenanceConfig, instead of returning a 500.
            logger.LogWarning(ex, "Failed to fetch SMTP config from SAP. Returning default.");
            return new EmailConfigRequest();
        }
    }

    public async Task<ApplicationConfigRequest> UpdateApplicationConfig(ApplicationConfigRequest request, string language = "en")
    {
        foreach (PropertyInfo property in request.GetType().GetProperties())
        {
            var value = property.GetValue(request, null);

            if (value is ScheduledPaymentPolicy policy)
            {
                // Serialize to JSON
                var json = System.Text.Json.JsonSerializer.Serialize(
                    policy,
                    new JsonSerializerOptions { Converters = { new JsonStringEnumConverter() } });

                // Encode JSON as base64
                string base64Encoded = Convert.ToBase64String(Encoding.UTF8.GetBytes(json));

                // Save into SAP
                await UpdateAppValue("ScheduledPaymentPolicy", base64Encoded, language);
                continue;
            }

            if (value is List<ApplicationLinkItem> linkItems)
            {
                var normalizedLinks = NormalizeApplicationLinks(linkItems);
                var json = System.Text.Json.JsonSerializer.Serialize(normalizedLinks);
                var base64Encoded = Convert.ToBase64String(Encoding.UTF8.GetBytes(json));

                await UpdateAppValue(ApplicationLinksKey, base64Encoded, language);
                await UpdateLegacyApplicationLinkValues(normalizedLinks, language);
                continue;
            }

            // Check if the property is of type Dictionary<string, string>
            if (value is Dictionary<string, string> messageDictionary)
            {
                foreach (KeyValuePair<string, string> kvp in messageDictionary)
                {
                    var lang = kvp.Key;        // Language code (e.g., "en", "fr")
                    var message = kvp.Value;  // Corresponding message text

                    // Update the value for each language dynamically
                    await UpdateAppValue($"{property.Name}_{lang}", message, lang);
                }
            }
            else
            {
                // Handle non-dictionary properties as strings
                var serializedValue = value switch
                {
                    DateTimeOffset dto => dto.ToString("o"),
                    _ => value?.ToString()
                };

                await UpdateAppValue(property.Name, serializedValue, language);
            }
        }

        List<AppValue> values = await GetValues(true);

        ApplicationConfigRequest config = Bind<ApplicationConfigRequest>(values);

        return config;
    }

    public async Task<EmailConfigRequest> UpdateEmailConfig(EmailConfigRequest request, string language = "en")
    {
        foreach (PropertyInfo property in request.GetType().GetProperties())
        {
            if (property.Name == "SmtpPassword")
            {
                var value = request.SmtpPassword;
                if (!String.IsNullOrEmpty(value))
                {
                    value = SimpleEncrypt.EncryptString(value, appSecrets.EncryptionKey);
                    await UpdateAppValue(property.Name, value, language);
                }
            }
            else
            {
                await UpdateAppValue(property.Name, property?.GetValue(request, null)?.ToString(), language);
            }
        }

        List<AppValue> values = await GetValues(true);

        EmailConfigRequest config = BindWithOutAttributes<EmailConfigRequest>(values);

        return config;
    }

    public async Task<bool> UpdateEmailTemplate(string key, EmailConfig config, string language = "en")
    {
        // Email templates are stored on desk. Save to file.
        foreach (KeyValuePair<string, EmailTemplate> entry in config.Templates)
        {
            var sapKey = $"EmailTemplate.{key}.{entry.Key}";
            var valueJson = JsonConvert.SerializeObject(entry.Value);
            valueJson = SapSafe.Encode(valueJson);
            await UpdateAppValue(sapKey, valueJson, language);
        }
        return true;
    }

    public async Task UpdateAppValue(string key, string? value, string language = "en")
    {
        await GetValues();
        if (appValues.FirstOrDefault(v => v.Key.Equals(key)) != null)
        {
            await AppValueAction(new AppValue
            {
                Key = key,
                Value = value,
            }, "modify", language);
        }
        else
        {
            await AppValueAction(new AppValue
            {
                Key = key,
                Value = value,
            }, "create", language);
        }
    }

    public async Task DeleteAppValue(string key, string language = "en")
    {
        await GetValues();
        var existing = appValues.FirstOrDefault(v => v.Key.Equals(key));

        if (existing != null)
        {
            await AppValueAction(new AppValue
            {
                Key = key,
                Value = null
            }, "delete", language);
        }
    }

    public async Task<EmailConfig> GetEmailTemplates(string key)
    {
        EmailConfig emailConfig = new EmailConfig { IsEnabled = true, Key = key, Templates = new Dictionary<string, EmailTemplate>() };

        var sapKey = $"EmailTemplate.{key}";
        List<AppValue> appValues = await GetValues(true);
        IEnumerable<AppValue> configs = appValues.Where(x => x.Key.StartsWith(sapKey, StringComparison.OrdinalIgnoreCase));

        if (configs.Any())
        {
            foreach (AppValue? config in configs)
            {
                var jsonStr = SapSafe.Decode(config.Value);
                EmailTemplate? value = JsonConvert.DeserializeObject<EmailTemplate>(jsonStr);
                if (!string.IsNullOrEmpty(value?.Language))
                {
                    emailConfig.Templates.Add(value.Language, value);
                }
            }
        }

        return emailConfig;
    }


    public async Task<EmailTemplateHealthCheck> CheckEmailTemplates(string language = "en")
    {
        EmailTemplateHealthCheck health = new EmailTemplateHealthCheck();

        List<AppValue> appValues = await GetValues(true);

        foreach (string templateKey in TextConstant.ExpectedEmailTemplateKeys)
        {
            string sapKeyPrefix = $"EmailTemplate.{templateKey}";

            var configs = appValues
                .Where(x => x.Key.StartsWith(sapKeyPrefix, StringComparison.OrdinalIgnoreCase))
                .ToList();

            if (!configs.Any())
            {
                health.MissingKeys.Add(templateKey);
                continue;
            }

            bool hasValidTemplate = false;

            foreach (AppValue config in configs)
            {
                var jsonStr = SapSafe.Decode(config?.Value);
                EmailTemplate? value =
                    JsonConvert.DeserializeObject<EmailTemplate>(jsonStr);

                if (!string.IsNullOrEmpty(value?.Language) &&
                    !string.IsNullOrWhiteSpace(value?.Email))
                {
                    hasValidTemplate = true;
                    break;
                }
            }

            // Exists but all are blank / invalid
            if (!hasValidTemplate)
            {
                health.MissingKeys.Add(templateKey);
            }
        }

        health.HasMissingTemplates = health.MissingKeys.Any();
        return health;
    }



    public async Task AppValueAction(AppValue appValue, string action, string language)
    {
        Clients.Models.SapHttpData<SapiResponseBody<AppValue>?> response = await sapHttpClient.Post<SapiResponseBody<AppValue>>("CNBS_GET_APP_VALUES_ACTION", null,
        new SapiActionRequestBody<AppValue> { Data = appValue, Action = action }, language, true);
    }
    public async Task<MaintenanceConfigRequest> UpdateMaintenanceConfig(MaintenanceConfigRequest request, string language = "en")
    {
        foreach (PropertyInfo property in request.GetType().GetProperties())
        {
            var value = property.GetValue(request, null);

            // Check if the property is of type Dictionary<string, string>
            if (value is Dictionary<string, string> messageDictionary)
            {
                foreach (KeyValuePair<string, string> kvp in messageDictionary)
                {
                    var lang = kvp.Key;        // Language code (e.g., "en", "fr")
                    var message = kvp.Value;  // Corresponding message text

                    // Update the value for each language dynamically
                    await UpdateAppValue($"{property.Name}_{lang}", message, lang);
                }
            }
            else
            {
                // Handle non-dictionary properties as strings
                await UpdateAppValue(property.Name, value?.ToString(), language);
            }
        }

        List<AppValue> values = await GetValues(true);
        if (values == null || values.Count == 0)
        {
            // The writes above succeeded but the confirmation read returned no
            // app values (SAP business-error body). Caching a default here
            // would silently wipe the maintenance window; keep the existing
            // cache and echo the submitted values back to the admin UI.
            logger.LogWarning("SAP returned no app values after maintenance update; keeping existing maintenance cache.");
            return request;
        }

        MaintenanceConfigRequest config = BindWithOutAttributes<MaintenanceConfigRequest>(values);

        // Update the local container's cache immediately so the middleware
        // reflects the change right away.
        maintenanceCache.SetCache(config);

        return config;
    }

    public async Task<SystemConfig> UpdateSystemConfig(SystemConfig request, string language = "en")
    {
        foreach (PropertyInfo property in request.GetType().GetProperties())
        {
            await UpdateAppValue(property.Name, property?.GetValue(request, null)?.ToString(), language);
        }

        List<AppValue> values = await GetValues(true);
        SystemConfig config = BindWithOutAttributes<SystemConfig>(values);

        return config;
    }

    public async Task<MaintenanceConfigRequest> GetMaintenanceConfig(string language = "en")
    {
        try
        {
            List<AppValue> values = await GetValues(true);
            if (values == null || values.Count == 0)
            {
                // GetValues returns an empty list when SAP answers with a
                // business-error body. Caching a default here would wipe the
                // real maintenance window and reset the failure counters
                // SendCoreAsync just recorded.
                logger.LogWarning("SAP returned no app values; keeping existing maintenance cache.");
                return new MaintenanceConfigRequest();
            }

            MaintenanceConfigRequest config = BindWithOutAttributes<MaintenanceConfigRequest>(values);
            maintenanceCache.SetCache(config);
            return config;
        }
        catch (Exception ex)
        {
            // SapHttpClient already marked the failure on the availability state.
            logger.LogWarning(ex, "Failed to fetch maintenance config from SAP. Returning default.");
            return new MaintenanceConfigRequest();
        }
    }

    private const string HelpEnabledKey = "IsHelpEnabled";
    private const string HelpConfigKey = "Help.Config";

    private static readonly JsonSerializerOptions HelpJsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    // Help Text is authored via a rich text editor and rendered as HTML to every end user who
    // opens the screen it's attached to — unlike email templates (edited/stored as HTML but
    // never rendered inside the app), this is the first admin-authored HTML this app renders
    // client-side, so it must be sanitized to a tight allow-list before it's ever persisted.
    private static readonly Ganss.Xss.HtmlSanitizer HelpTextSanitizer = CreateHelpTextSanitizer();

    private static Ganss.Xss.HtmlSanitizer CreateHelpTextSanitizer()
    {
        var sanitizer = new Ganss.Xss.HtmlSanitizer();

        sanitizer.AllowedTags.Clear();
        sanitizer.AllowedTags.UnionWith(["h1", "h2", "p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a"]);

        sanitizer.AllowedAttributes.Clear();
        sanitizer.AllowedAttributes.UnionWith(["href", "target", "rel"]);

        sanitizer.AllowedSchemes.Clear();
        sanitizer.AllowedSchemes.UnionWith(["http", "https", "mailto"]);

        sanitizer.AllowedCssProperties.Clear();
        sanitizer.AllowedAtRules.Clear();

        return sanitizer;
    }

    public async Task<HelpConfigRequest> GetHelpConfig(string language = "en")
    {
        try
        {
            List<AppValue> values = await GetValues(true);

            var config = new HelpConfigRequest
            {
                IsHelpEnabled = bool.TryParse(
                    values.FirstOrDefault(x => x.Key == HelpEnabledKey)?.Value, out bool enabled) && enabled,
                Screens = ReadHelpScreensOrDefault(values),
            };

            return config;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to fetch help config from SAP. Returning default.");
            // LoadFailed distinguishes "SAP is down" from "nothing configured yet":
            // the end-user widget hides either way, but the admin tab must block
            // saving over what only *looks* like an empty config.
            return new HelpConfigRequest { LoadFailed = true };
        }
    }

    public async Task<HelpConfigRequest> UpdateHelpConfig(HelpConfigRequest request, string language = "en")
    {
        await UpdateAppValue(HelpEnabledKey, request.IsHelpEnabled.ToString(), language);

        List<HelpScreenConfig> screens = (request.Screens ?? new List<HelpScreenConfig>())
            .Select(s => new HelpScreenConfig
            {
                Name = s.Name,
                Path = s.Path,
                HelpText = (s.HelpText ?? new Dictionary<string, string>())
                    .ToDictionary(
                        kvp => kvp.Key,
                        kvp => string.IsNullOrWhiteSpace(kvp.Value) ? kvp.Value : HelpTextSanitizer.Sanitize(kvp.Value)),
            })
            .ToList();

        var json = System.Text.Json.JsonSerializer.Serialize(screens, HelpJsonOptions);
        var base64Encoded = Convert.ToBase64String(Encoding.UTF8.GetBytes(json));

        await UpdateAppValue(HelpConfigKey, base64Encoded, language);

        // Return the data just written (already sanitized above) rather than
        // re-reading from SAP: a transient failure on the read-back would come
        // back as an EMPTY config, which the admin form would display — and the
        // next Save would then genuinely wipe the stored data.
        return new HelpConfigRequest
        {
            IsHelpEnabled = request.IsHelpEnabled,
            Screens = screens,
        };
    }

    private static List<HelpScreenConfig> ReadHelpScreensOrDefault(List<AppValue> appValues)
    {
        var raw = appValues.FirstOrDefault(v => v.Key == HelpConfigKey)?.Value;
        if (string.IsNullOrWhiteSpace(raw))
        {
            return new List<HelpScreenConfig>();
        }

        try
        {
            var json = Encoding.UTF8.GetString(Convert.FromBase64String(raw));
            List<HelpScreenConfig>? screens = System.Text.Json.JsonSerializer.Deserialize<List<HelpScreenConfig>>(json, HelpJsonOptions);
            return screens ?? new List<HelpScreenConfig>();
        }
        catch
        {
            return new List<HelpScreenConfig>();
        }
    }

    private static readonly JsonSerializerOptions PolicyJsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    private static List<ApplicationLinkItem> ReadApplicationLinksOrDefault(
        List<AppValue> appValues)
    {
        var raw = appValues.FirstOrDefault(v => v.Key == ApplicationLinksKey)?.Value;
        if (raw != null)
        {
            if (string.IsNullOrWhiteSpace(raw))
            {
                return new List<ApplicationLinkItem>();
            }

            try
            {
                var json = Encoding.UTF8.GetString(Convert.FromBase64String(raw));
                List<ApplicationLinkItem>? links = System.Text.Json.JsonSerializer.Deserialize<List<ApplicationLinkItem>>(json);
                return NormalizeApplicationLinks(links);
            }
            catch (FormatException)
            {
                try
                {
                    List<ApplicationLinkItem>? links = System.Text.Json.JsonSerializer.Deserialize<List<ApplicationLinkItem>>(raw);
                    return NormalizeApplicationLinks(links);
                }
                catch
                {
                }
            }
            catch
            {
            }
        }

        return BuildLegacyApplicationLinks(appValues);
    }

    private static List<ApplicationLinkItem> NormalizeApplicationLinks(
        IEnumerable<ApplicationLinkItem>? links)
    {
        List<ApplicationLinkItem> normalized = new();
        int index = 0;

        foreach (ApplicationLinkItem? candidate in links ?? Enumerable.Empty<ApplicationLinkItem>())
        {
            if (candidate == null)
            {
                continue;
            }

            string label = candidate.Label?.Trim() ?? string.Empty;
            string url = candidate.Url?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(label) && string.IsNullOrWhiteSpace(url))
            {
                continue;
            }

            normalized.Add(new ApplicationLinkItem
            {
                Id = string.IsNullOrWhiteSpace(candidate.Id)
                    ? $"application-link-{++index}"
                    : candidate.Id.Trim(),
                Label = label,
                Url = url
            });
        }

        return normalized;
    }

    private static List<ApplicationLinkItem> BuildLegacyApplicationLinks(
        IEnumerable<AppValue> appValues)
    {
        List<ApplicationLinkItem> links = new();

        foreach ((string field, string label, string id) in LegacyApplicationLinks)
        {
            string? url = appValues.FirstOrDefault(v => v.Key == field)?.Value?.Trim();
            if (string.IsNullOrWhiteSpace(url))
            {
                continue;
            }

            links.Add(new ApplicationLinkItem
            {
                Id = id,
                Label = label,
                Url = url
            });
        }

        return links;
    }

    private async Task UpdateLegacyApplicationLinkValues(
        IReadOnlyList<ApplicationLinkItem> links,
        string language)
    {
        foreach ((string field, string label, _) in LegacyApplicationLinks)
        {
            string? url = links
                .FirstOrDefault(link =>
                    label.Equals(link.Label?.Trim(), StringComparison.OrdinalIgnoreCase))
                ?.Url
                ?.Trim();

            await UpdateAppValue(field, url ?? string.Empty, language);
        }
    }

    private static ScheduledPaymentPolicy ReadPolicyOrDefault(List<AppValue> appValues)
    {
        var raw = appValues.FirstOrDefault(v => v.Key == "ScheduledPaymentPolicy")?.Value;
        if (!string.IsNullOrWhiteSpace(raw))
        {
            try
            {
                // Decode base64 back into JSON
                var json = Encoding.UTF8.GetString(Convert.FromBase64String(raw));

                var p = System.Text.Json.JsonSerializer.Deserialize<ScheduledPaymentPolicy>(json, PolicyJsonOptions);
                if (p != null) return p;
            }
            catch (FormatException)
            {
                // wasn't base64, try raw JSON fallback
                try
                {
                    var p = System.Text.Json.JsonSerializer.Deserialize<ScheduledPaymentPolicy>(raw, PolicyJsonOptions);
                    if (p != null) return p;
                }
                catch { /* swallow and fall through */ }
            }
        }

        // Fallback safe default
        return new ScheduledPaymentPolicy
        {
            Mode = ScheduleMode.None,
            AllowedWeekdays = null,
            AllowedMonthDays = null
        };
    }

}
