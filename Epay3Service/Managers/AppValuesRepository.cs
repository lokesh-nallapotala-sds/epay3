using AutoMapper;
using Epay3Service.Clients.Interfaces;
using Epay3Service.Configuration;
using Epay3Service.Custom.Attributes;
using Epay3Service.Extensions;
using Epay3Service.Helpers;
using Epay3Service.Models;
using Epay3Service.Models.ConfigRequest;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using System.Reflection;

namespace Epay3Service.Managers;

public class AppValuesRepository(
    ISapHttpClient sapHttpClient,
    IMapper mapper,
    ILogger<ApplicationConfigurationManager> logger,
    ApplicationSecrets appSecrets
    )
{
    private readonly ISapHttpClient sapHttpClient = sapHttpClient;
    private readonly IMapper mapper = mapper;
    private readonly ILogger<ApplicationConfigurationManager> logger = logger;
    private List<AppValue> appValues = new();
    private SapCustomData? customData = null;
    private readonly ApplicationSecrets appSecrets = appSecrets;

    public async Task<bool> ArePaymentsDisabled()
    {
        List<AppValue> values = await this.GetValues();
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

    public async Task<ApplicationConfiguration> GetApplicationConfig(string language = "en")
    {
        List<AppValue> values = await this.GetValues();

        ApplicationConfiguration config = this.Bind<ApplicationConfiguration>(values);

        return config;
    }

    // consider making the custom data interface more granular, i.e. separate endpoints for sales orgs, payment methods, etc.
    // that way we can enforce access policy on particular endpoints.
    public async Task<SapCustomData?> GetCustomConfig(string language = "en")
    {
        if (this.customData == null)
        {
            //NOTE: the try is only to catch potential mapping errors - should eventually be removed
            try
            {
                Clients.Models.SapHttpData<DTOs.SapCustomData?> response = await this.sapHttpClient.Get<DTOs.SapCustomData>("CNBS_CUSTOM_DATA_URL", null, language, false);

                this.customData = this.mapper.Map<SapCustomData>(response.Data);
            }
            catch (Exception ex)
            {
                this.logger.LogError(ex.Message);
            }
        }

        return this.customData;
    }

    public async Task<PaymentConfiguration> GetPaymentConfig(string language = "en")
    {
        List<AppValue> values = await this.GetValues();

        PaymentConfiguration config = this.Bind<PaymentConfiguration>(values);

        return config;
    }

    //TODO: this just returns the same data as GetCustomConfig().
    // we should either:
    // + pull the payment data out and return (only) that, or
    // + let the callers (controllers) use GetCustomConfig() and be responsible
    //   for extracting what they want - and remove this method.
    public async Task<List<PaymentReasonCodeInfo>?> GetPaymentReasonCodes(string language = "en")
    {
        if (this.customData == null)
        {
            SapCustomData? data = await this.GetCustomConfig(language);
            return data.PaymentReasonCodes;
        }
        else
        {
            return this.customData.PaymentReasonCodes ?? new List<PaymentReasonCodeInfo>();
        }
    }

    public async Task<List<PaymentCardInfo>?> GetPaymentCards(string language = "en")
    {
        if (this.customData == null)
        {
            SapCustomData? data = await this.GetCustomConfig(language);
            return data?.PaymentCards;
        }
        else
        {
            return this.customData.PaymentCards ?? new List<PaymentCardInfo>();
        }
    }

    public async Task<List<AppValue>> GetValues(bool refresh = false)
    {
        if (this.appValues == null || this.appValues.Count == 0 || refresh)
        {
            Clients.Models.SapHttpData<List<AppValue>?> response = await this.sapHttpClient.Get<List<AppValue>>("CNBS_GET_APP_VALUES", null);

            this.appValues = response?.Data ?? new List<AppValue>();
        }

        return this.appValues;
    }

    private T Bind<T>(List<AppValue> appValues) where T : new()
    {
        PropertyInfo[] properties = typeof(T).GetProperties();
        var obj = new T();

        foreach (PropertyInfo property in properties)
        {
            ApplicationValueAttribute? attribute = property.GetCustomAttribute<ApplicationValueAttribute>();

            if (attribute != null)
            {
                AppValue? appValue = appValues.SingleOrDefault(x => x.Key == attribute.AppValueName);
                if (appValue != null && !string.IsNullOrEmpty(appValue.Value) && property.CanWrite)
                {
                    property.SetValue(obj, Convert.ChangeType(appValue.Value, property.PropertyType), null);
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
                    var appValue = SimpleEncrypt.DecryptString(passValue, this.appSecrets.EncryptionKey);
                    if (appValue != null && !string.IsNullOrEmpty(appValue) && property.CanWrite)
                    {
                        property.SetValue(obj, Convert.ChangeType(appValue, property.PropertyType), null);
                    }
                }
            }
            else
            {
                AppValue? appValue = appValues.SingleOrDefault(x => x.Key == property.Name);
                if (appValue != null && !string.IsNullOrEmpty(appValue.Value) && property.CanWrite)
                {
                    property.SetValue(obj, Convert.ChangeType(appValue.Value, property.PropertyType), null);
                }
            }
        }

        return obj;
    }

    public async Task<EmailConfigRequest> GetSmtpConfig(string language = "en")
    {
        List<AppValue> values = await this.GetValues();

        if (values.Count == 0)
        {
            return new EmailConfigRequest();
        }

        EmailConfigRequest config = this.BindWithOutAttributes<EmailConfigRequest>(values);
        return config;
    }

    public async Task<ApplicationConfiguration> UpdateApplicationConfig(ApplicationConfigRequest requestConfig, string language = "en")
    {
        foreach (PropertyInfo property in requestConfig.GetType().GetProperties())
        {
            await this.UpdateAppValue(property.Name, property?.GetValue(requestConfig, null)?.ToString(), language);
        }

        List<AppValue> values = await this.GetValues();

        ApplicationConfiguration config = this.Bind<ApplicationConfiguration>(values);

        return config;
    }

    public async Task<EmailConfigRequest> UpdateEmailConfig(EmailConfigRequest requestConfig, string language = "en")
    {
        foreach (PropertyInfo property in requestConfig.GetType().GetProperties())
        {
            if (property.Name == "SmtpPassword")
            {
                var value = requestConfig.SmtpPassword;
                if (!String.IsNullOrEmpty(value))
                {
                    value = SimpleEncrypt.EncryptString(value, this.appSecrets.EncryptionKey);
                    await this.UpdateAppValue(property.Name, value, language);
                }
            }
            else
            {
                await this.UpdateAppValue(property.Name, property?.GetValue(requestConfig, null)?.ToString(), language);
            }
        }

        List<AppValue> values = await this.GetValues(true);

        EmailConfigRequest config = this.BindWithOutAttributes<EmailConfigRequest>(values);

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
            await this.UpdateAppValue(sapKey, valueJson, language);
        }
        return true;
    }

    public async Task UpdateAppValue(string key, string? value, string language = "en")
    {
        await this.GetValues();
        if (this.appValues.FirstOrDefault(v => v.Key.Equals(key)) != null)
        {
            await this.AppValueAction(new AppValue
            {
                Key = key,
                Value = value,
            }, "modify", language);
        }
        else
        {
            await this.AppValueAction(new AppValue
            {
                Key = key,
                Value = value,
            }, "create", language);
        }
    }

    public async Task<EmailConfig> GetEmailTemplates(string key)
    {
        EmailConfig emailConfig = new EmailConfig { IsEnabled = true, Key = key, Templates = new Dictionary<string, EmailTemplate>() };

        var sapKey = $"EmailTemplate.{key}";
        List<AppValue> appValues = await this.GetValues(true);
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

    public async Task AppValueAction(AppValue appValue, string action, string language)
    {
        Clients.Models.SapHttpData<SapiResponseBody<AppValue>?> response = await this.sapHttpClient.Post<SapiResponseBody<AppValue>>("CNBS_GET_APP_VALUES_ACTION", null,
            new SapiActionRequestBody<AppValue> { Data = appValue, Action = action }, language, true
           );
    }
}
