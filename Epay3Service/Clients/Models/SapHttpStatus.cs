using Newtonsoft.Json;

namespace Epay3Service.Clients.Models;

public class SapHttpStatus
{

    [JsonProperty("message_type")]
    public string? MessageType { get; set; }

    [JsonProperty("message_identification")]
    public string? Identifiaction { get; set; }

    [JsonProperty("message_number")]
    public int Number { get; set; }

    [JsonProperty("message_line_string")]
    public string? Line { get; set; }
}
