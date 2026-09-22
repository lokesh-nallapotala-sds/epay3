using System.ComponentModel.DataAnnotations;

namespace Epay3Service.Configuration;

public class SalesforceConfiguration
{
    [Required(AllowEmptyStrings = false)]
    public string InstanceUrl { get; set; } = string.Empty;

    [Required(AllowEmptyStrings = false)]
    public string TokenUrl { get; set; } = "https://orgfarm-3ff9cf6103-dev-ed.develop.my.salesforce.com/services/oauth2/token";

    [Required(AllowEmptyStrings = false)]
    public string ClientId { get; set; } = string.Empty;

    [Required(AllowEmptyStrings = false)]
    public string ClientSecret { get; set; } = string.Empty;

    public string ApiVersion { get; set; } = "v59.0";

    public string? Username { get; set; }

    public string? Password { get; set; }

    public string? SecurityToken { get; set; }

    public int TimeoutSeconds { get; set; } = 30;
}
