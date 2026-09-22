namespace Epay3Service.DTOs;

/// <summary>
/// Response returned by Salesforce when fetching the Stripe publishable key.
/// The publishable key is safe to forward to the browser for Stripe.js initialisation.
/// </summary>
public class StripePublishableKeyResponse
{
    /// <summary>
    /// Stripe publishable key.
    /// Format: pk_test_XXXXXXXX (test) or pk_live_XXXXXXXX (production).
    ///
    /// This key is safe to expose to the browser. It cannot be used
    /// to initiate server-side Stripe operations.
    /// </summary>
    public string? PublishableKey { get; set; }
}
