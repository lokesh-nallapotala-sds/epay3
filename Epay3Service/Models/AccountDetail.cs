using Newtonsoft.Json;


namespace Epay3Service.Models;

public class AccountDetail
{
    [JsonProperty("address_data")]
    public CompanyAddress? AddressData { get; set; }

    [JsonProperty("soldto_list")]
    public List<SoldTo>? SoldToList { get; set; }

    [JsonProperty("sales_data")]
    public List<SalesData>? SalesData { get; set; }
}
