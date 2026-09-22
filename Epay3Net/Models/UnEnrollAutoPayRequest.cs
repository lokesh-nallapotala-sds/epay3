using System.ComponentModel.DataAnnotations;

namespace Epay3Net.Models;

public class UnEnrollAutoPayRequest
{
    [Required]
    public string SelectedAccount { get; set; }

    [Required]
    public string Payer { get; set; }

    [Required]
    public string CompanyCode { get; set; }

    public string? UserId { get; set; }
}
