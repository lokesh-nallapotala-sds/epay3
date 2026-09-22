using Newtonsoft.Json;

namespace Epay3Service.Models;

public class SoldTo
{
    [JsonProperty("customer_number")]
    public string? CustomerNumber { get; set; }

    [JsonProperty("sales_area_data")]
    public SalesArea? SalesArea { get; set; }

    [JsonProperty("address_data")]
    public CompanyAddress? Address { get; set; }

}
