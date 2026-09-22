using Epay3Net.Authorization;
using Epay3Net.Authorization.Abilities;
using Epay3Net.Custom;
using Epay3Net.Custom.ActionResult;
using Epay3Net.Helper;
using Epay3Net.Models;
using Epay3Net.RateLimiting;
using Epay3Service.Clients.Models;
using Epay3Service.Configuration;
using Epay3Service.Extensions;
using Epay3Service.Helpers;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Data;
using System.Globalization;
using System.Security.Claims;
using System.Security.Cryptography;
using WorldpayAddressValidationServiceClient;

namespace Epay3Net.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class PaymentController(
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

    [HttpGet("methods/{selectedAccount}")]
    [RequiresAnyAbility(Ability.MakePayment, Ability.ManagePaymentMethods)]
    public async Task<IActionResult> GetPaymentMethods([FromRoute] string selectedAccount, [FromQuery] string payer, [FromQuery] string? userId = null, [FromQuery] string? lang = null)
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

            List<Account>? userAccounts = await this.accountManager.GetLinkedAccountsByUser(user, language);
            if (userAccounts == null || userAccounts.Count == 0 ||
                 (user.PrimaryAccountType == AccountType.Payer && !this.HasLinkedAccount(userAccounts, payer)) ||
                 (user.PrimaryAccountType == AccountType.SoldTo && !this.HasLinkedAccount(userAccounts, selectedAccount)))
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.accountnotallowed", language, "Account not allowed"));
            }
            user.Accounts = userAccounts;

            System.Security.Claims.ClaimsPrincipal userPrincipal = await this.claimsPrincipalFactory.CreateAsync(user);
            AuthorizationResult authorizationResult = await this.authorizationService.AuthorizeAsync(userPrincipal, selectedAccount, UserOperations.UserAccount);
            if (!authorizationResult.Succeeded)
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.accountnotallowed", language, "Account not allowed"));
            }

            PayerDetail? data = (await this.manager.GetPayerDetails(user, selectedAccount, payer, language))
                .WithoutCardValidationCodes();

            var response = data?.PaymentCards?.Where(x => x.IsValid)
                .Select(x => new ValidPaymentMethodResponse
                {
                    CardType = x.PaymentCardType,
                    SapCardType = CardTypeMappingHelper.ToSapCardType(x.PaymentCardType),
                    GatewayCardType = CardTypeMappingHelper.ToGatewayCardType(x.PaymentCardType),
                    Token = x.PaymentCardToken,
                    Key = Encryption.Encrypt(x.PaymentCardToken!, this.applicationSecrets.EncryptionKey),
                    Default = !string.IsNullOrEmpty(x.Default) && x.Default == "X",
                    Name = $"{x.PaymentCardType}-{x.CardLast4Digit}-{x.PaymentCardName}",
                    ValidTo = DateTime.TryParseExact(x.ValidTo, "MM-dd-yyyy",
                             CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime date)
                             ? date.ToString("MM/yy")
                             : ""
                }).ToList() ?? new List<ValidPaymentMethodResponse>(); ;

            return this.Ok(response);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpGet("paymentreasoncodes")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.PublicConfig)]
    public async Task<IActionResult> GetPaymentReasonCodes()
    {
        try
        {
            // TODO: GetPaymentReasonCodes() is just a pass-thru for
            // GetCustomConfig().
            // it should either do what it says it does -- extract & return
            // (only) the reason codes -- or be removed.
            List<PaymentReasonCodeInfo>? data = await this.applicationConfigurationManager.GetPaymentReasonCodes();

            return this.Ok(data);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpPost("pay")]
    [RequiresAbility(Ability.MakePayment)]
    public async Task<IActionResult> MakePayment([FromBody] PaymentRequest request, [FromQuery] string? lang = null)
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
                 (user.PrimaryAccountType == AccountType.Payer && !this.HasLinkedAccount(userAccounts, request.Payer)) ||
                 (user.PrimaryAccountType == AccountType.SoldTo && !this.HasLinkedAccount(userAccounts, request.SelectedAccount)))
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.accountnotallowed", language, "Account not allowed"));
            }
            user.Accounts = userAccounts;

            System.Security.Claims.ClaimsPrincipal userPrincipal = await this.claimsPrincipalFactory.CreateAsync(user);
            AuthorizationResult authorizationResult = await this.authorizationService.AuthorizeAsync(userPrincipal, request.SelectedAccount, UserOperations.UserAccount);
            if (!authorizationResult.Succeeded)
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.accountnotallowed", language, "Account not allowed"));
            }

            if (request.Invoices == null || request.Invoices.Count == 0)
            {
                return this.BadRequest(this.languageManager.GetMessage("payment.noinvoices", language, "No invoices"));
            }

            if (request.Invoices.Any(x => x.PaymentAmount == 0))
            {
                return this.BadRequest(this.languageManager.GetMessage("payment.zeroamount", language, "No invoices"));
            }

            string userAgent = this.Request.Headers["User-Agent"].ToString();
            var country = this.Request.Headers["X-Country"].ToString();

            Epay3Service.Models.PaymentMethod? paymentMethod = MapPaymentMethod(request.PaymentMethod, this.applicationSecrets);
            string? cvv = this.ResolveCvv(request.Cvv, request.VRef);

            PaymentReceipt? receipt = await this.manager.MakePayment(user, request.SelectedAccount, request.Payer,request.CompanyCode??"", request.Invoices, cvv, request.CardinalData, userAgent, country, language, paymentMethod);

            return this.Ok(receipt);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpPost("scheduledpayment")]
    [RequiresAbility(Ability.MakePayment)]
    public async Task<IActionResult> ScheduledPayment([FromBody] PaymentRequest request, [FromQuery] string? lang = null)
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
                 (user.PrimaryAccountType == AccountType.Payer && !this.HasLinkedAccount(userAccounts, request.Payer)) ||
                 (user.PrimaryAccountType == AccountType.SoldTo && !this.HasLinkedAccount(userAccounts, request.SelectedAccount)))
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.accountnotallowed", language, "Account not allowed"));
            }
            user.Accounts = userAccounts;

            System.Security.Claims.ClaimsPrincipal userPrincipal = await this.claimsPrincipalFactory.CreateAsync(user);
            AuthorizationResult authorizationResult = await this.authorizationService.AuthorizeAsync(userPrincipal, request.SelectedAccount, UserOperations.UserAccount);
            if (!authorizationResult.Succeeded)
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.accountnotallowed", language, "Account not allowed"));
            }

            if (request.Invoices == null || request.Invoices.Count == 0)
            {
                return this.BadRequest(this.languageManager.GetMessage("payment.noinvoices", language, "No invoices"));
            }

            if (request.Invoices.Any(x => x.PaymentAmount == 0))
            {
                return this.BadRequest(this.languageManager.GetMessage("payment.zeroamount", language, "No invoices"));
            }

            string userAgent = this.Request.Headers["User-Agent"].ToString();
            var country = this.Request.Headers["X-Country"].ToString();

            Epay3Service.Models.PaymentMethod? paymentMethod = MapPaymentMethod(request.PaymentMethod, this.applicationSecrets);
            string? cvv = this.ResolveCvv(request.Cvv, request.VRef);

            SapHttpStatus? receipt = await this.manager.ScheduledPayment(user, request.SelectedAccount, request.Payer, request.CompanyCode??"", request.Invoices, cvv, request.CardinalData, userAgent, country, language, paymentMethod, request.ScheduledDate);

            return this.Ok(receipt);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpPost("deletescheduledpayment")]
    [RequiresAbility(Ability.MakePayment)]
    public async Task<IActionResult> DeleteScheduledPayment([FromBody] DeleteScheduledPaymentRequest request, [FromQuery] string? lang = null)
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
                 (user.PrimaryAccountType == AccountType.Payer && !this.HasLinkedAccount(userAccounts, request.Payer)) ||
                 (user.PrimaryAccountType == AccountType.SoldTo && !this.HasLinkedAccount(userAccounts, request.CustomerNumber)))
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.accountnotallowed", language, "Account not allowed"));
            }
            user.Accounts = userAccounts;

            System.Security.Claims.ClaimsPrincipal userPrincipal = await this.claimsPrincipalFactory.CreateAsync(user);
            AuthorizationResult authorizationResult = await this.authorizationService.AuthorizeAsync(userPrincipal, request.CustomerNumber, UserOperations.UserAccount);
            if (!authorizationResult.Succeeded)
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.accountnotallowed", language, "Account not allowed"));
            }

            string userAgent = this.Request.Headers["User-Agent"].ToString();
            var country = this.Request.Headers["X-Country"].ToString();


            SapHttpStatus? receipt = await this.manager.DeleteSchedulepayment(user, request.ScheduleId, request.Payer, request.CompanyCode, language);

            return this.Ok(receipt);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }


    [HttpPost("deposit")]
    [RequiresAbility(Ability.MakePayment)]
    public async Task<IActionResult> MakeDeposit([FromBody] DepositRequest request, [FromQuery] string? lang = null)
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
                 (user.PrimaryAccountType == AccountType.Payer && !this.HasLinkedAccount(userAccounts, request.Payer)) ||
                 (user.PrimaryAccountType == AccountType.SoldTo && !this.HasLinkedAccount(userAccounts, request.SelectedAccount)))
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.accountnotallowed", language, "Account not allowed"));
            }
            user.Accounts = userAccounts;

            System.Security.Claims.ClaimsPrincipal userPrincipal = await this.claimsPrincipalFactory.CreateAsync(user);
            AuthorizationResult authorizationResult = await this.authorizationService.AuthorizeAsync(userPrincipal, request.SelectedAccount, UserOperations.UserAccount);
            if (!authorizationResult.Succeeded)
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.accountnotallowed", language, "Account not allowed"));
            }

            string userAgent = this.Request.Headers["User-Agent"].ToString();

            if (request?.PaymentMethod != null)
            {
                // Change CardType to "MC" if it's "MASTERCARD" or starts with "MAST"
                if (request.PaymentMethod.CardType.Equals("MASTERCARD", StringComparison.OrdinalIgnoreCase) ||
                    request.PaymentMethod.CardType.StartsWith("MAST", StringComparison.OrdinalIgnoreCase))
                {
                    request.PaymentMethod.CardType = "MC";
                }
            }

            string? cvv = this.ResolveCvv(request.Cvv, request.VRef);

            DepositsResponse receipt = await this.manager.MakeDeposit(user, request.SelectedAccount, request.CompanyCode, request.Payer, request.depositDetails, "", cvv, request.CardinalData, userAgent, language, request.PaymentMethod);

            return this.Ok(receipt);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    private static Epay3Service.Models.PaymentMethod? MapPaymentMethod(Models.PaymentMethod? apiPaymentMethod, ApplicationSecrets applicationSecrets)
    {
        Epay3Service.Models.PaymentMethod? servicePaymentMethod = null;
        if (apiPaymentMethod != null)
        {
            servicePaymentMethod = new Epay3Service.Models.PaymentMethod
            {
                Name = apiPaymentMethod.Name,
                Key = apiPaymentMethod.Key,
                // Change CardType to "MC" if it's "MASTERCARD" or starts with "MAST"
                CardType = (apiPaymentMethod.CardType.Equals("MASTERCARD", StringComparison.OrdinalIgnoreCase) ||
                apiPaymentMethod.CardType.StartsWith("MAST", StringComparison.OrdinalIgnoreCase))
                ? "MC"
                : apiPaymentMethod.CardType,
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

    private string? ResolveCvv(string? requestCvv, string? vRef)
    {
        if (!string.IsNullOrWhiteSpace(requestCvv) || string.IsNullOrWhiteSpace(vRef))
        {
            return requestCvv;
        }

        try
        {
            return Encryption.Decrypt(vRef, this.applicationSecrets.CvvEncryptionKey);
        }
        catch (CryptographicException)
        {
            return null;
        }
        catch (FormatException)
        {
            return null;
        }
        catch (ArgumentException)
        {
            return null;
        }
        catch (IndexOutOfRangeException)
        {
            return null;
        }
    }

    private bool HasLinkedAccount(IEnumerable<Account>? accounts, string accountNumber) =>
        this.accountManager.FindLinkedAccount(accounts, accountNumber) != null;

    [HttpGet("styles")]
    [HttpGet("styles/{m}/{t}/{*u}")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.PublicConfig)]
    public async Task<IActionResult> GetPaymentStyles([FromQuery] string? p, [FromQuery] string? h, [FromQuery] string? s, [FromQuery] string? b, [FromQuery] string? bh, string? m = "CC", string? t = "I", string? u = null)
    {
        // Normalize u from path if it contains .css extension (look static)
        if (!string.IsNullOrEmpty(u) && u.EndsWith(".css", StringComparison.OrdinalIgnoreCase))
        {
            u = u.Substring(0, u.Length - 4);
        }

        // Try to fetch theme based on URL if colors are missing
        if (string.IsNullOrEmpty(p) && !string.IsNullOrEmpty(u))
        {
            var theme = await applicationConfigurationManager.GetThemeForUrl(u);
            if (theme != null)
            {
                p ??= theme.ButtonColor;
                h ??= theme.ButtonHoverColor;
                s ??= theme.ContrastColor;
                b ??= theme.ButtonBorderColor;
                bh ??= theme.ButtonBorderHoverColor;
            }
        }

        // p - Primary, h - Hover, s - Secondary (Text), b - Border, bh - Border Hover, m - Method (CC/EC), t - Type (H/I)
        var css = $@"body {{--p-p: {p ?? "#1B75BB"}; --p-h: {h ?? "#286295"}; --p-s: {s ?? "#0D0D12"}; --p-b: {b ?? "#DFE1E6"}; --p-bh: {bh ?? "#808897"};}}";
        var baseUrl = $"{this.Request.Scheme}://{this.Request.Host}{this.Request.PathBase}";
        var suffix = t?.ToUpper() == "H" ? "hosted" : "iframe";
        var fileName = m?.ToUpper() == "EC" ? $"ec_{suffix}.css" : $"cc_{suffix}.css";
        var importUrl = $"{baseUrl}/assets/paymetric/{fileName}";

        var response = $"@import url('{importUrl}');\n{css}";
        return Content(response, "text/css");
    }
}

