using Newtonsoft.Json;
using System.ComponentModel.DataAnnotations;

namespace Epay3Net.Models;

public class EnableAutoPayCardRequest
{
    [Required]
    public string SelectedAccount { get; set; }

    [Required]
    public string Payer { get; set; }

    [Required]
    public string CompanyCode { get; set; }

    [Required]
    [MaxLength(256)]
    public string CardToken { get; set; }

    public string? UserId { get; set; }

    public bool? isAutoPayEnrolled { get; set; }
}
