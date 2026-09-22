using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Epay3Net.Models
{
    public class DeleteScheduledPaymentRequest
    {
        [Required]
        public string ScheduleId { get; set; } = null!;

        [Required]
        public string CustomerNumber { get; set; } = null!;

        [Required]
        public string CompanyCode { get; set; } = null!;

        [Required]
        public string Payer { get; set; } = null!;

        public string? UserId { get; set; }
    }
}
