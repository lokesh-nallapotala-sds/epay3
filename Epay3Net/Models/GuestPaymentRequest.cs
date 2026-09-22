using Epay3Service.Models;
using System.ComponentModel.DataAnnotations;

namespace Epay3Net.Models;

public class GuestPaymentRequest
{
    [Required]
    public PayerData Payer { get; set; } = null!;
    [Required]
    public PaymentDetail Payment { get; set; } = null!;

    [Required]
    public SoldToPayment SoldTo { get; set; } = null!;

    [Required]
    public List<PaymentInvoice> Invoices { get; set; } = null!;

    public string? GuestUserEmail { get; set; }

    [MaxLength(2048)]
    public string? ThreeDSAccessToken { get; set; }

    public CardinalData? CardinalData { get; set; }
    
    [MaxLength(256)]
    public string? VRef { get; set; }
}
