using Newtonsoft.Json;


namespace Epay3Service.Models;

public class SalesData
{
    [JsonProperty("data")]
    public SalesArea? SalesArea { get; set; }

    [JsonProperty("partner")]
    public List<Partner> Partners { get; set; } = new List<Partner>();
}
