namespace Epay3Service.DTOs;

/// <summary>
/// Request body for creating a Stripe refund via Salesforce middleware.
/// </summary>
public class StripeRefundRequest
{
    /// <summary>
    /// Stripe PaymentIntent ID to refund against.
    /// Format: pi_XXXXXXXXXX.
    /// </summary>
    public string PaymentIntentId { get; set; } = string.Empty;

    /// <summary>
    /// Amount to refund in standard currency units (e.g. 50.00 for $50.00).
    /// When null, a full refund is issued.
    /// </summary>
    public decimal? Amount { get; set; }

    /// <summary>
    /// ISO 4217 currency code. Required when <see cref="Amount"/> is specified.
    /// Example: "USD".
    /// </summary>
    public string? CurrencyCode { get; set; }
}
