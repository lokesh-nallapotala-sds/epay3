using Epay3Service.Models;
using System.ComponentModel.DataAnnotations;


namespace Epay3Net.Models;

public class PaymentRequest
{
  [Required]
  public string SelectedAccount { get; set; } = null!;
  public string? CompanyCode { get; set; }
  [Required]
  public string Payer { get; set; } = null!;
  public string? SoldTo { get; set; }

  [Required]
  public List<PaymentInvoice> Invoices { get; set; } = null!;

  public CardinalData? CardinalData { get; set; }
  [Required]
  public PaymentMethod? PaymentMethod { get; set; }
  [MaxLength(4)]
  public string? Cvv { get; set; }

  [MaxLength(2048)]
  public string? ThreeDSAccessToken { get; set; }

  public string? UserId { get; set; }  //for impersonation

  public string? ScheduledDate { get; set; } 
  
  [MaxLength(256)]
  public string? VRef { get; set; }
}
