namespace Epay3Service.DTOs;

/// <summary>
/// Request body sent by the browser (via .NET) to Salesforce
/// for creating a Stripe PaymentIntent.
///
/// IMPORTANT: This DTO must NEVER contain card numbers, CVV, or expiry dates.
/// Those are handled exclusively by Stripe.js in the browser.
/// </summary>
public class StripePaymentIntentRequest
{
    /// <summary>
    /// Payment amount in standard currency units.
    /// Example: 250.00 for $250.00 USD.
    /// </summary>
    public decimal Amount { get; set; }

    /// <summary>
    /// ISO 4217 currency code.
    /// Example: "USD", "EUR", "GBP".
    /// Defaults to "USD" when null or empty.
    /// </summary>
    public string CurrencyCode { get; set; } = "USD";

    /// <summary>
    /// Customer display name — stored in Stripe PaymentIntent metadata.
    /// Optional but recommended for reconciliation in the Stripe Dashboard.
    /// </summary>
    public string? CustomerName { get; set; }

    /// <summary>
    /// Customer email — stored in Stripe PaymentIntent metadata.
    /// Optional but recommended for Stripe receipts.
    /// </summary>
    public string? CustomerEmail { get; set; }

    /// <summary>
    /// Comma-separated invoice or document numbers being paid.
    /// Stored in Stripe PaymentIntent metadata and description.
    /// </summary>
    public string? InvoiceNumber { get; set; }

    /// <summary>
    /// Human-readable payment description displayed in the Stripe Dashboard.
    /// Example: "Payment for invoices INV-001, INV-002".
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Optional Salesforce Account Id.
    /// Stored in Stripe PaymentIntent metadata for reconciliation.
    /// </summary>
    public string? AccountId { get; set; }

    /// <summary>
    /// Optional Salesforce Payment__c record Id.
    /// When supplied, the Stripe webhook will update this record
    /// when the payment succeeds or fails.
    /// </summary>
    public string? PaymentId { get; set; }

    /// <summary>
    /// Optional Stripe Customer Id (cus_xxx).
    /// When provided, the PaymentIntent is attached to this customer in Stripe,
    /// allowing the card to be saved and viewed on the Customer record.
    /// </summary>
    public string? CustomerId { get; set; }

    /// <summary>
    /// Whether to save this payment method to the customer for future payments (setup_future_usage = off_session).
    /// Defaults to true when CustomerId is provided.
    /// </summary>
    public bool SetupFutureUsage { get; set; } = true;

    /// <summary>
    /// Optional Stripe PaymentMethod Id (pm_xxx) to charge directly.
    /// </summary>
    public string? PaymentMethodId { get; set; }

    /// <summary>
    /// Whether to immediately confirm the PaymentIntent with the provided payment method.
    /// Defaults to true when PaymentMethodId is provided.
    /// </summary>
    public bool Confirm { get; set; } = true;
}
