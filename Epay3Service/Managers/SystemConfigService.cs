using Epay3Service.Configuration;
using Epay3Service.Extensions;
using Epay3Service.Helpers;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;
using Microsoft.Extensions.Configuration;
using Newtonsoft.Json;
using System.Web;

namespace Epay3Service.Managers;

public class SystemConfigService(
    AppValuesRepository repo,
    IConfiguration config,
    ApplicationSecrets applicationSecrets
    ) : ISystemConfigService
{
    private readonly AppValuesRepository repo = repo;
    private readonly IConfiguration config = config;
    private readonly ApplicationSecrets appSecrets = applicationSecrets;

    public async Task<SystemConfiguration> GetConfig(bool refresh = false)
    {
        List<AppValue> appValues = await this.repo.GetValues(refresh);

        var systemConfig = new SystemConfiguration
        {
            OverrideEmail = this.GetConfigValue("OverrideEmail", appValues),
            bannerContent = this.GetConfigValue("bannerContent", appValues),
            RegistrationRequestEmail = this.GetConfigValue("RegistrationRequestEmail", appValues),
            RegistrationEmailExpiration = this.GetConfigValue("RegistrationEmailExpiration", appValues),
            RegistrationEmailExpirationMessage = this.GetConfigValue("RegistrationEmailExpirationMessage", appValues),
            SmtpAddress = this.GetConfigValue("SmtpAddress", appValues),
            SmtpPort = this.GetConfigValue("SmtpPort", appValues, "28"),
            SmtpPassword = SimpleEncrypt.DecryptString(this.GetConfigValue("SmtpPassword", appValues), this.appSecrets.EncryptionKey),// SimpleEncrypt.DecryptString(GetConfigValue("SmtpPassword", appValues), _config.GetValue("EncryptionKey", "")),
            SmtpUser = this.GetConfigValue("SmtpUser", appValues),
            SmtpUseUser = this.GetConfigValue("SmtpUseUser", appValues).ToLower() == "true",
            applicationUrl = this.GetConfigValue("applicationUrl", appValues),
            SecurityEmail = this.GetConfigValue("SecurityEmail", appValues),
            //                ApiUrl = GetConfigValue("ApiUrl", configs),
            CompanyName = this.GetConfigValue("CompanyName", appValues),
            FromAddress = this.GetConfigValue("FromAddress", appValues),
            FromAddressName = this.GetConfigValue("FromAddressName", appValues),
            RegistrationRequestEmailContent = this.GetConfigValue("RegistrationRequestEmailContent", appValues),
            WelcomeEmailContent = this.GetConfigValue("WelcomeEmailContent", appValues),
            ResetPasswordEmailContent = this.GetConfigValue("ResetPasswordEmailContent", appValues),
            EmailConfirmationContent = this.GetConfigValue("EmailConfirmationContent", appValues),
            RegistrationRequestorEmailContent = this.GetConfigValue("RegistrationRequestorEmailContent", appValues),
            AllowRegistration = this.GetConfigValue("AllowRegistration", appValues).ToLower() == "true",
            AllowGuestPayment = this.GetConfigValue("AllowGuestPayment", appValues).ToLower() == "true",
            AccountNumber = this.GetConfigValue("AccountNumber", appValues).ToLower() == "true",
            InvoiceNumber = this.GetConfigValue("InvoiceNumber", appValues).ToLower() == "true",
            InvoiceAmount = this.GetConfigValue("InvoiceAmount", appValues).ToLower() == "true",

            ContactUs = this.GetConfigValue("ContactUs", appValues),
            PrivacyPolicy = this.GetConfigValue("PrivacyPolicy", appValues),
            TermsAndConditions = this.GetConfigValue("TermsAndConditions", appValues),
            isPaymentsDisable = this.GetConfigValue("isPaymentsDisable", appValues).ToLower() == "true",
            en_paymentDisableMessageText = this.GetConfigValue("en_paymentDisableMessageText", appValues),
            fr_paymentDisableMessageText = this.GetConfigValue("fr_paymentDisableMessageText", appValues),
            de_paymentDisableMessageText = this.GetConfigValue("de_paymentDisableMessageText", appValues),
            es_paymentDisableMessageText = this.GetConfigValue("es_paymentDisableMessageText", appValues),
            it_paymentDisableMessageText = this.GetConfigValue("it_paymentDisableMessageText", appValues),
            ja_paymentDisableMessageText = this.GetConfigValue("ja_paymentDisableMessageText", appValues),
            pt_paymentDisableMessageText = this.GetConfigValue("pt_paymentDisableMessageText", appValues),
            ru_paymentDisableMessageText = this.GetConfigValue("ru_paymentDisableMessageText", appValues),
            maxPaymentAllowed = this.GetConfigValue("maxPaymentAllowed", appValues),
            maxECheckPaymentAllowed = this.GetConfigValue("maxECheckPaymentAllowed", appValues),
            addressValidationOptions = this.GetConfigValue("addressValidationOptions", appValues),

        };
        return systemConfig;
    }



    private string GetConfigValue(string key, List<AppValue> configs, string defaultValue = "")
    {
        return configs.GetValueOrDefault(key) ?? defaultValue;
    }

    public async Task<EmailConfig> GetEmailTemplates(string key)
    {
        EmailConfig emailConfig = new EmailConfig { IsEnabled = true, Key = key, Templates = new Dictionary<string, EmailTemplate>() };

        var sapKey = $"EmailTemplate.{key}";
        List<AppValue> appValues = await this.repo.GetValues(true);
        IEnumerable<AppValue> configs = appValues.Where(x => x.Key.StartsWith(sapKey, StringComparison.OrdinalIgnoreCase));

        if (configs.Any())
        {
            foreach (AppValue? config in configs)
            {
                var jsonStr = this.DecodeSapSafe(config.Value);
                EmailTemplate? value = JsonConvert.DeserializeObject<EmailTemplate>(jsonStr);
                if (!string.IsNullOrEmpty(value?.Language))
                {
                    emailConfig.Templates.Add(value.Language, value);
                }
            }
        }

        return emailConfig;

    }

    public async Task UpdateEmailConfig(string key, EmailConfig config)
    {
        // Email templates are stored on desk. Save to file.
        foreach (KeyValuePair<string, EmailTemplate> entry in config.Templates)
        {
            var sapKey = $"EmailTemplate.{key}.{entry.Key}";
            this.UpdateJson(sapKey, entry.Value);
        }

    }

    public async Task<BannerConfig> GetBannerContent(string key)
    {
        BannerConfig bannerConfig;

        bannerConfig = await this.GetJson<BannerConfig>($"BannerContent.{key}");
        if (bannerConfig != null)
        {
            foreach (KeyValuePair<string, BannerContent> entry in bannerConfig?.Contents)
            {
                var path = this.GetBannerContentPath(key, entry.Key);
                entry.Value.Content = File.Exists(path) ? File.ReadAllText(path) : "";
            }
        }
        else
        {
            return null;
        }

        return bannerConfig;
    }

    public async Task UpdateBannerConfig(string language, BannerConfig config)
    {
        // Email templates are stored on desk. Save to file.
        foreach (KeyValuePair<string, BannerContent> entry in config.Contents)
        {
            var path = this.GetBannerContentPath(language, entry.Key);
            // do something with entry.Value or entry.Key
            File.WriteAllText(path, entry.Value.Content);
            entry.Value.Content = ""; // Set to empty
        }

        this.UpdateJson($"BannerContent.{language}", config);
    }




    private string GetBannerContentPath(string language, string key)
    {
        string storageDir = this.config["StorageDir"];
        string baseFileName = $"LoginPage.{key}";
        string fileName = $"{baseFileName}.{language}.html";
        string path = Path.Combine(storageDir, fileName);
        return path;
    }

    private string GetHtmlEmailPath(string key, string language)
    {
        string storageDir = this.config["StorageDir"];
        string baseFileName = $"EmailTemplate.{key}";
        string fileName = $"{baseFileName}.{language}.html";
        string path = Path.Combine(storageDir, fileName);
        return path;
    }


    public async Task<T> GetJson<T>(string key)
    {
        List<AppValue> appValues = await this.repo.GetValues(true);
        var jsonStr = this.DecodeSapSafe(this.GetConfigValue(key, appValues));
        T? value = JsonConvert.DeserializeObject<T>(jsonStr);
        return value;
    }

    public async Task UpdateJson<T>(string key, T value)
    {
        var valueJson = JsonConvert.SerializeObject(value);
        valueJson = this.EncodeSapSafe(valueJson);
        await this.repo.UpdateAppValue(key, valueJson);
    }

    /// <summary>
    /// SAPI messes up if there is JSON characters in a string. We use this "encoding" to avoid problems.
    /// </summary>
    /// <param name="value"></param>
    /// <returns></returns>
    private string EncodeSapSafe(string value)
    {
        value = HttpUtility.UrlEncode(value);
        value = value.Replace("\\n", "___n___");
        value = value.Replace("\\r", "___r___");
        value = value.Replace("\\t", "___t___");
        return value;
    }

    private string DecodeSapSafe(string value)
    {
        value = value.Replace("___n___", "\\n");
        value = value.Replace("___r___", "\\r");
        value = value.Replace("___t___", "\\t");
        value = HttpUtility.UrlDecode(value);
        return value;
    }
}
