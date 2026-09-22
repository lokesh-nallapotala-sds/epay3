namespace Epay3Service.DTOs;

/// <summary>
/// Inbound request to attach a Stripe PaymentMethod to a customer and
/// record it as a Salesforce Payment_Method__c record.
/// </summary>
public class StripePaymentMethodRequest
{
    /// <summary>
    /// Stripe PaymentMethod ID (pm_xxx) or token (tok_xxx) created by Stripe.js.
    /// </summary>
    public string PaymentMethodId { get; set; } = string.Empty;

    /// <summary>
    /// Optional Stripe Customer ID (cus_xxx). If blank, resolved via AccountId.
    /// </summary>
    public string? CustomerId { get; set; }

    /// <summary>
    /// Salesforce Account Id or AccountNumber to associate with this payment method.
    /// </summary>
    public string? AccountId { get; set; }

    /// <summary>
    /// Cardholder Name as entered by the user.
    /// </summary>
    public string? CardholderName { get; set; }

    /// <summary>
    /// Optional customer email for Stripe customer creation/lookup.
    /// </summary>
    public string? CustomerEmail { get; set; }

    /// <summary>
    /// Whether to set this payment method as the default on the Stripe Customer.
    /// </summary>
    public bool SetDefault { get; set; } = true;
}
