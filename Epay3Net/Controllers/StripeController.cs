using Epay3Net.Custom.ActionResult;
using Epay3Net.RateLimiting;
using Epay3Service.DTOs;
using Epay3Service.Managers.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Epay3Net.Controllers;

/// <summary>
/// Exposes Stripe payment operations to the browser through a secure
/// .NET → Salesforce → Stripe middleware chain.
///
/// Security Model:
///   - All endpoints require authentication (JWT) except GET /config.
///   - Stripe secret keys never appear in this controller or anywhere in .NET.
///   - Card data (PAN, CVV, expiry) never passes through this controller.
///   - Salesforce holds the Stripe secret key in a Named Credential.
///   - Stripe.js in the browser handles card data directly with Stripe.
///
/// Payment Flow:
///   1. Browser → GET  /api/stripe/config           → publishable key
///   2. Browser → POST /api/stripe/payment-intent   → clientSecret + paymentIntentId
///   3. Browser uses clientSecret with stripe.confirmPayment() (card data → Stripe directly)
///   4. Browser → GET  /api/stripe/payment-intent/{id} → final status
///   5. Stripe  → SF webhook (payment_intent.succeeded) → Payment__c updated
/// </summary>
[Route("api/stripe")]
[ApiController]
[Authorize]
public class StripeController(IStripeManager stripeManager) : ControllerBase
{
    private readonly IStripeManager _stripeManager = stripeManager
        ?? throw new ArgumentNullException(nameof(stripeManager));


    // ─────────────────────────────────────────────────────────────────────────
    // GET api/stripe/config
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Returns the Stripe publishable key.
    ///
    /// The browser uses this key to initialise Stripe.js:
    ///   const stripe = Stripe(publishableKey);
    ///
    /// The publishable key is safe to expose to authenticated users.
    /// It cannot be used to initiate server-side Stripe operations.
    ///
    /// Access: Requires authentication. Rate-limited.
    /// </summary>
    [HttpGet("config")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.PublicConfig)]
    public async Task<IActionResult> GetConfig(CancellationToken ct)
    {
        try
        {
            string publishableKey = await _stripeManager.GetPublishableKeyAsync(ct);
            return Ok(new { publishableKey });
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }


    /// <summary>
    /// Processes a Stripe payment via Salesforce middleware using Worldpay API structure.
    ///
    /// Access: Public / Session checkout allowed.
    /// </summary>
    [HttpPost("payment")]
    [HttpPost("pay")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.AuthenticatedApi)]
    public async Task<IActionResult> ProcessPayment(
        [FromBody] StripePaymentIntentRequest request,
        CancellationToken ct)
    {
        if (request is null)
        {
            return BadRequest(new { error = "Request body is required." });
        }

        if (request.Amount <= 0)
        {
            return BadRequest(new { error = "Payment amount must be greater than zero." });
        }

        try
        {
            StripePaymentIntentResponse result =
                await _stripeManager.ProcessPaymentAsync(request, ct);

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message, details = ex.InnerException?.Message });
        }
    }

    /// <summary>
    /// Creates a Stripe PaymentIntent via Salesforce middleware.
    ///
    /// Request body must contain amount, currency, and invoice information.
    /// It must NOT contain raw card numbers, CVV, or expiry dates.
    ///
    /// Access: Requires authentication. Rate-limited.
    /// </summary>
    [HttpPost("payment-intent")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.AuthenticatedApi)]
    public async Task<IActionResult> CreatePaymentIntent(
        [FromBody] StripePaymentIntentRequest request,
        CancellationToken ct)
    {
        if (request is null)
        {
            return BadRequest(new { error = "Request body is required." });
        }

        if (request.Amount <= 0)
        {
            return BadRequest(new { error = "Payment amount must be greater than zero." });
        }

        try
        {
            // If payment method is specified and confirmed, route through ProcessPaymentAsync
            StripePaymentIntentResponse result;
            if (!string.IsNullOrWhiteSpace(request.PaymentMethodId ?? request.Token) && request.Confirm)
            {
                result = await _stripeManager.ProcessPaymentAsync(request, ct);
            }
            else
            {
                result = await _stripeManager.CreatePaymentIntentAsync(request, ct);
            }

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message, details = ex.InnerException?.Message });
        }
    }


    // ─────────────────────────────────────────────────────────────────────────
    // GET api/stripe/payment-intent/{paymentIntentId}
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Retrieves the current status of a Stripe PaymentIntent via Salesforce.
    ///
    /// The browser calls this endpoint after <c>stripe.confirmPayment()</c>
    /// to get the authoritative payment status from Stripe (via Salesforce).
    ///
    /// <paramref name="paymentIntentId"/> must have the format <c>pi_XXXXXXXXXX</c>.
    ///
    /// Access: Requires authentication.
    /// </summary>
    [HttpGet("payment-intent/{paymentIntentId}")]
    public async Task<IActionResult> GetPaymentIntent(
        [FromRoute] string paymentIntentId,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(paymentIntentId))
        {
            return BadRequest(new { error = "paymentIntentId is required." });
        }

        if (!paymentIntentId.StartsWith("pi_", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { error = "Invalid paymentIntentId format." });
        }

        try
        {
            StripePaymentIntentResponse result =
                await _stripeManager.GetPaymentIntentAsync(paymentIntentId, ct);

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }


    // ─────────────────────────────────────────────────────────────────────────
    // POST api/stripe/refund
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Creates a Stripe refund (full or partial) via Salesforce middleware.
    ///
    /// For a full refund, omit the <c>amount</c> field.
    /// For a partial refund, supply <c>amount</c> and <c>currencyCode</c>.
    ///
    /// Access: Requires authentication. Intended for admin use.
    /// </summary>
    [HttpPost("refund")]
    [EnableRateLimiting(RateLimitPolicyNames.AuthenticatedApi)]
    public async Task<IActionResult> CreateRefund(
        [FromBody] StripeRefundRequest request,
        CancellationToken ct)
    {
        if (request is null)
        {
            return BadRequest(new { error = "Request body is required." });
        }

        if (string.IsNullOrWhiteSpace(request.PaymentIntentId))
        {
            return BadRequest(new { error = "paymentIntentId is required." });
        }

        try
        {
            StripeRefundResponse result =
                await _stripeManager.CreateRefundAsync(request, ct);

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }


    // ─────────────────────────────────────────────────────────────────────────
    // POST api/stripe/payment-method
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Attaches and saves a Stripe PaymentMethod to a customer and syncs to Salesforce.
    ///
    /// Access: Requires authentication. Rate-limited.
    /// </summary>
    [HttpPost("payment-method")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.AuthenticatedApi)]
    public async Task<IActionResult> CreatePaymentMethod(
        [FromBody] StripePaymentMethodRequest request,
        CancellationToken ct)
    {
        if (request is null)
        {
            return BadRequest(new { error = "Request body is required." });
        }

        if (string.IsNullOrWhiteSpace(request.PaymentMethodId))
        {
            return BadRequest(new { error = "paymentMethodId is required." });
        }

        try
        {
            StripePaymentMethodResponse result =
                await _stripeManager.CreatePaymentMethodAsync(request, ct);

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }


    // ─────────────────────────────────────────────────────────────────────────
    // GET api/stripe/charges
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Retrieves Stripe charges (transaction history), optionally filtered by Stripe Customer ID.
    ///
    /// Access: Requires authentication.
    /// </summary>
    [HttpGet("charges")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.AuthenticatedApi)]
    public async Task<IActionResult> GetCharges(
        [FromQuery] string? customerId = null,
        [FromQuery] string? accountId = null,
        [FromQuery(Name = "created_gte")] long? createdGteSnake = null,
        [FromQuery(Name = "createdGte")] long? createdGteCamel = null,
        [FromQuery(Name = "created_lte")] long? createdLteSnake = null,
        [FromQuery(Name = "createdLte")] long? createdLteCamel = null,
        [FromQuery] int limit = 50,
        CancellationToken ct = default)
    {
        try
        {
            long? createdGte = createdGteSnake ?? createdGteCamel;
            long? createdLte = createdLteSnake ?? createdLteCamel;

            StripeChargesResponse result =
                await _stripeManager.GetChargesAsync(customerId, accountId, createdGte, createdLte, limit, ct);

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }


    // ─────────────────────────────────────────────────────────────────────────
    // GET api/stripe/customer-payment-methods/{accountId}
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Resolves or provisions a Stripe customer for the Salesforce Account ID and returns
    /// customer details along with saved payment methods.
    ///
    /// Access: Public / Session checkout allowed.
    /// </summary>
    [HttpGet("customer-payment-methods/{accountId}")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.AuthenticatedApi)]
    public async Task<IActionResult> GetCustomerPaymentMethods(
        [FromRoute] string accountId,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(accountId))
        {
            return BadRequest(new { error = "accountId is required." });
        }

        try
        {
            StripeCustomerCardsResponse result =
                await _stripeManager.GetCustomerAndPaymentMethodsAsync(accountId, ct);

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }
}
