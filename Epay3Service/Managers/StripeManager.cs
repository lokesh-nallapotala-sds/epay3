using Epay3Service.Clients.Interfaces;
using Epay3Service.DTOs;
using Epay3Service.Managers.Interfaces;
using Microsoft.Extensions.Logging;

namespace Epay3Service.Managers;

/// <summary>
/// Implements Stripe payment operations by routing all calls through
/// Salesforce Apex REST APIs as middleware.
///
/// Architecture:
///   Browser → .NET StripeController
///           → StripeManager (this class)
///           → SalesforceHttpClient
///           → Salesforce Apex REST (StripePaymentIntentAPI etc.)
///           → Stripe API (via Salesforce Named Credential callout:stripe)
///
/// Security Model:
///   - Stripe secret keys live exclusively in the Salesforce Named Credential.
///   - Card data (PAN, CVV, expiry) is handled by Stripe.js in the browser.
///   - This class only exchanges PaymentIntent metadata and the clientSecret.
/// </summary>
public class StripeManager : IStripeManager
{
    // ─────────────────────────────────────────────────────────────────────────
    // Salesforce Apex REST endpoint paths
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>POST — Create a Stripe PaymentIntent.</summary>
    private const string CreatePaymentIntentPath =
        "/services/apexrest/stripe/paymentIntent/";

    /// <summary>GET — Retrieve a Stripe PaymentIntent status by ID.</summary>
    private const string GetPaymentIntentBasePath =
        "/services/apexrest/stripe/paymentIntentStatus/";

    /// <summary>GET — Retrieve the Stripe publishable key.</summary>
    private const string GetConfigPath =
        "/services/apexrest/stripe/config/";

    /// <summary>POST — Create a Stripe refund.</summary>
    private const string CreateRefundPath =
        "/services/apexrest/stripe/refund/";

    /// <summary>POST — Attach and sync a Stripe PaymentMethod.</summary>
    private const string CreatePaymentMethodPath =
        "/services/apexrest/stripe/paymentMethod/";


    // ─────────────────────────────────────────────────────────────────────────
    // Dependencies
    // ─────────────────────────────────────────────────────────────────────────

    private readonly ISalesforceHttpClient _sfClient;
    private readonly ILogger<StripeManager> _logger;


    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    public StripeManager(
        ISalesforceHttpClient sfClient,
        ILogger<StripeManager> logger)
    {
        _sfClient = sfClient ?? throw new ArgumentNullException(nameof(sfClient));
        _logger   = logger   ?? throw new ArgumentNullException(nameof(logger));
    }


    // ─────────────────────────────────────────────────────────────────────────
    // IStripeManager Implementation
    // ─────────────────────────────────────────────────────────────────────────

    /// <inheritdoc />
    public async Task<StripePaymentIntentResponse> CreatePaymentIntentAsync(
        StripePaymentIntentRequest request,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (request.Amount <= 0)
        {
            throw new ArgumentException("Payment amount must be greater than zero.", nameof(request));
        }

        if (string.IsNullOrWhiteSpace(request.CurrencyCode))
        {
            request.CurrencyCode = "USD";
        }

        _logger.LogInformation(
            "Creating Stripe PaymentIntent via Salesforce. Amount={Amount} {Currency} Invoice={Invoice}",
            request.Amount,
            request.CurrencyCode,
            request.InvoiceNumber ?? "(none)");

        // Build the request body as a plain anonymous object that serialises
        // cleanly to camelCase JSON matching the Apex DTO field names.
        var body = new
        {
            amount           = request.Amount,
            currencyCode     = request.CurrencyCode,
            customerName     = request.CustomerName,
            customerEmail    = request.CustomerEmail,
            invoiceNumber    = request.InvoiceNumber,
            description      = request.Description,
            accountId        = request.AccountId,
            paymentId        = request.PaymentId,
            customerId       = request.CustomerId,
            setupFutureUsage = request.SetupFutureUsage,
            paymentMethodId  = request.PaymentMethodId,
            confirm          = request.Confirm
        };

        StripePaymentIntentResponse? result =
            await _sfClient.PostAsync<StripePaymentIntentResponse>(
                CreatePaymentIntentPath,
                body,
                cancellationToken: ct);

        if (result is null)
        {
            _logger.LogError(
                "Salesforce returned null for PaymentIntent creation. Invoice={Invoice}",
                request.InvoiceNumber);

            throw new InvalidOperationException(
                "Salesforce returned an empty response when creating the Stripe PaymentIntent.");
        }

        if (string.IsNullOrWhiteSpace(result.ClientSecret))
        {
            _logger.LogError(
                "Salesforce PaymentIntent response is missing clientSecret. PaymentIntentId={Id}",
                result.PaymentIntentId);

            throw new InvalidOperationException(
                "Stripe PaymentIntent was created but clientSecret is missing from the Salesforce response.");
        }

        _logger.LogInformation(
            "Stripe PaymentIntent created successfully. PaymentIntentId={Id} Status={Status}",
            result.PaymentIntentId,
            result.Status);

        return result;
    }


    /// <inheritdoc />
    public async Task<StripePaymentIntentResponse> GetPaymentIntentAsync(
        string paymentIntentId,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(paymentIntentId))
        {
            throw new ArgumentException(
                "PaymentIntent ID cannot be null or empty.", nameof(paymentIntentId));
        }

        if (!paymentIntentId.StartsWith("pi_", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException(
                "Invalid PaymentIntent ID format. Expected prefix: pi_", nameof(paymentIntentId));
        }

        _logger.LogInformation(
            "Retrieving Stripe PaymentIntent via Salesforce. PaymentIntentId={Id}",
            paymentIntentId);

        string path = GetPaymentIntentBasePath + Uri.EscapeDataString(paymentIntentId);

        StripePaymentIntentResponse? result =
            await _sfClient.GetAsync<StripePaymentIntentResponse>(path, cancellationToken: ct);

        if (result is null)
        {
            _logger.LogWarning(
                "Salesforce returned null for GetPaymentIntent. PaymentIntentId={Id}",
                paymentIntentId);

            throw new InvalidOperationException(
                $"Salesforce returned an empty response for PaymentIntent {paymentIntentId}.");
        }

        _logger.LogInformation(
            "Retrieved Stripe PaymentIntent. PaymentIntentId={Id} Status={Status}",
            result.PaymentIntentId,
            result.Status);

        return result;
    }


    /// <inheritdoc />
    public async Task<string> GetPublishableKeyAsync(CancellationToken ct = default)
    {
        _logger.LogInformation("Fetching Stripe publishable key from Salesforce.");

        StripePublishableKeyResponse? result =
            await _sfClient.GetAsync<StripePublishableKeyResponse>(GetConfigPath, cancellationToken: ct);

        string? key = result?.PublishableKey;

        if (string.IsNullOrWhiteSpace(key))
        {
            _logger.LogError("Salesforce returned an empty or missing Stripe publishable key.");

            throw new InvalidOperationException(
                "Stripe publishable key is not configured in Salesforce Custom Metadata.");
        }

        if (!key.StartsWith("pk_test_", StringComparison.OrdinalIgnoreCase) &&
            !key.StartsWith("pk_live_", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogError(
                "Stripe publishable key has an invalid format. Key prefix: {Prefix}",
                key[..Math.Min(8, key.Length)]);

            throw new InvalidOperationException(
                "Stripe publishable key returned by Salesforce has an invalid format.");
        }

        _logger.LogInformation("Stripe publishable key retrieved successfully.");

        return key;
    }


    /// <inheritdoc />
    public async Task<StripeRefundResponse> CreateRefundAsync(
        StripeRefundRequest request,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.PaymentIntentId))
        {
            throw new ArgumentException(
                "PaymentIntentId is required for a refund.", nameof(request));
        }

        if (!request.PaymentIntentId.StartsWith("pi_", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException(
                "Invalid PaymentIntent ID format. Expected prefix: pi_", nameof(request));
        }

        if (request.Amount.HasValue && request.Amount.Value <= 0)
        {
            throw new ArgumentException(
                "Refund amount must be greater than zero when specified.", nameof(request));
        }

        if (request.Amount.HasValue && string.IsNullOrWhiteSpace(request.CurrencyCode))
        {
            throw new ArgumentException(
                "CurrencyCode is required when a partial refund Amount is specified.", nameof(request));
        }

        _logger.LogInformation(
            "Creating Stripe refund via Salesforce. PaymentIntentId={Id} Amount={Amount}",
            request.PaymentIntentId,
            request.Amount.HasValue ? request.Amount.Value.ToString() : "full");

        var body = new
        {
            paymentIntentId = request.PaymentIntentId,
            amount          = request.Amount,
            currencyCode    = request.CurrencyCode
        };

        StripeRefundResponse? result =
            await _sfClient.PostAsync<StripeRefundResponse>(
                CreateRefundPath,
                body,
                cancellationToken: ct);

        if (result is null)
        {
            _logger.LogError(
                "Salesforce returned null for refund creation. PaymentIntentId={Id}",
                request.PaymentIntentId);

            throw new InvalidOperationException(
                "Salesforce returned an empty response when creating the Stripe refund.");
        }

        _logger.LogInformation(
            "Stripe refund created successfully. RefundId={RefundId} Status={Status}",
            result.RefundId,
            result.Status);

        return result;
    }


    /// <inheritdoc />
    public async Task<StripePaymentMethodResponse> CreatePaymentMethodAsync(
        StripePaymentMethodRequest request,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.PaymentMethodId))
        {
            throw new ArgumentException("PaymentMethodId is required.", nameof(request));
        }

        _logger.LogInformation(
            "Attaching Stripe PaymentMethod {PaymentMethodId} for Customer={CustomerId} Account={AccountId}",
            request.PaymentMethodId,
            request.CustomerId,
            request.AccountId);

        var body = new
        {
            accountId = request.AccountId,
            customerId = request.CustomerId,
            paymentMethodId = request.PaymentMethodId,
            cardholderName = request.CardholderName,
            setDefault = request.SetDefault
        };

        StripePaymentMethodResponse? result =
            await _sfClient.PostAsync<StripePaymentMethodResponse>(
                CreatePaymentMethodPath,
                body,
                cancellationToken: ct);

        if (result is null)
        {
            _logger.LogError(
                "Salesforce returned null for payment method creation. PaymentMethodId={Id}",
                request.PaymentMethodId);

            throw new InvalidOperationException(
                "Salesforce returned an empty response when saving the Stripe payment method.");
        }

        _logger.LogInformation(
            "Stripe payment method processed. Success={Success} SfPmId={SfPmId}",
            result.Success,
            result.SalesforcePaymentMethodId);

        return result;
    }
}

