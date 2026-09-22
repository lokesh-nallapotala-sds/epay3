using Newtonsoft.Json;

namespace Epay3Service.Models;

public class CompanyAddress
{
    [JsonProperty("name")]
    public string? Name { get; set; }

    [JsonProperty("name_2")]
    public string? Name2 { get; set; }

    [JsonProperty("name_3")]
    public string? Name3 { get; set; }

    [JsonProperty("name_4")]
    public string? Name4 { get; set; }

    [JsonProperty("city")]
    public string? City { get; set; }

    [JsonProperty("district")]
    public string? District { get; set; }

    [JsonProperty("street")]
    public string? Street { get; set; }

    [JsonProperty("postal_code_city")]
    public string? PostalCodeCity { get; set; }

    [JsonProperty("region")]
    public string? Region { get; set; }

    [JsonProperty("country")]
    public string? Country { get; set; }
}
