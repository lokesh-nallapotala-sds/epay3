using Epay3Service.Models;
using Epay3Service.Models.ConfigRequest;

namespace Epay3Service.Managers.Interfaces;

public interface IApplicationConfigurationManager
{
    public Task<bool> ArePaymentsDisabled();

    public string GetLanguageFile(string language);

    public Task<ApplicationConfiguration> GetApplicationConfig(bool isRefresh = false);
    public Task<ThemeConfig[]> GetThemeConfig(string language = "en");
    public Task<ThemeConfig[]> updateThemeConfig(ThemeConfig[] request, string language = "en");
    public Task<ThemeConfig[]> deleteThemeConfig(ThemeConfig[] request, string language = "en");
    //Task<ThemeConfiguration> GetThemeConfig(string language = "en");

    public Task<ApplicationConfigRequest> UpdateApplicationConfig(ApplicationConfigRequest request, string language = "en");

    public Task<SapCustomData?> GetCustomConfig(string language = "en", bool isRefresh = false);

    public Task<EmailConfigRequest> GetSmtpConfig(string language = "en");

    public Task<EmailConfigRequest> UpdateEmailConfig(EmailConfigRequest request, string language = "en");

    public Task<PaymentConfiguration> GetPaymentConfig(string language = "en");

    public Task<List<PaymentReasonCodeInfo>?> GetPaymentReasonCodes(string language = "en");

    public Task<List<PaymentCardInfo>?> GetPaymentCards(string language = "en");

    public Task<EmailConfig?> GetEmailTemplates(string language = "en");
    public Task<EmailTemplateHealthCheck?> CheckEmailTemplates(string language = "en");
    
    public Task<bool> UpdateEmailTemplate(string key, EmailConfig config, string language = "en");
    public Task<MaintenanceConfigRequest> UpdateMaintenanceConfig(MaintenanceConfigRequest request, string language = "en");
    public Task<SystemConfig> UpdateSystemConfig(SystemConfig request, string language = "en");

    public Task<MaintenanceConfigRequest> GetMaintenanceConfig(string language = "en");

    public Task<HelpConfigRequest> GetHelpConfig(string language = "en");
    public Task<HelpConfigRequest> UpdateHelpConfig(HelpConfigRequest request, string language = "en");

    public Task<ThemeConfig> GetThemeForUrl(string url);

    Task<List<AppValue>> GetValues(bool refresh = false);
    Task UpdateAppValue(string key, string? value, string language = "en");
}