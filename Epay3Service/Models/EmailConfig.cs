using Newtonsoft.Json;

namespace Epay3Service.Models;

public partial class EmailConfigRequest
{
    public string? SmtpAddress { set; get; }
    public string? SmtpPort { set; get; }
    public bool SmtpUseUser { set; get; }
    public string SmtpUser { set; get; }
    public string SmtpPassword { set; get; }
    public string RegistrationRequestEmail { set; get; }
    public string OverrideEmail { set; get; }
    public string SecurityEmail { set; get; }
    public string FromAddress { get; set; }
    public string FromAddressName { get; set; }
    public string RegistrationRequestEmailContent { set; get; }
    public string WelcomeEmailContent { get; set; }
    public string ResetPasswordEmailContent { get; set; }
    public string EmailConfirmationContent { get; set; }
    public string? applicationUrl { get; set; }
    public string? companyName { get; set; }
    public bool HasPassword { get; set; }
}

public partial class EmailConfigRequest
{
    public static EmailConfigRequest FromJson(string json) => JsonConvert.DeserializeObject<EmailConfigRequest>(json, Converter.Settings);
}

public class EmailConfig
{
    public bool IsEnabled { get; set; } = false;
    public string Key { get; set; } = "";
    public Dictionary<string, EmailTemplate> Templates { get; set; } = new Dictionary<string, EmailTemplate>();
    public List<string>? MissingKeys { get; set; }
}
public class EmailTemplateHealthCheck
{
    public bool HasMissingTemplates { get; set; }
    public List<string> MissingKeys { get; set; } = new();
}

public class EmailTemplate
{
    public string Language { get; set; } = "";
    public string Email { get; set; } = "";
    public string Title { get; set; } = "";
}


public class BannerConfig
{
    public string Key { get; set; } = "";
    public Dictionary<string, BannerContent> Contents { get; set; } = new Dictionary<string, BannerContent>();
}

public class BannerContent
{
    public string Content { get; set; } = "";
}
