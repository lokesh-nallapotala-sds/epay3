using Newtonsoft.Json;
using System.ComponentModel.DataAnnotations;

namespace Epay3Service.Models
{
    class AutoPayEnrollmentRequest
    {
        [JsonProperty("payer_data")]
        public PayerData PayerData { get; set; }

        [JsonProperty("enrolled")]
        public bool Enrolled { get; set; }

        [JsonProperty("payment_method")]
        public string PaymentMethod { get; set; }

        [JsonProperty("payment_card_token")]
        [MaxLength(256)]
        public string? PaymentCardToken { get; set; }

        [JsonProperty("log")]
        public TraceLog? Log { get; set; }

        //for impersonation
        [JsonIgnore]
        public string? UserId { get; set; }
    }
}
