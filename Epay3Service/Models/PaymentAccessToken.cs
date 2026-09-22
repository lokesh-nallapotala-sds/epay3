
using Newtonsoft.Json;

namespace Epay3Service.Models;

public class PaymentAccessToken
{
    [JsonProperty("merchant_guid")]
    public string? MerchantId { get; set; }
    [JsonProperty("access_token")]
    public string? AccessToken { get; set; }
    [JsonProperty("paymetric_xi_url")]
    public string? PaymetricUrl { get; set; }
    [JsonProperty("v_ref")]
    public string? VRef { get; set; }
}
