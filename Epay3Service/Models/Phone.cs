

using Newtonsoft.Json;

namespace Epay3Service.Models;

public class Phone
{
    [JsonProperty("country_code")]
    public string? CountryCode { get; set; }

    [JsonProperty("standard")]
    public string? Standard { get; set; }

    [JsonProperty("telephone")]
    public string? Telephone { get; set; }
}
