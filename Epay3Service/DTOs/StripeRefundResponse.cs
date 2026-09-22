namespace Epay3Service.DTOs;

/// <summary>
/// Response returned by Salesforce after creating a Stripe refund.
/// </summary>
public class StripeRefundResponse
{
    /// <summary>
    /// Stripe Refund ID. Format: re_XXXXXXXXXX.
    /// </summary>
    public string? RefundId { get; set; }

    /// <summary>
    /// The PaymentIntent ID that was refunded.
    /// </summary>
    public string? PaymentIntentId { get; set; }

    /// <summary>
    /// Amount refunded in Stripe's smallest currency unit (e.g. cents for USD).
    /// Example: 5000 = $50.00 USD.
    /// </summary>
    public int? Amount { get; set; }

    /// <summary>
    /// Lowercase ISO currency code. Example: "usd".
    /// </summary>
    public string? CurrencyCode { get; set; }

    /// <summary>
    /// Stripe refund status. Expected: "succeeded", "pending", or "failed".
    /// </summary>
    public string? Status { get; set; }

    /// <summary>
    /// Reason for the refund (if provided). Example: "duplicate", "fraudulent".
    /// </summary>
    public string? Reason { get; set; }
}
