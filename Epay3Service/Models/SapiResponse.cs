using Newtonsoft.Json;

namespace Epay3Service.Models;

public class SapiActionRequestBody<T>
{
    [JsonProperty("data")]
    public T Data { get; set; }

    [JsonProperty("action")]
    public string Action { get; set; }
}

public class SapiResponseBody<T>
{
    [JsonProperty("Data")]
    public T Data { get; set; }

    [JsonProperty("status")]
    public SapiStatus Status { get; set; }
}
public class SapiStatus
{
    [JsonProperty("msgty")]
    public string Status { get; set; }

    [JsonProperty("msgid")]
    public string MessageId { get; set; }

    [JsonProperty("msgno")]
    public string MessageNumber { get; set; }

    [JsonProperty("msgln")]
    public string MessageLanguage { get; set; }

    [JsonProperty("json")]
    public dynamic Json { get; set; }
}
