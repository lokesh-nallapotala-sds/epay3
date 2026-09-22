using Epay3Service.Models;

namespace Epay3Service.Managers.Interfaces;

public interface ISystemConfigService
{
    Task<SystemConfiguration> GetConfig(bool refresh = false);
    Task<EmailConfig> GetEmailTemplates(string key);
    Task UpdateEmailConfig(string key, EmailConfig config);
    Task<BannerConfig> GetBannerContent(string key);
    Task UpdateBannerConfig(string language, BannerConfig config);
    Task<T> GetJson<T>(string key);
    Task UpdateJson<T>(string key, T value);
}
