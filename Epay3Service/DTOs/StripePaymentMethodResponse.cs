namespace Epay3Service.DTOs;

/// <summary>
/// Response from attaching/saving a Stripe PaymentMethod via Salesforce.
/// </summary>
public class StripePaymentMethodResponse
{
    public bool Success { get; set; }
    public string? PaymentMethodId { get; set; }
    public string? CustomerId { get; set; }
    public string? SalesforcePaymentMethodId { get; set; }
    public string? Message { get; set; }
}
