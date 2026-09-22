using Newtonsoft.Json;
using System.ComponentModel.DataAnnotations;

namespace Epay3Net.Models;

public class InvoicePdfDownloadRequest
{
    [Required]
    public string DocumentNumber { get; set; } = null!;
    [Required]
    public string CustomerNumber { get; set; } = null!;
    [Required]
    public string PrimaryAccount { get; set; } = null!;
    public string? CompanyCode { get; set; }
    public string? UserId { get; set; } = null;  //for impersonation
}
