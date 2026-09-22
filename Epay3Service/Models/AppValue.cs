using Newtonsoft.Json;

namespace Epay3Service.Models;

public class AppValue
{
    [JsonProperty("key_au")]
    public string Key { get; set; } = string.Empty;

    [JsonProperty("value_au")]
    public string? Value { get; set; }
}

