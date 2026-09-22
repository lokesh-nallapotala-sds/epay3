using Newtonsoft.Json;

namespace Epay3Service.Models;

public class InvoiceDetailResponse
{
    [JsonProperty("detail")]
    public InvoiceDetail? Detail { get; set; }

    [JsonProperty("status")]
    public InvoiceStatus? Status { get; set; }
}

public class InvoiceStatus
{
    [JsonProperty("message_type")]
    public string? MessageType { get; set; }

    [JsonProperty("message_identification")]
    public string? MessageIdentification { get; set; }

    [JsonProperty("message_number")]
    public long? MessageNumber { get; set; }

    [JsonProperty("message_line_string")]
    public string? MessageLineString { get; set; }
}
