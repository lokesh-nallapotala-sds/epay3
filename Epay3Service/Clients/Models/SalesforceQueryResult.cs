using Newtonsoft.Json;

namespace Epay3Service.Clients.Models;

public class SalesforceQueryResult<T> where T : class
{
    [JsonProperty("totalSize")]
    public int TotalSize { get; set; }

    [JsonProperty("done")]
    public bool Done { get; set; }

    [JsonProperty("nextRecordsUrl")]
    public string? NextRecordsUrl { get; set; }

    [JsonProperty("records")]
    public List<T> Records { get; set; } = new();
}
