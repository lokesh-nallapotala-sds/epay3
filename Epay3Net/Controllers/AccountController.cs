using Epay3Net.Authorization;
using Epay3Net.Custom;
using Epay3Net.Custom.ActionResult;
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
using Microsoft.Extensions.DependencyInjection;
using MimeKit;
using System.Globalization;
using System.Security.Claims;
using System.Text;

namespace Epay3Net.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class AccountController(
    IAccountManager manager,
    IUserManager userManager,
    IAuthManager authManager,
    IInvoicesManager invoiceManager,
    ILanguageManager languageManager,
    IAuthorizationService authorizationService,
    IHashTokenManager hashTokenManager,
    IMailer mailer,
    ApplicationSecrets secrets,
    IConfiguration config,
    IJwtKeyManager jwtKeyManager
    ) : ControllerBase
{
    private readonly IAccountManager manager = manager;
    private readonly IUserManager userManager = userManager;
    private readonly IAuthManager authManager = authManager;
    private readonly IInvoicesManager invoiceManager = invoiceManager;
    private readonly ILanguageManager languageManager = languageManager;
    private readonly IConfiguration config = config;
    private readonly IAuthorizationService authorizationService = authorizationService;
    private readonly IHashTokenManager hashTokenManager = hashTokenManager;
    private readonly IMailer mailer = mailer;
    private readonly ApplicationSecrets secrets = secrets;
    private readonly IJwtKeyManager jwtKeyManager = jwtKeyManager;
    private readonly IUserClaimsPrincipalFactory<User> claimsPrincipalFactory = new EpayClaimsPrincipalFactory();
    private const int Password_Minimum_Length = 8;

    [HttpGet("relatedaccounts/{account}/{userId?}")]
    public async Task<IActionResult> GetRelatedAccountsAsync(string account, string? userId = null, string? lang = null)
    {
        try
        {
            var language = lang ?? CultureInfo.CurrentCulture.Name;

            if (!this.User.TryResolveRequestedUserId(userId, out var effectiveUserId))
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.tokenfaliure", language, "User not found"));
            }

            if (!this.User.CanAccessRequestedUserId(effectiveUserId))
            {
                return this.Forbid();
            }

            User? user = await this.userManager.GetUserById(effectiveUserId, language);
            if (user == null)
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.tokenfaliure", language, "User not found"));
            }

            List<Account>? userAccounts = await this.manager.GetLinkedAccountsByUser(user);
            if (userAccounts == null || userAccounts.Count == 0)
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.accountnotallowed", language, "Account not allowed"));
            }

            Account? selectedAccount = this.manager.FindLinkedAccount(userAccounts, account);
            if (selectedAccount == null)
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.accountnotallowed", language, "Account not allowed"));
            }

            user.Accounts = userAccounts;

            System.Security.Claims.ClaimsPrincipal userPrincipal = userId.IsNullOrEmpty()
                ? this.User
                : await this.claimsPrincipalFactory.CreateAsync(user);
            AuthorizationResult authorizationResult = await this.authorizationService.AuthorizeAsync(userPrincipal, account, UserOperations.UserAccount);
            if (!authorizationResult.Succeeded && user.Role.Equals("user", StringComparison.CurrentCultureIgnoreCase))
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.accountnotallowed", CultureInfo.CurrentCulture.Name, "Account not allowed"));
            }

            List<RelatedAccount>? list = await this.manager.GetRelatedAccounts(user, selectedAccount, CultureInfo.CurrentCulture.Name);
            if (list == null || list.Count == 0)
            {
                throw new Exception(this.languageManager.GetMessage("error.user.norelatedaccounts", CultureInfo.CurrentCulture.Name, "No Related Accounts"));
            }

            return this.Ok(list);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }
    [HttpPost("autoregister")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.AuthSensitive)]
    public async Task<IActionResult> AutoRegisterCreateUser([FromBody] AutoRegisterRequest request)
    {
        User userForm = request.User;
        var requireEmailValidation = this.config.GetValue("Registration:RequireEmailConfirmation", false);
        var language = this.Request.Headers["Accept-Language"].ToString() ?? "en";
        if (string.IsNullOrWhiteSpace(language))
        {
            language = "en";
        }
        userForm.Email = userForm.Email?.ToLower() ?? "";
        User? checkUser = await this.userManager.GetUserByEmail(userForm.Email);
        if (checkUser != null)
        {
            return this.BadRequest(new { Message = "Account with Email already exists." });
        }

        var user = new User();
        user.FirstName = userForm.FirstName;
        user.LastName = userForm.LastName;
        user.Email = userForm.Email;
        user.Login = userForm.Email;
        user.Company = userForm.Company;
        user.PrimaryAccountType = userForm.PrimaryAccountType; // Payer all for Schindler right now.
        user.Role = userForm.Role;
        user.Password = userForm.Password;
        if (!user.Password.IsNullOrEmpty())
        {
            if (!Hash.IsComplex(user.Password))
            {
                return this.BadRequest(this.languageManager.GetMessage("user.password.invalid.message", language, "Not a valid password").Replace("{minLength}", Convert.ToString(Password_Minimum_Length)));
            }
            user.PasswordSalt = Salt.Create();
            user.PasswordHash = Hash.Create(userForm.Password, user.PasswordSalt);
        }
        EmailError? emailError = null;
        // Create User
        if (requireEmailValidation)
        {
            user.Status = TextConstant.WaitingConfirmation;
            string guidToken = Guid.NewGuid().ToString();
            var country = this.Request.Headers["X-Country"].ToString();

            try
            {
                var simpleToken = await this.hashTokenManager.GetSimpleToken(
                    guidToken,
                    this.secrets.RegistrationKey
                );

                user.ConfirmationToken = simpleToken;
                await this.mailer.SendRegistrationConfirmation(
                    language,
                    userForm.FirstName ?? "",
                    new MailboxAddress(user.Email, user.Email),
                    simpleToken,
                    country
                );
            }
            catch (Exception ex)
            {
                emailError = new EmailError
                {
                    Code = "warning.email.sending",
                    Message = "There was an issue sending the confirmation email. Please contact customer service."
                };
            }
        }
        else
        {
            user.Status = "active";
        }
        //TODO: need to handle the case where the create and/or fetch below fail/return null
        User? newUser = await this.userManager.CreateUser(user);
        if (newUser == null)
        {
            return StatusCode(StatusCodes.Status500InternalServerError,
                new
                {
                    Message = this.languageManager.GetMessage("user.register.create_error", language, "Account Creation Failed")
                });
        }
        user = await this.userManager.GetUserByEmail(newUser?.Email?.ToLower() ?? "");

        if (user != null)
        {
            user.Claims ??= new List<Claim>();
            user.Claims.AddRange(user.GetMetainfoClaims());
            user.Claims.AddRange(user.GetAbilityClaims());
        }

        // copy all admins to local storage to be available offline
        //  await _blackoutService.UpdateBlackoutAdmins(); //Need to revisit
        try
        {
            foreach (ValidateInvoiceAccount account in request.Accounts)
            {
                await this.SaveVerifiedAccount(account, user.UserId);
            }
        }
        catch (Exception e)
        {
            Console.Out.WriteLine(e.Message);
        }

        var (keyBytes, kid) = await this.jwtKeyManager.GetActiveKeyAsync();
        var token = JwtTokenHelper.GetAuthToken(user, keyBytes, kid);

        return this.Ok(new
        {
            token,
            emailError
        });
    }

    private async Task SaveVerifiedAccount(ValidateInvoiceAccount validAccount, string userId)
    {
        var account = new Account
        {
            Division = validAccount.InvoiceDetail.HeaderData.Division,
            SalesOrganization = validAccount.InvoiceDetail.HeaderData.SalesOrganization,
            DistributionChannel = validAccount.InvoiceDetail.HeaderData.DistributionChannel,
            CompanyCode = validAccount.InvoiceDetail.HeaderData?.CompanyCode,
            UserId = userId,
        };


        // For schindler we need to get partner RG
        InvoicePartnerData? partner = validAccount.InvoiceDetail.PartnerData.FirstOrDefault(p => p.PartnerFunction == "RG");

        if (partner == null)
        {
            return;
        }

        account.PrimaryAcct = partner.PartnerNumber.TrimStart(new Char[] { '0' });
        account.AccountTypeId = this.config.GetValue("Registration:SAPAccountType", "master");

        account.UserId = userId;
        await this.manager.CreateAccount(account);
    }

    [HttpPost("validate")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.AuthSensitive)]
    public async Task<ActionResult<object>> ValidateAccount([FromBody] ValidateInvoiceAccount validate)
    {
        var attempts = this.HttpContext.Session.GetInt32("USER_ACCOUNTS_ATTEMPTS") ?? 0;
        if (attempts < 10)
        {
            (InvoiceDetailResponse invoice, bool matches, string error) = await this.VerifyAccountMatches(validate);
            if (!string.IsNullOrEmpty(error))
            {
                return this.BadRequest(new { Message = error });
            }

            string companyCode = invoice.Detail.HeaderData.CompanyCode;
            if (matches && !string.IsNullOrWhiteSpace(companyCode))
            {
                validate.InvoiceDetail = invoice.Detail;
                this.HttpContext.Session.SetInt32("USER_ACCOUNTS_ATTEMPTS", 0);
                return this.Ok(new { Success = true, Invoice = invoice, Account = validate });
            }

            attempts++;
            this.HttpContext.Session.SetInt32("USER_ACCOUNTS_ATTEMPTS", attempts);

            return this.NotFound();
        }

        return this.BadRequest(new { Message = "Too many failed attempts", Key = "too-many-attempts" });
    }

    private async Task<(InvoiceDetailResponse, bool, string)> VerifyAccountMatches(ValidateInvoiceAccount validate)
    {
        try
        {
            var documentDetail = new DocumentDetail()
            {
                CustomerNumber = validate.AccountNumber,
                DocumentNumber = validate.InvoiceNumber,
                DocumentType = "01",
            };
            InvoiceDetailResponse? invoice = await this.invoiceManager.GetInvoiceDetails(documentDetail);

            if (invoice.Detail == null)
            {
                return (null, false, "Invoice details not found");
            }

            var totalMatches = invoice.Detail.HeaderData.TotalAmount == validate.InvoiceAmount;
            var accountMatches = false;
            var matchSoldTo = this.config.GetValue("Registration:MatchSoldTo", true);
            if (matchSoldTo)
            {
                accountMatches = invoice.Detail.HeaderData.SoldtoNumber.TrimStart(new Char[] { '0' }) ==
                                 validate.AccountNumber.TrimStart(new Char[] { '0' });
                if (!accountMatches)
                {
                    InvoicePartnerData? partner = invoice.Detail.PartnerData.FirstOrDefault(p => p.PartnerFunction == "RG");
                    if (partner != null)
                    {
                        accountMatches = partner.PartnerNumber.TrimStart(new Char[] { '0' }) ==
                                         validate.AccountNumber.TrimStart(new Char[] { '0' });
                    }
                }
            }

            var matches = totalMatches && accountMatches;
            return (invoice, matches, null);
        }
        catch (Exception ex)
        {
            var logger = this.HttpContext.RequestServices?.GetService<ILogger<AccountController>>();
            logger?.LogError(ex, "Account validation failed while verifying invoice ownership.");

            return (null, false, "Unable to validate account at this time.");
        }
    }


    [Route("auto-register/resend-confirmation")]
    [HttpPut]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.AuthSensitive)]
    public async Task<IActionResult> ResendConfirmation([FromQuery] string email)
    {
        User? user = await this.userManager.GetUserByEmail(email?.ToLower() ?? "");
        EmailError? emailError = null;
        if (user != null)
        {
            user.UpdatedDate = DateTime.Now.ToString();

            var language = this.Request.Headers["Accept-Language"].ToString();
            var country = this.Request.Headers["X-Country"].ToString();
            try
            {
                var simpleToken = await this.hashTokenManager.GetSimpleToken(user.ConfirmationToken ?? "", this.secrets.RegistrationKey);

                await this.mailer.SendRegistrationConfirmation(language, user.FirstName ?? "", new MailboxAddress(user.Email, user.Email), simpleToken, country);
            }
            catch
            {
                emailError = new EmailError
                {
                    Code = "warning.email.sending",
                    Message = "There was an issue sending the confirmation email. Please contact customer service."
                };
            }

        }
        return this.Ok(new
        {
            emailError
        });
    }


    [HttpPost("admin/recovery")]
    [AllowAnonymous]
    [RequireAdminAccessKey]
    [EnableRateLimiting(RateLimitPolicyNames.AuthSensitive)]
    public async Task<IActionResult> AdminRecoveryUser([FromBody] AdminRecoveryRequest request)
    {
        try
        {
            if (request.Mode != "C")
            {
                return this.BadRequest("Recovery mode must use the recovery start endpoint.");
            }

            if (request.Mode == "C")
            {
                if (string.IsNullOrEmpty(request.Firstname) || string.IsNullOrEmpty(request.Lastname)
                    || string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Company))
                {
                    throw new Exception("Missing fields for usr creation");
                }
            }

            if (string.IsNullOrEmpty(request.Password))
            {
                throw new Exception("Password is missing");
            }

            if (!Hash.IsComplex(request.Password))
            {
                var language = this.Request.Headers["Accept-Language"].ToString() ?? "en";
                return this.BadRequest(this.languageManager.GetMessage("user.password.invalid.message", language, "Not a valid password").Replace("{minLength}", Convert.ToString(Password_Minimum_Length)));
            }
            Status? status = await this.userManager.RecoverUser(request.Key, request.User, request.Mode);
            if (status.MessageType != "S")
            {
                throw new Exception(status.MessageLineString);
            }

            if (request.Mode == "C")
            {
                User? user = await this.userManager.GetUserByLogin(request.User);
                if (user != null)
                {
                    throw new Exception("User with this username already exists");
                }

                user = await this.userManager.GetUserByEmail(request.Email?.ToLower() ?? "");
                if (user != null)
                {
                    throw new Exception("User with this email address already exists");
                }

                user = new User();
                user.FirstName = request.Firstname;
                user.LastName = request.Lastname;
                user.Email = request.Email?.ToLower() ?? "";
                user.Login = request.User?.ToLower() ?? "";
                user.Company = request.Company;
                user.PrimaryAccountType = request.AccountType;
                user.Role = request.Role;
                user.Status = "active";
                var salt = Salt.Create();
                var hash = Hash.Create(request.Password, salt);
                user.PasswordSalt = salt;
                user.PasswordHash = hash;
                user.InviteToken = null;
                user.LastPasswordChange = DateTime.UtcNow;

                await this.userManager.CreateUser(user);
            }

            await this.SendAdminRecoveryInformationEmail(
                "create",
                request.User,
                "success",
                $"Endpoint: POST /api/account/admin/recovery\nEmail: {request.Email}\nRole: {request.Role}\nAccountType: {request.AccountType}");

            return this.Ok("User recoverd successfully");
        }
        catch (Exception ex)
        {
            await this.SendAdminRecoveryInformationEmail(
                "create",
                request.User,
                "failure",
                ex.Message);

            return new ExceptionResult(ex);
        }
    }

    [HttpPost("admin/recovery/start")]
    [AllowAnonymous]
    [RequireAdminAccessKey]
    [EnableRateLimiting(RateLimitPolicyNames.AuthSensitive)]
    public async Task<IActionResult> StartAdminRecovery([FromBody] AdminRecoveryStartRequest request)
    {
        try
        {
            Status? status = await this.userManager.RecoverUser(request.Key, request.User, "R");
            if (status?.MessageType != "S")
            {
                throw new Exception(status?.MessageLineString ?? "Recovery could not be started");
            }

            User? user = await this.userManager.GetUserByLogin(request.User);
            if (user == null)
            {
                throw new Exception("User could not be recovered");
            }

            string resetToken = Guid.NewGuid().ToString();
            user.PasswordResetToken = resetToken;
            await this.userManager.UpdateUser(user);
            await this.authManager.UpdateLogonStatus(user, LoginStatusAction.PasswordReset);

            await this.SendAdminRecoveryInformationEmail(
                "recover",
                request.User,
                "success",
                $"Endpoint: POST /api/account/admin/recovery/start\nEmail: {user.Email}\nUserId: {user.UserId}");

            return this.Ok(new
            {
                resetToken
            });
        }
        catch (Exception ex)
        {
            await this.SendAdminRecoveryInformationEmail(
                "recover",
                request.User,
                "failure",
                ex.Message);

            return new ExceptionResult(ex);
        }
    }

    private async Task SendAdminRecoveryInformationEmail(string action, string username, string status, string details)
    {
        try
        {
            await this.mailer.SendAdminRecoveryInformationEmail(action, username, status, details);
        }
        catch
        {
            // Best-effort notification only; do not affect the recovery flow.
        }
    }


}
