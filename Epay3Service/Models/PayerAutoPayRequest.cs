using Newtonsoft.Json;

namespace Epay3Service.Models;

public class PayerAutoPayRequest
{
    [JsonProperty("payer_data")]
    public PayerData PayerData { get; set; }

    [JsonProperty("enrolled")]
    public bool Enrolled { get; set; }

    [JsonProperty("payment_method")]
    public string PaymentMethod { get; set; }

    [JsonProperty("payment_cards")]
    public List<PaymentCard> PaymentCards { get; set; } = new List<PaymentCard>();

    [JsonProperty("log")]
    public TraceLog? Log { get; set; }

    //for impersonation
    [JsonProperty("userId")]
    public string? UserId { get; set; }
}