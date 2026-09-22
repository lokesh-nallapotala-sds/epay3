using Newtonsoft.Json;

namespace Epay3Service.Models;

public partial class SapDepositRequest
{
    [JsonProperty("payer_data")]
    public PayerData PayerData { get; set; }

    [JsonProperty("payment_detail")]
    public PaymentDetail PaymentDetail { get; set; }

    [JsonProperty("deposit_detail")]
    public DepositDetail DepositDetail { get; set; }

    [JsonProperty("log")]
    public TraceLog Log { get; set; }
}

public partial class DepositDetail
{
    [JsonProperty("amount_to_process")]
    public double AmountToProcess { get; set; }

    [JsonProperty("currency_key")]
    public string CurrencyKey { get; set; }

    [JsonProperty("reason_code")]
    public string? ReasonCode { get; set; }

    [JsonProperty("reference_number")]
    public string? ReferenceNumber { get; set; }

    [JsonProperty("comment")]
    public string? Comment { get; set; }
}