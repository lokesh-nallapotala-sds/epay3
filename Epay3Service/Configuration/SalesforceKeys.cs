using System.ComponentModel.DataAnnotations;

namespace Epay3Service.Configuration;

public class SalesforceKeys {
    [Required]
    public List<SalesforceUrl>? SalesforceUrls { get; set; }

    public string? GetUrl(string key) => this.SalesforceUrls?.FirstOrDefault(s => s.Key == key)?.Path;
}

public class SalesforceUrl {
    [Required(AllowEmptyStrings = false)]
    public string? Key { get; set; }

    [Required(AllowEmptyStrings = false)]
    public string? Path { get; set; }
}
