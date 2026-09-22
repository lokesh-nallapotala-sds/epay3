using Newtonsoft.Json;

namespace Epay3Service.Models;

public class AccessTokenResponse
{
    [JsonProperty("cardinal")]
    public CardinalData? CardinalData { get; set; }
}

public class CardinalData
{
    [JsonProperty("threedsversion")]
    public string? Secure3DSVersion { get; set; }

    [JsonProperty("three-ds-version")]
    private string? Secure3DSVersionAlias { set { Secure3DSVersion = value; } }

    [JsonProperty("secure3DSVersion")]
    private string? Secure3DSVersionAlias2 { set { Secure3DSVersion = value; } }

    [JsonProperty("enrolled")]
    public string? Enrolled { get; set; }

    [JsonProperty("eciflg")]
    public string? EciFlag { get; set; }

    [JsonProperty("eci")]
    private string? EciFlagAlias { set { EciFlag = value; } }

    [JsonProperty("eciFlag")]
    private string? EciFlagAlias2 { set { EciFlag = value; } }

    [JsonProperty("transactionid")]
    public string? TransactionId { get; set; }

    [JsonProperty("dstransactionid")]
    private string? TransactionIdAlias { set { TransactionId = value; } }

    [JsonProperty("transactionId")]
    private string? TransactionIdAlias2 { set { TransactionId = value; } }

    [JsonProperty("cavv")]
    public string? Cavv { get; set; }

    [JsonProperty("v_cavv")]
    private string? CavvAlias { set { Cavv = value; } }

    [JsonProperty("paresstatus")]
    public string? ParesStatus { get; set; }

    [JsonProperty("v_pares_status")]
    private string? ParesStatusAlias { set { ParesStatus = value; } }

    [JsonProperty("paresStatus")]
    private string? ParesStatusAlias2 { set { ParesStatus = value; } }

    [JsonProperty("status")]
    private string? StatusAlias { set { ParesStatus = value; } }

    [JsonProperty("v_status")]
    private string? VStatusAlias { set { ParesStatus = value; } }
}