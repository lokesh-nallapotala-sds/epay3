namespace Epay3Service.Models;

// Epay3Service.Clients.Models.SapHttpStatus minus the [JsonProperty] decorations
public class SapStatus
{
    public string? MessageType { get; set; }

    public string? Identifiaction { get; set; }

    public int Number { get; set; }

    public string? Line { get; set; }
}
