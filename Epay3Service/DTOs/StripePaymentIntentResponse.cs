namespace Epay3Service.DTOs;

/// <summary>
/// Response returned by Salesforce after creating a Stripe PaymentIntent.
///
/// The <see cref="ClientSecret"/> MUST be forwarded to the browser.
/// The browser uses it to initialise Stripe Payment Element and call
/// <c>stripe.confirmPayment({ clientSecret })</c> — the actual card data
/// never passes through .NET or Salesforce.
/// </summary>
public class StripePaymentIntentResponse
{
    /// <summary>
    /// Stripe PaymentIntent ID. Format: pi_XXXXXXXXXX.
    /// Store this to poll status or create refunds later.
    /// </summary>
    public string? PaymentIntentId { get; set; }

    /// <summary>
    /// Stripe client secret. Format: pi_XXXXX_secret_YYYYY.
    ///
    /// IMPORTANT: This value must be forwarded to the browser as-is.
    /// The browser passes it to Stripe.js to confirm the payment.
    /// It is safe to expose to the authenticated end-user but must
    /// not be logged or stored persistently.
    /// </summary>
    public string? ClientSecret { get; set; }

    /// <summary>
    /// Current Stripe PaymentIntent status.
    /// Expected value after creation: "requires_payment_method".
    /// After successful payment: "succeeded".
    /// </summary>
    public string? Status { get; set; }

    /// <summary>
    /// Amount in Stripe's smallest currency unit (e.g. cents for USD).
    /// Example: 25000 = $250.00 USD.
    /// </summary>
    public int? Amount { get; set; }

    /// <summary>
    /// Amount that has been received (captured). 0 before payment confirmation.
    /// </summary>
    public int? AmountReceived { get; set; }

    /// <summary>
    /// Lowercase ISO currency code. Example: "usd".
    /// </summary>
    public string? CurrencyCode { get; set; }

    /// <summary>
    /// Human-readable payment description from Stripe.
    /// </summary>
    public string? Description { get; set; }
}
