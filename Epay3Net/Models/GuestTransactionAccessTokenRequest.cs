using System.ComponentModel.DataAnnotations;
using Epay3Service.Models;

namespace Epay3Net.Models;

public class GuestTransactionAccessTokenRequest
{
    [Required]
    public PayerData Payer { get; set; } = null!;

    [Required]
    public PaymentDetail Payment { get; set; } = null!;

    public CompanyAddress? BillingAddress { get; set; }

    [Required]
    public decimal Amount { get; set; }

    [Required]
    public string Currency { get; set; } = string.Empty;

    [Required]
    public string RedirectUri { get; set; } = string.Empty;

    public string? GuestUserEmail { get; set; }
}
