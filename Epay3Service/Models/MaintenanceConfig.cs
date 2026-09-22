namespace Epay3Service.Models;

public class MaintenanceConfigRequest
{
    public bool IsSignInDisable { get; set; }
    public DateTimeOffset FromDateLocal { get; set; }
    public DateTimeOffset ToDateLocal { get; set; }
    public string? MaintenanceUrl { get; set; }

    // Specifies the selected language for notifications
    public string? NotificationLanguage { get; set; }
    // Stores notification text for multiple languages
    public Dictionary<string, string>? NotificationText { get; set; }
}
