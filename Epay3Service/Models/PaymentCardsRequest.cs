using Newtonsoft.Json;

namespace Epay3Service.Models;

public class PaymentCardsRequest
{
    [JsonProperty("payer_data")]
    public PayerData PayerData { get; set; }

    [JsonProperty("address_data")]
    public SapPaymentCardAddressData? AddressData { get; set; }

    [JsonProperty("action")]
    public string? Action { get; set; }

    [JsonProperty("payment_cards")]
    public List<PaymentCard> PaymentCards { get; set; } = new List<PaymentCard>();

    [JsonProperty("log")]
    public TraceLog? Log { get; set; }

    //for impersonation
    [JsonProperty("userId")]
    public string? UserId { get; set; }

    public string? VRef { get; set; }
}
