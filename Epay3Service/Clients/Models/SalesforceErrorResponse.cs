using Newtonsoft.Json;

namespace Epay3Service.Clients.Models;

public class SalesforceErrorResponse
{
    [JsonProperty("message")]
    public string? Message { get; set; }

    [JsonProperty("errorCode")]
    public string? ErrorCode { get; set; }

    [JsonProperty("fields")]
    public List<string>? Fields { get; set; }

    [JsonProperty("error")]
    public string? Error { get; set; }

    [JsonProperty("error_description")]
    public string? ErrorDescription { get; set; }

    public override string ToString()
    {
        if (!string.IsNullOrWhiteSpace(this.ErrorCode) || !string.IsNullOrWhiteSpace(this.Message))
        {
            return $"[{this.ErrorCode}] {this.Message}";
        }

        if (!string.IsNullOrWhiteSpace(this.Error) || !string.IsNullOrWhiteSpace(this.ErrorDescription))
        {
            return $"[{this.Error}] {this.ErrorDescription}";
        }

        return base.ToString() ?? string.Empty;
    }
}
