using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace Epay3Service.Models
{
    public class DeleteSchedulePaymentRequest
    {
        [Required]
        [JsonProperty("scheduled_id")]
        public string ScheduleId { get; set; } = null!;

        [Required]
        [JsonProperty("payer_data")]
        public PayerData PayerData { get; set; } = null!;
      
    }
}
