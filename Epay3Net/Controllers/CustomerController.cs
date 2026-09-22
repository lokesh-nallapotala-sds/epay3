using Epay3Net.Authorization.Abilities;
using Epay3Net.Authorization;
using Epay3Net.Custom.ActionResult;
using Epay3Net.FeatureManagement;
using Epay3Net.Helper;
using Epay3Net.Models;
using Epay3Net.Helpers;
using Epay3Service.Configuration;
using Epay3Service.Helpers;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.FeatureManagement;
using System.Globalization;
using System.Security.Cryptography;

namespace Epay3Net.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class CustomerController(
    IPaymentManager manager,
    IAccountManager accountManager,
    IUserManager userManager,
    ILanguageManager languageManager,
    IApplicationConfigurationManager appConfigmanager,
    ApplicationSecrets applicationSecrets,
    IFeatureManager featureManager
    ) : ControllerBase
{
    private readonly IPaymentManager paymentManager = manager;
    private readonly IAccountManager accountManager = accountManager;
    private readonly IUserManager userManager = userManager;
    private readonly ILanguageManager languageManager = languageManager;
    private readonly IApplicationConfigurationManager appConfigmanager = appConfigmanager;
    private readonly ApplicationSecrets applicationSecrets = applicationSecrets;
    private readonly IFeatureManager featureManager = featureManager;

    private async Task<string?> NormalizeCardValidationCodes(
        string language,
        string? vRef,
        IReadOnlyCollection<PaymentCard> paymentCards)
    {
        if (!await this.ShouldUseCvvControl(language))
        {
            foreach (PaymentCard paymentCard in paymentCards)
            {
                paymentCard.CardValidationCode = null;
            }

            return null;
        }

        return this.HydrateMissingCardAddCvv(vRef, paymentCards);
    }

    private string? HydrateMissingCardAddCvv(
        string? vRef,
        IReadOnlyCollection<PaymentCard> paymentCards)
    {
        PaymentCard? cardNeedingCvv = paymentCards.FirstOrDefault(card =>
            !string.Equals(card.PaymentCardType, "EC", StringComparison.OrdinalIgnoreCase) &&
            string.IsNullOrWhiteSpace(card.CardValidationCode));

        if (cardNeedingCvv == null)
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(cardNeedingCvv.PaymentCardToken))
        {
            return "Payment card token is missing";
        }

        if (!string.IsNullOrWhiteSpace(vRef))
        {
            try
            {
                cardNeedingCvv.CardValidationCode = Encryption.Decrypt(vRef, this.applicationSecrets.CvvEncryptionKey);
                return null;
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

            return "Payment card CVV reference is invalid or expired";
        }
        else
        {
            return "Payment card CVV is missing";
        }
    }

    private async Task<IActionResult> ManagePaymentCards(
        string action,
        PayerData payerData,
        List<PaymentCard> paymentCards,
        string? userId,
        string language,
        bool hydrateMissingCvv,
        bool returnStatusOnSapError = false,
        string? vRef = null,
        SapPaymentCardAddressData? addressData = null)
    {
        if (hydrateMissingCvv)
        {
            string? cvvHydrationError = await this.NormalizeCardValidationCodes(
                language,
                vRef,
                paymentCards);
            if (cvvHydrationError != null)
            {
                return this.BadRequest(cvvHydrationError);
            }
        }

        if (!this.User.TryResolveRequestedUserId(userId, out var resolvedUserId))
        {
            return this.Unauthorized(this.languageManager.GetMessage("error.user.tokenfaliure", language, "User not found"));
        }

        if (!this.User.CanAccessRequestedUserId(resolvedUserId))
        {
            return this.Forbid();
        }

        User? user = await this.userManager.GetUserById(resolvedUserId, language);
        if (user == null)
        {
            return this.Unauthorized(this.languageManager.GetMessage("error.user.tokenfaliure", language, "User not found"));
        }

        WebAR.Service.Services.API.Models.PaymentCardsResponse? response =
            await this.paymentManager.ManagePaymentCard(user, action, payerData, paymentCards, language, returnStatusOnSapError, addressData);

        return this.BuildManagePaymentCardsResponse(action, response);
    }

    private IActionResult BuildManagePaymentCardsResponse(
        string action,
        WebAR.Service.Services.API.Models.PaymentCardsResponse? response)
    {
        if (string.Equals(action, "04", StringComparison.OrdinalIgnoreCase))
        {
            return this.Ok(response);
        }

        return this.Ok(response?.Status);
    }

    [HttpPost("manage-payment-cards")]
    [RequiresAbility(Ability.ManagePaymentMethods)]
    public async Task<IActionResult> UpdatePaymentCards([FromBody] PaymentCardsRequest paymentCardsRequest, [FromQuery] string? lang = null)
    {
        try
        {
            var language = lang ?? CultureInfo.CurrentCulture.Name;

            if (string.IsNullOrWhiteSpace(paymentCardsRequest.Action))
            {
                return this.BadRequest("Missing payment card action");
            }

            return await this.ManagePaymentCards(
                paymentCardsRequest.Action,
                paymentCardsRequest.PayerData,
                paymentCardsRequest.PaymentCards,
                paymentCardsRequest.UserId,
                language,
                hydrateMissingCvv: paymentCardsRequest.Action == "01",
                vRef: paymentCardsRequest.VRef);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpPost("paymentcards/add")]
    [RequiresAnyAbility(Ability.MakePayment, Ability.ManagePaymentMethods)]
    public async Task<IActionResult> AddPaymentCard([FromBody] AddPaymentCardRequest request, [FromQuery] string? lang = null)
    {
        try
        {
            var language = lang ?? CultureInfo.CurrentCulture.Name;
            return await this.ManagePaymentCards(
                "01",
                request.PayerData,
                [request.PaymentCard],
                request.UserId,
                language,
                true,
                true,
                request.VRef);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpPost("paymentcards/update")]
    [RequiresAnyAbility(Ability.MakePayment, Ability.ManagePaymentMethods)]
    public async Task<IActionResult> UpdatePaymentCard([FromBody] UpdatePaymentCardRequest request, [FromQuery] string? lang = null)
    {
        try
        {
            var language = lang ?? CultureInfo.CurrentCulture.Name;
            return await this.ManagePaymentCards("02", request.PayerData, [request.PaymentCard], request.UserId, language, false);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpPost("paymentcards/delete")]
    [RequiresAnyAbility(Ability.MakePayment, Ability.ManagePaymentMethods)]
    public async Task<IActionResult> DeletePaymentCard([FromBody] DeletePaymentCardRequest request, [FromQuery] string? lang = null)
    {
        try
        {
            var language = lang ?? CultureInfo.CurrentCulture.Name;
            return await this.ManagePaymentCards("03", request.PayerData, [request.PaymentCard], request.UserId, language, false);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpPost("paymentcards/pre-auth")]
    [RequiresAnyAbility(Ability.MakePayment, Ability.ManagePaymentMethods)]
    public async Task<IActionResult> DoPreAuthentication([FromBody] PreAuthorizePaymentCardRequest request, [FromQuery] string? lang = null)
    {
        if (!await this.featureManager.IsEnabledAsync(FeatureFlags.EnablePreAuth))
            return this.Ok();

        try
        {
            var language = lang ?? CultureInfo.CurrentCulture.Name;
            return await this.ManagePaymentCards("04", request.PayerData, [request.PaymentCard], request.UserId, language, false, true, null, request.AddressData);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    //TODO: why is this here instead of on the PaymentController?
    [HttpPost("paymentcards")]
    [RequiresAnyAbility(Ability.MakePayment, Ability.ManagePaymentMethods)]
    public async Task<IActionResult> SendPaymentCardRequest([FromBody] PaymentCardsRequest paymentCardsRequest, [FromQuery] string? lang = null)
    {
        try
        {
            var language = lang ?? CultureInfo.CurrentCulture.Name;

            List<PaymentCard> paymentCards = paymentCardsRequest.PaymentCards;

            if (string.IsNullOrWhiteSpace(paymentCardsRequest.Action))
            {
                return this.BadRequest("Missing payment card action");
            }

            return await this.ManagePaymentCards(
                paymentCardsRequest.Action,
                paymentCardsRequest.PayerData,
                paymentCards,
                paymentCardsRequest.UserId,
                language,
                paymentCardsRequest.Action == "01",
                false,
                paymentCardsRequest.VRef);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpPost("enableCardAutoPay")]
    [RequiresAnyAbility(Ability.MakePayment, Ability.ManagePaymentMethods)]
    public async Task<IActionResult> EnableCardAutoPay([FromBody] EnableAutoPayCardRequest enableAutoPayCardRequest, [FromQuery] string? lang = null)
    {
        try
        {
            var language = lang ?? CultureInfo.CurrentCulture.Name;

            if (!this.User.TryResolveRequestedUserId(enableAutoPayCardRequest.UserId, out var userId))
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.tokenfaliure", language, "User not found"));
            }

            if (!this.User.CanAccessRequestedUserId(userId))
            {
                return this.Forbid();
            }

            User? user = await this.userManager.GetUserById(userId, language);
            if (user == null)
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.tokenfaliure", language, "User not found"));
            }

            PayerDetail? payerDetails = await this.GetPayerDetailsFromAccounts(
                user,
                enableAutoPayCardRequest.SelectedAccount,
                enableAutoPayCardRequest.Payer,
                enableAutoPayCardRequest.CompanyCode,
                language);

            if (payerDetails == null)
            {
                return this.NotFound("Payer detail not found.");
            }

            string? decryptedCardToken = this.DecryptCardToken(enableAutoPayCardRequest.CardToken);
            var matchingCard = payerDetails.PaymentCards?.FirstOrDefault(pc =>
                string.Equals(pc.PaymentCardToken, decryptedCardToken, StringComparison.OrdinalIgnoreCase));

            if (matchingCard == null)
            {
                return this.NotFound("Matching payment card not found.");
            }

            var payerData = new PayerData
            {
                CustomerNumber = enableAutoPayCardRequest.SelectedAccount,
                CompanyCode = enableAutoPayCardRequest.CompanyCode
            };

            bool isRequestEnrolled = enableAutoPayCardRequest?.isAutoPayEnrolled ?? false;
            bool isAlreadyEnrolled = payerDetails.IsAutoPayEnrolled == true;

            if (isAlreadyEnrolled || isRequestEnrolled)
            {
                string paymentMethodType = string.Equals(
                    matchingCard.PaymentCardType,
                    "EC",
                    StringComparison.OrdinalIgnoreCase)
                    ? "EC"
                    : "CC";

                await paymentManager.ManageAutoPay(user, payerData, true, paymentMethodType, matchingCard.PaymentCardToken, language);

            }

            PayerDetail? updatedPayerDetails = await this.GetPayerDetailsFromAccounts(
                user,
                enableAutoPayCardRequest.SelectedAccount,
                enableAutoPayCardRequest.Payer,
                enableAutoPayCardRequest.CompanyCode,
                language,
                true);
            return this.Ok(PaymentCardResponseMapper.MapPayerDetails(
                updatedPayerDetails,
                enableAutoPayCardRequest.Payer,
                enableAutoPayCardRequest.CompanyCode,
                this.applicationSecrets.EncryptionKey));
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpPost("unenrollautopay")]
    [RequiresAnyAbility(Ability.MakePayment, Ability.ManagePaymentMethods)]
    public async Task<IActionResult> UnEnrollAutoPay([FromBody] UnEnrollAutoPayRequest unEnrollAutoPayRequest, [FromQuery] string? lang = null)
    {
        try
        {
            var language = lang ?? CultureInfo.CurrentCulture.Name;

            if (!this.User.TryResolveRequestedUserId(unEnrollAutoPayRequest.UserId, out var userId))
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.tokenfaliure", language, "User not found"));
            }

            if (!this.User.CanAccessRequestedUserId(userId))
            {
                return this.Forbid();
            }

            User? user = await this.userManager.GetUserById(userId, language);
            if (user == null)
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.tokenfaliure", language, "User not found"));
            }

            PayerDetail? payerDetails = await this.GetPayerDetailsFromAccounts(
                user,
                unEnrollAutoPayRequest.SelectedAccount,
                unEnrollAutoPayRequest.Payer,
                unEnrollAutoPayRequest.CompanyCode,
                language);

            if (payerDetails == null)
            {
                return this.NotFound("Payer detail not found.");
            }

            var payerData = new PayerData
            {
                CustomerNumber = unEnrollAutoPayRequest.SelectedAccount,
                CompanyCode = unEnrollAutoPayRequest.CompanyCode
            };

            if (payerDetails.IsAutoPayEnrolled == true)
            {
                await paymentManager.ManageAutoPay(user, payerData, false, "EC", "", language);

                await paymentManager.ManageAutoPay(user, payerData, false, "CC", "", language);
            }

            PayerDetail? updatedPayerDetails = await this.GetPayerDetailsFromAccounts(
                user,
                unEnrollAutoPayRequest.SelectedAccount,
                unEnrollAutoPayRequest.Payer,
                unEnrollAutoPayRequest.CompanyCode,
                language,
                true);
            return this.Ok(PaymentCardResponseMapper.MapPayerDetails(
                updatedPayerDetails,
                unEnrollAutoPayRequest.Payer,
                unEnrollAutoPayRequest.CompanyCode,
                this.applicationSecrets.EncryptionKey));
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    private string? DecryptCardToken(string? encryptedCardToken)
    {
        if (string.IsNullOrWhiteSpace(encryptedCardToken))
        {
            return encryptedCardToken;
        }

        try
        {
            return Encryption.Decrypt(encryptedCardToken, this.applicationSecrets.EncryptionKey);
        }
        catch
        {
            return encryptedCardToken;
        }
    }

    private async Task<PayerDetail?> GetPayerDetailsFromAccounts(
        User user,
        string selectedAccount,
        string payer,
        string? companyCode,
        string language,
        bool forceRefresh = false)
    {
        List<AccountView> accountViews = await this.accountManager.GetAccountViewsByUser(user, language, forceRefresh);
        AccountView? accountView = accountViews
            .FirstOrDefault(x => string.Equals(
                x.PrimaryAcct?.TrimStart('0'),
                selectedAccount.TrimStart('0'),
                StringComparison.OrdinalIgnoreCase)
                && (string.IsNullOrWhiteSpace(companyCode)
                    || string.Equals(
                        x.CompanyCode,
                        companyCode,
                        StringComparison.OrdinalIgnoreCase)));

        if (accountView == null)
        {
            return null;
        }

        if (user.PrimaryAccountType.StartsWith(AccountType.Payer, StringComparison.OrdinalIgnoreCase))
        {
            return accountView.ResolvedPayerDetails;
        }

        if (string.Equals(
            accountView.DefaultPayer?.PrimaryAccount?.TrimStart('0'),
            payer.TrimStart('0'),
            StringComparison.OrdinalIgnoreCase))
        {
            return accountView.ResolvedPayerDetails;
        }

        return accountView.ResolvedPayerDetails;
    }

    private async Task<bool> ShouldUseCvvControl(string language)
    {
        SapCustomData? customData = await this.appConfigmanager.GetCustomConfig(language);
        return customData?.GeneralData?.IsCvvUseControlEnabled == true;
    }

}

