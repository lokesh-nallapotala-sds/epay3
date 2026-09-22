
using System.ComponentModel.DataAnnotations;

namespace Epay3Service.Configuration;

public class SapKeys {
    [Required]
    public List<SapUrl>? SapUrls { get; set; }

    public string? GetUrl(string key) => this.SapUrls?.FirstOrDefault(s => s.Key == key)?.Path;
}

public class SapUrl {
    [Required(AllowEmptyStrings = false)]
    public string? Key { get; set; }

    [Required(AllowEmptyStrings = false)]
    public string? Path { get; set; }
}
