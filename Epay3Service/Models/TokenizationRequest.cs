using Newtonsoft.Json;

namespace Epay3Service.Models;

public class TokenizationRequest
{
    [JsonProperty("action")]
    public string Action { get; set; }

    [JsonProperty("access_token")]
    public string AccessToken { get; set; }
}