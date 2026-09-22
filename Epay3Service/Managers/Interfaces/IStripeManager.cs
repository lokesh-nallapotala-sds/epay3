using Epay3Service.DTOs;

namespace Epay3Service.Managers.Interfaces;

/// <summary>
/// Manages Stripe payment operations via Salesforce as middleware.
///
/// Flow:
///   Browser → .NET (this manager) → Salesforce Apex REST → Stripe API
///
/// Card data security:
///   Card numbers, CVV, and expiry dates never pass through this layer.
///   Stripe.js in the browser handles sensitive card data directly with Stripe.
///   This manager only coordinates PaymentIntent creation (clientSecret exchange)
///   and status polling.
/// </summary>
public interface IStripeManager
{
    /// <summary>
    /// Creates a Stripe PaymentIntent via Salesforce, returning a clientSecret
    /// that the browser uses to confirm the payment with Stripe.js.
    ///
    /// Salesforce endpoint:
    ///   POST /services/apexrest/stripe/paymentIntent/
    ///
    /// The returned <see cref="StripePaymentIntentResponse.ClientSecret"/> MUST be
    /// forwarded to the browser. The browser then calls:
    ///   stripe.confirmPayment({ elements, clientSecret, redirect: 'if_required' })
    /// </summary>
    /// <param name="request">Payment details (amount, currency, invoice info). No card data.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>PaymentIntent result including clientSecret and paymentIntentId.</returns>
    Task<StripePaymentIntentResponse> CreatePaymentIntentAsync(
        StripePaymentIntentRequest request,
        CancellationToken ct = default);

    /// <summary>
    /// Retrieves the current status of a Stripe PaymentIntent via Salesforce.
    ///
    /// Salesforce endpoint:
    ///   GET /services/apexrest/stripe/paymentIntentStatus/{paymentIntentId}
    ///
    /// Use this to poll the authoritative payment status after
    /// <c>stripe.confirmPayment()</c> has been called in the browser.
    /// </summary>
    /// <param name="paymentIntentId">Stripe PaymentIntent ID (pi_XXXXXXXXXX).</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Current PaymentIntent status and amount details.</returns>
    Task<StripePaymentIntentResponse> GetPaymentIntentAsync(
        string paymentIntentId,
        CancellationToken ct = default);

    /// <summary>
    /// Returns the Stripe publishable key from Salesforce Custom Metadata.
    ///
    /// Salesforce endpoint:
    ///   GET /services/apexrest/stripe/config/
    ///
    /// The publishable key is safe to expose to the browser.
    /// The browser uses it to initialise Stripe.js:
    ///   const stripe = Stripe(publishableKey);
    /// </summary>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Stripe publishable key (pk_test_... or pk_live_...).</returns>
    Task<string> GetPublishableKeyAsync(CancellationToken ct = default);

    /// <summary>
    /// Creates a Stripe refund (full or partial) via Salesforce.
    ///
    /// Salesforce endpoint:
    ///   POST /services/apexrest/stripe/refund/
    /// </summary>
    /// <param name="request">Refund details. Set Amount=null for a full refund.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Refund result including refundId and status.</returns>
    Task<StripeRefundResponse> CreateRefundAsync(
        StripeRefundRequest request,
        CancellationToken ct = default);

    /// <summary>
    /// Attaches a Stripe PaymentMethod to a customer and syncs the Salesforce Payment_Method__c record.
    ///
    /// Salesforce endpoint:
    ///   POST /services/apexrest/stripe/paymentMethod/
    /// </summary>
    Task<StripePaymentMethodResponse> CreatePaymentMethodAsync(
        StripePaymentMethodRequest request,
        CancellationToken ct = default);
}
