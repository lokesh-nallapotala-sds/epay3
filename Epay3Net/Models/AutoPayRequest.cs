using System.ComponentModel.DataAnnotations;

namespace Epay3Net.Models
{
    public class AutoPayRequest
    {
        [Required]
        public bool IsAutoPayEnrolled { get; set; }

        [Required]
        public string AccountId { get; set; }
    }
}
