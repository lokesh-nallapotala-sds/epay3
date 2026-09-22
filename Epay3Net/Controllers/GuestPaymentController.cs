using Epay3Net.Authorization;
using Epay3Net.Custom.ActionResult;
using Epay3Net.Helpers;
using Epay3Net.Models;
using Epay3Net.RateLimiting;
using Epay3Service.Configuration;
using Epay3Service.Extensions;
using Epay3Service.Helpers;
using Epay3Net.FeatureManagement;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.FeatureManagement;
using System.Globalization;
using System.Security.Cryptography;

namespace Epay3Net.Controllers;

[Route("api/[controller]")]
[ApiController]
public class GuestPaymentController(
    IPaymentManager manager,
    ILanguageManager languageManager,
    ApplicationSecrets applicationSecrets,
    IFeatureManager featureManager
    ) : ControllerBase
{
    private readonly IPaymentManager manager = manager;
    private readonly ILanguageManager languageManager = languageManager;
    private readonly ApplicationSecrets applicationSecrets = applicationSecrets;
    private readonly IFeatureManager featureManager = featureManager;

    [HttpPost("guestPayer")]
    [EnableRateLimiting(RateLimitPolicyNames.GuestPayment)]
    public async Task<ActionResult<UserPayerDetailsDto>> Post([FromBody] PayerDetailsRequest payerDetailsRequest, [FromQuery] string? lang = null)
    {
        var language = lang ?? CultureInfo.CurrentCulture.Name;

        PayerDetail? data = await this.manager.GetGuestPayerDetails(payerDetailsRequest, language);
        return this.Ok(PaymentCardResponseMapper.MapPayerDetails(
            data.WithoutCardValidationCodes(),
            payerDetailsRequest.CustomerNumber,
            payerDetailsRequest.CompanyCode,
            this.applicationSecrets.EncryptionKey));
    }

    [HttpPost("pay")]
    [EnableRateLimiting(RateLimitPolicyNames.GuestPayment)]
    public async Task<IActionResult> MakePayment([FromBody] GuestPaymentRequest request, [FromQuery] string? lang = null)
    {
        try
        {
            var language = lang ?? CultureInfo.CurrentCulture.Name;

            this.ResolveCvv(request);

            if (request.Invoices == null || request.Invoices.Count == 0)
            {
                return this.BadRequest(this.languageManager.GetMessage("payment.noinvoices", language, "No invoices"));
            }

            if (request.Invoices.Any(x => x.PaymentAmount == 0))
            {
                return this.BadRequest(this.languageManager.GetMessage("payment.zeroamount", language, "No invoices"));
            }

            var country = this.Request.Headers["X-Country"].ToString();

            PaymentReceipt? receipt = await this.manager.MakeGuestPayment(
                request.Payer,
                request.SoldTo,
                request.Invoices,
                request.Payment,
                country,
                request.CardinalData,
                request.GuestUserEmail,
                language);

            return this.Ok(receipt);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpPost("pre-auth")]
    [EnableRateLimiting(RateLimitPolicyNames.GuestPayment)]
    public async Task<IActionResult> DoPreAuthentication([FromBody] GuestPaymentPreAuthorizeCardRequest request, [FromQuery] string? lang = null)
    {
        if (!await this.featureManager.IsEnabledAsync(FeatureFlags.EnablePreAuth))
            return this.Ok();

        try
        {
            var language = lang ?? CultureInfo.CurrentCulture.Name;
            this.ResolveCvv(request);

            WebAR.Service.Services.API.Models.PaymentCardsResponse? response =
                await this.manager.ManageGuestPaymentCard("04", request.PayerData, [request.PaymentCard], language, true, request.AddressData);

            return this.Ok(response);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    private void ResolveCvv(GuestPaymentRequest request)
    {
        if (request?.Payment == null) return;

        if (string.IsNullOrWhiteSpace(request.Payment.CardValidationCode) &&
            !string.IsNullOrWhiteSpace(request.VRef))
        {
            try
            {
                request.Payment.CardValidationCode = Encryption.Decrypt(request.VRef, this.applicationSecrets.CvvEncryptionKey);
            }
            catch (CryptographicException)
            {
            }
            catch (FormatException)
            {
            }
            catch (ArgumentException)
            {
            }
            catch (IndexOutOfRangeException)
            {
            }
        }
    }

    private void ResolveCvv(GuestPaymentPreAuthorizeCardRequest request)
    {
        if (request?.PaymentCard == null) return;

        if (string.IsNullOrWhiteSpace(request.PaymentCard.CardValidationCode) &&
            !string.IsNullOrWhiteSpace(request.VRef))
        {
            try
            {
                request.PaymentCard.CardValidationCode = Encryption.Decrypt(request.VRef, this.applicationSecrets.CvvEncryptionKey);
            }
            catch (CryptographicException)
            {
            }
            catch (FormatException)
            {
            }
            catch (ArgumentException)
            {
            }
            catch (IndexOutOfRangeException)
            {
            }
        }
    }
}
