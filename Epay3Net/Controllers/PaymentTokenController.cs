using Epay3Net.Authorization;
using Epay3Net.Authorization.Abilities;
using Epay3Net.Custom;
using Epay3Net.Custom.ActionResult;
using Epay3Net.Helper;
using Epay3Net.Models;
using Epay3Net.RateLimiting;
using Epay3Service.Configuration;
using Epay3Service.Extensions;
using Epay3Service.Helpers;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Globalization;
using System.Security.Claims;

namespace Epay3Net.Controllers;

[Route("api/payment-token")]
[ApiController]
[Authorize]
public class PaymentTokenController(
    IPaymentManager manager,
    IAccountManager accountManager,
    IUserManager userManager,
    ILanguageManager languageManager,
    IAuthorizationService authorizationService,
    ApplicationSecrets applicationSecrets,
    IApplicationConfigurationManager applicationConfigurationManager
    ) : ControllerBase
{
    private readonly IPaymentManager manager = manager;
    private readonly IAccountManager accountManager = accountManager;
    private readonly IUserManager userManager = userManager;
    private readonly ILanguageManager languageManager = languageManager;
    private readonly IAuthorizationService authorizationService = authorizationService;
    private readonly ApplicationSecrets applicationSecrets = applicationSecrets;
    private readonly IApplicationConfigurationManager applicationConfigurationManager = applicationConfigurationManager;
    private readonly IUserClaimsPrincipalFactory<User> claimsPrincipalFactory = new EpayClaimsPrincipalFactory();

    [HttpPost("payment-method-entry-token")]
    [RequiresAbility(Ability.MakePayment)]
    public async Task<IActionResult> CreatePaymentMethodEntryToken([FromBody] PaymentAccessTokenRequest request, [FromQuery] string? userId = null, [FromQuery] string? lang = null)
    {
        try
        {
            var language = lang ?? CultureInfo.CurrentCulture.Name;
            if (!this.User.TryResolveRequestedUserId(userId, out var uid))
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.tokenfaliure", language, "User not found"));
            }

            if (!this.User.CanAccessRequestedUserId(uid))
            {
                return this.Forbid();
            }

            User? user = await this.userManager.GetUserById(uid, language);
            if (user == null)
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.tokenfaliure", language, "User not found"));
            }
            List<Account>? linkedAccounts = await this.accountManager.GetLinkedAccountsByUser(user, language);
            if (linkedAccounts == null || linkedAccounts.Count == 0 || !this.HasLinkedAccount(linkedAccounts, request.SelectedAccount))
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.accountnotallowed", language, "Account not allowed"));
            }

            user.Accounts = linkedAccounts;

            ClaimsPrincipal userPrincipal = await this.claimsPrincipalFactory.CreateAsync(user);
            AuthorizationResult authorizationResult = await this.authorizationService.AuthorizeAsync(userPrincipal, request.SelectedAccount, UserOperations.UserAccount);

            if (!authorizationResult.Succeeded)
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.accountnotallowed", language, "Account not allowed"));
            }

            AddDefaultCardinalData(request);

            PaymentAccessToken? token = await this.manager.GetPaymentAccessToken(request.CardinalData, language);
            return this.Ok(token);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpPost("transaction-access-token")]
    [RequiresAbility(Ability.MakePayment)]
    public async Task<IActionResult> CreateTransactionAccessToken([FromBody] AccessTokenRequest request, [FromQuery] string? lang = null)
    {
        try
        {
            var language = lang ?? CultureInfo.CurrentCulture.Name;

            if (!this.User.TryResolveRequestedUserId(request.UserId, out var userId))
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

            List<Account>? userAccounts = await this.accountManager.GetLinkedAccountsByUser(user, language);
            if (userAccounts == null || userAccounts.Count == 0 ||
                 (user.PrimaryAccountType == AccountType.Payer && !this.HasLinkedAccount(userAccounts, request.Payer, request.CompanyCode)) ||
                 (user.PrimaryAccountType == AccountType.SoldTo && !this.HasLinkedAccount(userAccounts, request.SelectedAccount, request.CompanyCode)))
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.accountnotallowed", language, "Account not allowed"));
            }
            user.Accounts = userAccounts;

            ClaimsPrincipal userPrincipal = await this.claimsPrincipalFactory.CreateAsync(user);
            AuthorizationResult authorizationResult = await this.authorizationService.AuthorizeAsync(userPrincipal, request.SelectedAccount, UserOperations.UserAccount);
            if (!authorizationResult.Succeeded)
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.accountnotallowed", language, "Account not allowed"));
            }

            SapCustomData? customData = await this.applicationConfigurationManager.GetCustomConfig(language);

            Epay3Service.Models.PaymentMethod? paymentMethod = MapPaymentMethod(request.PaymentMethod, this.applicationSecrets);
            PaymentAccessToken? token = await this.manager.GetAccessToken(
                user,
                request.SelectedAccount,
                request.Payer,
                customData!,
                request?.CardKey ?? "",
                request?.Amount ?? 0,
                request?.Currency ?? "",
                request?.RedirectUri ?? "",
                language,
                paymentMethod,
                request?.CompanyCode);

            if (token != null && !string.IsNullOrWhiteSpace(request.Cvv))
            {
                token.VRef = Encryption.Encrypt(request.Cvv, this.applicationSecrets.CvvEncryptionKey);
            }

            return this.Ok(token);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpPost("guest/payment-method-entry-token")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.GuestPayment)]
    public async Task<IActionResult> CreateGuestPaymentMethodEntryToken([FromBody] PaymentAccessTokenRequest request, [FromQuery] string? lang = null)
    {
        try
        {
            var language = lang ?? CultureInfo.CurrentCulture.Name;

            AddDefaultCardinalData(request);

            PaymentAccessToken? token = await this.manager.GetPaymentAccessToken(request.CardinalData, language);
            return this.Ok(token);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpPost("guest/transaction-access-token")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.GuestPayment)]
    public async Task<IActionResult> CreateGuestTransactionAccessToken([FromBody] GuestTransactionAccessTokenRequest request, [FromQuery] string? lang = null)
    {
        try
        {
            var language = lang ?? CultureInfo.CurrentCulture.Name;
            SapCustomData? customData = await this.applicationConfigurationManager.GetCustomConfig(language);

            PaymentProviderInfo? paymentProvider = GetActiveWorldpayProvider(customData);
            if (paymentProvider?.IsSecure3dsEnabled != true)
            {
                return this.BadRequest("3DS is not enabled for the active payment provider");
            }

            string? secure3dsVersion = paymentProvider.Secure3dsVersion?.Trim();
            if (string.IsNullOrWhiteSpace(secure3dsVersion))
            {
                return this.BadRequest("3DS is enabled but secure3dsVersion is not configured");
            }

            CompanyInfo? companyCode = customData?.CompanyCodes?.FirstOrDefault(
                code => string.Equals(code.CompanyCode, request.Payer.CompanyCode, StringComparison.OrdinalIgnoreCase));
            if (companyCode?.Is3dsDisabled == true)
            {
                return this.BadRequest("3DS is disabled for this company code");
            }

            Dictionary<string, string?> queryParams = BuildGuest3DSAccessTokenRequest(request, secure3dsVersion);
            PaymentAccessToken? token = await this.manager.GetPaymentAccessToken(queryParams, language);

            if (token != null && !string.IsNullOrWhiteSpace(request.Payment.CardValidationCode))
            {
                token.VRef = Encryption.Encrypt(
                    request.Payment.CardValidationCode,
                    this.applicationSecrets.CvvEncryptionKey);
            }

            return this.Ok(token);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpPost("3ds-authentication-result")]
    [RequiresAbility(Ability.MakePayment)]
    public async Task<IActionResult> Get3DSAuthenticationResult([FromBody] ThreeDSAuthenticationResultRequest request, [FromQuery] string? lang = null)
    {
        var language = lang ?? CultureInfo.CurrentCulture.Name;
        return await GetAuthenticationResult(request, language);
    }

    [HttpPost("guest/3ds-authentication-result")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.GuestPayment)]
    public async Task<IActionResult> GetGuest3DSAuthenticationResult([FromBody] ThreeDSAuthenticationResultRequest request, [FromQuery] string? lang = null)
    {
        var language = lang ?? CultureInfo.CurrentCulture.Name;
        return await GetAuthenticationResult(request, language);
    }

    private async Task<IActionResult> GetAuthenticationResult(ThreeDSAuthenticationResultRequest request, string language)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.AccessToken))
            {
                return this.BadRequest("Missing token");
            }

            var tokenReq = new TokenizationRequest
            {
                Action = StringConstant.Tokenization,
                AccessToken = request.AccessToken
            };
            TokenizationResponse? data = await this.manager.GetTokenResponse(tokenReq, language);

            var response = new ThreeDSAuthenticationResultResponse
            {
                CardinalData = data?.Cardinal,
                Status = data?.Status,
                AccessToken = request.AccessToken,
                VRef = data?.VRef,
            };

            return this.Ok(response);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpPost("tokenization-response")]
    [RequiresAbility(Ability.MakePayment)]
    public async Task<TokenizationResponse> GetTokenizationResponse([FromBody] TokenizationRequest request, [FromQuery] string? lang = null)
    {
        var language = lang ?? CultureInfo.CurrentCulture.Name;
        return await ProcessTokenizationResponse(request, language);
    }

    [HttpPost("guest/tokenization-response")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.GuestPayment)]
    public async Task<TokenizationResponse> GetGuestTokenizationResponse([FromBody] TokenizationRequest request, [FromQuery] string? lang = null)
    {
        var language = lang ?? CultureInfo.CurrentCulture.Name;
        return await ProcessTokenizationResponse(request, language);
    }

    private async Task<TokenizationResponse> ProcessTokenizationResponse(TokenizationRequest request, string language)
    {
        TokenizationResponse data = await this.manager.GetTokenResponse(request, language);
        if (data?.PaymentCard != null)
        {
            string originalCardType = data.PaymentCard.Type;
            data.PaymentCard.SapCardType = CardTypeMappingHelper.ToSapCardType(originalCardType);
            data.PaymentCard.GatewayCardType = CardTypeMappingHelper.ToGatewayCardType(originalCardType);
            data.PaymentCard.CardLast4Digit = data.PaymentCard.Token?.Split('-').ElementAtOrDefault(2);

            string encryptedToken = Encryption.Encrypt(data.PaymentCard.Token ?? "", this.applicationSecrets.EncryptionKey);
            if (!string.IsNullOrWhiteSpace(data.PaymentCard.CardValidationCode))
            {
                data.VRef = Encryption.Encrypt(
                    data.PaymentCard.CardValidationCode,
                    this.applicationSecrets.CvvEncryptionKey);
            }

            data.PaymentCard.Token = encryptedToken;
        }
        return data.WithoutCardValidationCode()!;
    }

    private static void AddDefaultCardinalData(PaymentAccessTokenRequest request)
    {
        if (request.CardinalData.Count != 0)
        {
            return;
        }

        request.CardinalData = new Dictionary<string, string?>
        {
            { "action", $"{request.Action}" },
            { "payment_method", $"{request.PaymentMethod}" },
        };
    }

    private Dictionary<string, string?> BuildGuest3DSAccessTokenRequest(GuestTransactionAccessTokenRequest request, string secure3dsVersion)
    {
        CompanyAddress? address = request.BillingAddress ?? request.Payment.AddressData;
        string? paymentToken = request.Payment.PaymentCardToken;
        if (!string.IsNullOrWhiteSpace(paymentToken) && paymentToken.Contains('!'))
        {
            paymentToken = Encryption.Decrypt(paymentToken, this.applicationSecrets.EncryptionKey);
        }

        string? validTo = request.Payment.ValidTo;
        string? expirationMonth = validTo?.Split('-').ElementAtOrDefault(0) ?? string.Empty;
        string? expirationYear = validTo?.Split('-').ElementAtOrDefault(2) ?? string.Empty;
        // Hosted tokenize response doesn't include card expiry; fallback so Cardinal accepts the token
        if (string.IsNullOrWhiteSpace(expirationMonth)) expirationMonth = "12";
        if (string.IsNullOrWhiteSpace(expirationYear)) expirationYear = "2099";
        string? name = request.Payment.PaymentCardName ?? address?.Name;
        string? firstName = name?.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        string? lastName = name?.Split(' ', StringSplitOptions.RemoveEmptyEntries).Skip(1).FirstOrDefault() ?? firstName;

        return new Dictionary<string, string?>
        {
            { "action", "01" },
            { "amount", $"{request.Amount * 100}" },
            { "billing_address1", address?.Street },
            { "billing_city", address?.City },
            { "billing_country_code", $"{PaymetricHelper.GetCountryCode(address?.Country)}" },
            { "billing_email", request.GuestUserEmail },
            { "billing_first_name", firstName },
            { "billing_last_name", lastName },
            { "billing_phone", string.Empty },
            { "mobile_phone", string.Empty },
            { "work_phone", string.Empty },
            { "billing_postal_code", address?.PostalCodeCity },
            { "billing_state", address?.Region },
            { "currency_code", $"{PaymetricHelper.GetCurrencyCode(request.Currency, address?.Country)}" },
            { "order_number", $"{Guid.NewGuid()}" },
            { "shipping_address1", address?.Street },
            { "shipping_city", address?.City },
            { "shipping_country_code", $"{PaymetricHelper.GetCountryCode(address?.Country)}" },
            { "shipping_postal_code", address?.PostalCodeCity },
            { "shipping_state", address?.Region },
            { "threeds_version", secure3dsVersion },
            { "redirect_uri", request.RedirectUri },
            { "payment_card_token", paymentToken },
            { "expiration_month", expirationMonth },
            { "expiration_year", expirationYear },
            { "payment_method", "TO" },
        };
    }

    private static PaymentProviderInfo? GetActiveWorldpayProvider(SapCustomData? customData)
    {
        return customData?.PaymentProviders?.FirstOrDefault(provider =>
            string.Equals(provider.Description, "Worldpay", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(provider.Provider, "PM", StringComparison.OrdinalIgnoreCase))
            ?? customData?.PaymentProviders?.FirstOrDefault();
    }

    private bool HasLinkedAccount(IEnumerable<Account>? accounts, string accountNumber, string? companyCode = null) =>
        this.accountManager.FindLinkedAccount(accounts, accountNumber, companyCode) != null;

    private static Epay3Service.Models.PaymentMethod? MapPaymentMethod(Models.PaymentMethod? apiPaymentMethod, ApplicationSecrets applicationSecrets)
    {
        Epay3Service.Models.PaymentMethod? servicePaymentMethod = null;
        if (apiPaymentMethod != null)
        {
            servicePaymentMethod = new Epay3Service.Models.PaymentMethod
            {
                Name = apiPaymentMethod.Name,
                Key = apiPaymentMethod.Key,
                CardType = CardTypeMappingHelper.ToSapCardType(apiPaymentMethod.CardType),
                SapCardType = CardTypeMappingHelper.ToSapCardType(
                    apiPaymentMethod.SapCardType ?? apiPaymentMethod.CardType),
                GatewayCardType = CardTypeMappingHelper.ToGatewayCardType(
                    apiPaymentMethod.GatewayCardType ?? apiPaymentMethod.CardType),
                Default = apiPaymentMethod.Default,
                Token = Encryption.Decrypt(apiPaymentMethod?.Token ?? "", applicationSecrets?.EncryptionKey ?? ""),
                ValidFrom = apiPaymentMethod?.ValidFrom,
                ValidTo = apiPaymentMethod?.ValidTo
            };
        }

        return servicePaymentMethod;
    }
}


