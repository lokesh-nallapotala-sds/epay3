using Newtonsoft.Json;

namespace Epay3Service.Models;
public class CompanyDataWrapper
{
    [JsonProperty("data")]
    public CompanyData? Data { get; set; }
}

public class CompanyData
{
    [JsonProperty("company_code")]
    public string? CompanyCode { get; set; }
}
