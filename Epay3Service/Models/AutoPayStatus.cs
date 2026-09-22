using Newtonsoft.Json;

namespace Epay3Service.Models
{
    public class AutoPayStatus
    {
        [JsonProperty("company_code")]
        public string CompanyCode { get; set; }

        [JsonProperty("enrolled")]
        public bool Enrolled { get; set; }

        [JsonProperty("payment_method")]
        public string PaymentMethod { get; set; }

        [JsonProperty("payment_card_token")]
        public string PaymentCardToken { get; set; }

        [JsonProperty("last_four")]
        public string? CardLast4Digit { get; set; }
    }
}
