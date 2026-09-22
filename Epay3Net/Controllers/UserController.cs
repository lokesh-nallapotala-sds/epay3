using Epay3Net.Custom.ActionResult;
using Epay3Net.Authorization;
using Epay3Net.Authorization.Abilities;
using Epay3Net.Models;
using Epay3Net.RateLimiting;
using Epay3Service.Configuration;
using Epay3Service.Extensions;
using Epay3Service.Helpers;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MimeKit;
using System.Globalization;
using System.Security.Claims;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Epay3Net.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class UserController(
    IConfiguration configuration,
    IUserManager manager,
    IAuthManager authManager,
    IAccountManager accountManager,
    IInvoicesManager invoiceManager,
    ILanguageManager languageManager,
    ILogger<UserController> logger,
    IMailer mailer,
    ApplicationSecrets secrets,
    IJwtKeyManager jwtKeyManager
    ) : ControllerBase
{
    private readonly IUserManager manager = manager;
    private readonly IAuthManager authManager = authManager;
    private readonly IAccountManager accountManager = accountManager;
    private readonly IInvoicesManager invoiceManager = invoiceManager;
    private readonly ILanguageManager languageManager = languageManager;
    private readonly IConfiguration configuration = configuration;
    private readonly ILogger<UserController> logger = logger;
    private readonly IMailer mailer = mailer;
    private readonly ApplicationSecrets secrets = secrets;
    private readonly IJwtKeyManager jwtKeyManager = jwtKeyManager;

    private readonly string[] validCreateStatuses = { "active", "deactive", "locked", "waiting-confirmation", };  //consider removing `deactive` and `locked`
    private readonly string[] validUpdateStatuses = { "active", "deactive", "locked", "waiting-confirmation", };  //consider removing `waiting-confirmation`
    private readonly string[] validAccountTypes = { "Payer", "SoldTo", };
    private readonly string[] validRoles = { "admin", "manager", "internal", "user", };

    private readonly Regex emailValidationRE = new(@"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    [HttpGet("")]
    [RequiresAbility(Ability.ViewUsers)]
    public async Task<IActionResult> GetUsers()
    {
        try
        {
            IList<User> users = await this.manager.GetUsers() ?? [];
            foreach (var item in users)
            {
                item.Login = item.Login?.ToLower();
                item.Email = item.Email?.ToLower();
            }
            return this.Ok(users.Select(UserView.FromUser).ToList());
        }
        catch (Exception ex)
        {
            this.logger.LogError("GetUsers(): error: {0}", ex);
            return this.StatusCode(StatusCodes.Status500InternalServerError);
        }
    }

    [HttpGet("GetById")]
    public async Task<IActionResult> GetById([FromQuery] string? userId = null)
    {
        if (string.IsNullOrEmpty(userId))
        {
            return this.BadRequest();
        }

        if (!this.User.CanAccessRequestedUserId(userId))
        {
            return this.Forbid();
        }

        try
        {
            User? user = await this.manager.GetUserById(userId!);
            if (user == null)
            {
                return this.NotFound();
            }

            return this.Ok(UserView.FromUser(user));
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }


    [HttpGet("accounts")]
    public async Task<IActionResult> GetUserAccounts(string? userId = null, bool forceRefresh = false)
    {
        try
        {
            if (string.IsNullOrEmpty(userId))
            {
                userId = this.User.GetCurrentUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return this.StatusCode(
                        StatusCodes.Status403Forbidden,
                        this.languageManager.GetMessage("error.user.tokenfaliure", CultureInfo.CurrentCulture.Name, "Id not found"));
                }
            }
            else if (!this.User.CanAccessRequestedUserId(userId))
            {
                return this.Forbid();
            }

            User? user = await this.manager.GetUserById(userId, CultureInfo.CurrentCulture.Name);

            if (user == null)
            {
                return this.StatusCode(
                    StatusCodes.Status403Forbidden,
                    this.languageManager.GetMessage("error.user.tokenfaliure", CultureInfo.CurrentCulture.Name, "User not found"));
            }

            List<AccountView> accountViews = await this.accountManager.GetAccountViewsByUser(user, CultureInfo.CurrentCulture.Name, forceRefresh);
            List<UserAccountDto> accounts = this.MapAccountViewsToResponse(accountViews);
            this.PrepareAccountsForResponse(accounts);

            return this.Ok(new UserAccountsResponse
            {
                Accounts = accounts
            });
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpPost("create")]
    [RequiresAbility(Ability.ManageUsers)]
    public async Task<IActionResult> Create([FromBody] AddChangeUserRequest request, [FromQuery] string? lang = null)
    {
        if (request == null)
        {
            return this.BadRequest();
        }

        request.Login = request.Login?.ToLower() ?? "";
        request.Email = request.Email?.ToLower() ?? "";

        try
        {
            ClaimsPrincipal currentUser = this.HttpContext.User;
            var language = lang ?? CultureInfo.CurrentCulture.Name;
            var country = Request.Headers["X-Country"].ToString();

            IList<string> errors = await this.ValidateCreateUserRequest(request, currentUser, language);
            if (errors.Count > 0)
            {
                return this.BadRequest(string.Join("\n", errors));
            }

            var userToCreate = new User()  //maybe do this via AutoMapper or similar?
            {
                Login = request.Login,
                FirstName = request.FirstName,
                LastName = request.LastName,
                Email = request.Email,
                Company = request.Company,
                Status = request.Status,
                PrimaryAccountType = request.PrimaryAccountType,
                Role = request.Role,
            };

            //TODO: there are two user-creation workflows:
            // 1. create the user all at once
            // 2. create the user and send them a confirmation email (like self-registration)
            // we need to accommodate both of these
            // -- but that may have to wait until after we implement self-registration
            if (!string.IsNullOrWhiteSpace(request.Password))
            {
                userToCreate.PasswordSalt = Salt.Create();
                userToCreate.PasswordHash = Hash.Create(request.Password, userToCreate.PasswordSalt);
            }
            var (keyBytes, kid) = await this.jwtKeyManager.GetActiveKeyAsync();
            var token = JwtTokenHelper.GetAuthToken(userToCreate, keyBytes, kid);
            EmailError emailErrorObj = null;
            if (request.Status == "waiting-confirmation")
            {
                try
                {
                    userToCreate.ConfirmationToken = token;
                    if (string.IsNullOrWhiteSpace(request.Password))
                    {
                        userToCreate.InviteToken = token;
                        await this.mailer.SendInviteEmail(language, userToCreate?.FirstName ?? "",
                            new MailboxAddress(userToCreate?.FirstName + " " + userToCreate?.LastName, userToCreate?.Email),
                            userToCreate?.InviteToken ?? "", country);
                    }
                    else
                    {
                        await this.mailer.SendRegistrationConfirmation(language, userToCreate.FirstName ?? "", new MailboxAddress(userToCreate.Email, userToCreate.Email),
                            userToCreate.ConfirmationToken, country);
                    }
                }
                catch
                {
                    emailErrorObj = new EmailError
                    {
                        Code = "warning.email.sending",
                        Message = "There was an issue sending the confirmation email. Please contact support."
                    };
                }
            }

            if (userToCreate == null)
            {
                return BadRequest("User details are missing.");
            }

            User? createdUser = await this.manager.CreateUser(userToCreate, language);

            return this.Ok(new
            {
                user = createdUser,
                emailError = emailErrorObj
            });
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }
   

    [HttpPut("update")]
    [RequiresAbility(Ability.ManageUsers)]
    public async Task<IActionResult> Update([FromBody] AddChangeUserRequest request, [FromQuery] string? lang = null)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.UserId))
        {
            return this.BadRequest();
        }

        request.Email = request.Email?.ToLower() ?? "";
        request.Login = request.Login?.ToLower() ?? "";
        try
        {
            ClaimsPrincipal currentUser = this.HttpContext.User;
            var language = lang ?? CultureInfo.CurrentCulture.Name;

            IList<string> errors = await this.ValidateUpdateUserRequest(request, currentUser, language);
            if (errors.Count > 0)
            {
                return this.BadRequest(string.Join("\n", errors));
            }

            User? userToUpdate = await this.manager.GetUserById(request.UserId);
            if (userToUpdate == null)
            {
                return this.NotFound();
            }
            userToUpdate.Login = request.Login;
            userToUpdate.FirstName = request.FirstName;
            userToUpdate.LastName = request.LastName;
            userToUpdate.Email = request.Email;
            userToUpdate.Company = request.Company;
            userToUpdate.Status = request.Status;
            userToUpdate.PrimaryAccountType = request.PrimaryAccountType;
            userToUpdate.Role = request.Role;
            userToUpdate.RegionalFormat = request.RegionalFormat;

            if (!string.IsNullOrWhiteSpace(request.Password))
            {
                userToUpdate.PasswordSalt = Salt.Create();
                userToUpdate.PasswordHash = Hash.Create(request.Password, userToUpdate.PasswordSalt);
                userToUpdate.LastPasswordChange = DateTime.UtcNow;
            }
            User? updatedUser = await this.manager.UpdateUser(userToUpdate);

            return this.Ok(updatedUser);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpPost("changepassword")]
    public async Task<IActionResult> ChangePassword([FromBody] PasswordChangeRequest request, [FromQuery] string? lang = null)
    {
        try
        {
            var language = lang ?? CultureInfo.CurrentCulture.Name;
            string resultMsg;

            if (request.NewPassword != request.NewPasswordConfirmation)
            {
                resultMsg = this.languageManager.GetMessage("settings.account.reset_password.new_password_mismatch", language, "New password and confirmation do not match.");
                return this.BadRequest(new { message = resultMsg });
            }

            if (request.NewPassword == request.CurrentPassword)
            {
                resultMsg = this.languageManager.GetMessage("settings.account.reset_password.new_password_mismatch", language, "New password must differ from current password.");
                return this.BadRequest(new { message = resultMsg });
            }

            if (!this.ValidatePasswordComplexity(request.NewPassword!, out string complexityError, language))
            {
                return this.BadRequest(new { message = complexityError });
            }

            User? user = await this.authManager.ValidateLogin(this.User.Identity?.Name ?? "", request.CurrentPassword!);
            if (user == null)
            {
                resultMsg = this.languageManager.GetMessage("settings.account.reset_password.password_incorrect", language, "Current password is incorrect.");
                return this.Unauthorized(new { message = resultMsg });
            }

            user.PasswordSalt = Salt.Create();
            user.PasswordHash = Hash.Create(request.NewPassword!, user.PasswordSalt);
            user.LastPasswordChange = DateTime.UtcNow;

            var country = this.Request.Headers["X-Country"].ToString();
            EmailError emailErrorObj = null;
            User status = await this.manager.UpdateUser(user, language);
            await this.authManager.UpdateLogonStatus(user, LoginStatusAction.PasswordChanged);
            try
            {
                await this.mailer.SendPasswordChangedEmail(language, user.FirstName,
                new MailboxAddress(user.FirstName + " " + user.LastName, user.Email),
                user.PasswordResetToken, country);
            }
            catch (Exception)
            {
                emailErrorObj = new EmailError
                {
                    Code = "EMAIL_TEMPLATE_MISSING",
                    Message = "Email template missing"
                };
            }


            resultMsg = this.languageManager.GetMessage("app.common.success", language, "Success");
            return this.Ok(new
            {
                message = resultMsg,
                emailError = emailErrorObj
            });
        }
        catch (Exception ex)
        {
            this.logger.LogError($"ChangePassword(): error: {ex.Message}");
            return new ExceptionResult(ex);
        }
    }

    /// <summary>
    /// Self-service profile update (name / company / regional format). Unlike
    /// <see cref="Update"/> this is NOT gated on <see cref="Ability.ManageUsers"/> —
    /// any authenticated user may update their own profile. Email is intentionally
    /// excluded here; it goes through the verified <see cref="RequestEmailChange"/> flow.
    /// </summary>
    [HttpPut("update-profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request, [FromQuery] string? lang = null)
    {
        if (request == null)
        {
            return this.BadRequest();
        }

        if (!this.User.TryResolveRequestedUserId(request.UserId, out string? userId)
            || !this.User.CanAccessRequestedUserId(userId))
        {
            return this.Forbid();
        }

        try
        {
            var language = lang ?? CultureInfo.CurrentCulture.Name;

            var errors = new List<string>();
            this.CheckRequired(errors, request.FirstName, "user.error.givenname", "First Name is required", language);
            this.CheckRequired(errors, request.LastName, "user.error.surname", "Last Name is required", language);
            this.CheckRequired(errors, request.Company, "user.error.company", "Company is required", language);
            if (errors.Count > 0)
            {
                return this.BadRequest(string.Join("\n", errors));
            }

            User? userToUpdate = await this.manager.GetUserById(userId);
            if (userToUpdate == null)
            {
                return this.NotFound();
            }

            // Whitelist: only self-editable profile fields are touched. Login, email,
            // role, status and password are deliberately left untouched here.
            userToUpdate.FirstName = request.FirstName;
            userToUpdate.LastName = request.LastName;
            userToUpdate.Company = request.Company;
            if (!string.IsNullOrWhiteSpace(request.RegionalFormat))
            {
                userToUpdate.RegionalFormat = request.RegionalFormat;
            }

            User? updatedUser = await this.manager.UpdateUser(userToUpdate);

            return this.Ok(updatedUser);
        }
        catch (Exception ex)
        {
            this.logger.LogError($"UpdateProfile(): error: {ex.Message}");
            return new ExceptionResult(ex);
        }
    }

    /// <summary>
    /// Self-service email change — step 1. Validates the new email and sends a
    /// verification link to it. The email is only applied once the recipient
    /// clicks that link (see <c>AuthController.ConfirmEmailChange</c>).
    /// </summary>
    [HttpPost("request-email-change")]
    [EnableRateLimiting(RateLimitPolicyNames.AuthSensitive)]
    public async Task<IActionResult> RequestEmailChange([FromBody] EmailChangeRequest request, [FromQuery] string? lang = null)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.NewEmail))
        {
            return this.BadRequest();
        }

        if (!this.User.TryResolveRequestedUserId(request.UserId, out string? userId)
            || !this.User.CanAccessRequestedUserId(userId))
        {
            return this.Forbid();
        }

        var language = lang ?? CultureInfo.CurrentCulture.Name;
        string newEmail = request.NewEmail.Trim().ToLower();

        try
        {
            User? user = await this.manager.GetUserById(userId);
            if (user == null)
            {
                return this.NotFound();
            }

            // Re-authenticate: email is also the login, so an email change is a
            // credential change. Require the caller's current password so a hijacked
            // session alone cannot take over the account.
            // NB: 422 (not 401) — the global client interceptor force-logs-out on any
            // 401, and this is an app-level validation failure, not an expired session.
            if (string.IsNullOrWhiteSpace(request.CurrentPassword)
                || await this.authManager.ValidateLogin(user.Login ?? "", request.CurrentPassword, language) == null)
            {
                return this.UnprocessableEntity(
                    this.languageManager.GetMessage(
                        "settings.account.reset_password.password_incorrect", language,
                        "Current password is incorrect."));
            }

            var errors = new List<string>();
            if (!this.emailValidationRE.IsMatch(newEmail))
            {
                errors.Add(this.languageManager.GetMessage("user.error.email.bad", language, "Email is invalid"));
            }
            else if (string.Equals(newEmail, user.Email, StringComparison.OrdinalIgnoreCase))
            {
                errors.Add(this.languageManager.GetMessage("user.error.email.same", language, "New email must differ from the current email"));
            }
            // Email and login (User ID) are the same value, so the new address must be
            // free as both an email and a login.
            else if (await this.manager.GetUserByEmail(newEmail) != null || await this.manager.GetUserByLogin(newEmail) != null)
            {
                errors.Add(this.languageManager.GetMessage("user.error.email.exists", language, "A user with the specified email already exists"));
            }

            if (errors.Count > 0)
            {
                return this.BadRequest(string.Join("\n", errors));
            }

            // Stateless token: encode the target user + new email in a signed,
            // short-lived JWT. No pending-change state needs to be stored in SAP.
            string payload = JsonSerializer.Serialize(new EmailChangePayload { UserId = userId, NewEmail = newEmail });
            string token = HashTokenService.GetSimpleToken(payload, this.secrets.RegistrationKey);

            var country = this.Request.Headers["X-Country"].ToString();
            EmailError? emailErrorObj = null;
            try
            {
                await this.mailer.SendEmailChangeVerification(
                    language,
                    user.FirstName ?? "",
                    new MailboxAddress(user.FirstName + " " + user.LastName, newEmail),
                    token,
                    country);
            }
            catch (Exception)
            {
                emailErrorObj = new EmailError
                {
                    Code = "warning.email.sending",
                    Message = "There was an issue sending the confirmation email. Please contact support."
                };
            }

            return this.Ok(new
            {
                emailError = emailErrorObj
            });
        }
        catch (Exception ex)
        {
            this.logger.LogError($"RequestEmailChange(): error: {ex.Message}");
            return new ExceptionResult(ex);
        }
    }

    [HttpDelete("{userId?}")]
    [RequiresAbility(Ability.ManageUsers)]
    public async Task<IActionResult> Delete(string userId)
    {
        try
        {
            if (userId.IsNullOrEmpty())
            {
                return this.BadRequest();
            }

            User? user = await this.manager.GetUserById(userId);
            if (user == null)
            {
                return this.NotFound();
            }

            await this.manager.DeleteUser(user);

            return this.Ok();
        }
        catch (Exception ex)
        {
            this.logger.LogError($"Delete(): error: {ex.Message}");
            return new ExceptionResult(ex);
        }
    }

    [HttpPost("{userId}/accounts/addmanual")]
    [RequiresAllAbilities(Ability.ManageUsers, Ability.ManageLinkedSAPAccounts)]
    public async Task<IActionResult> AddAccountManual(
        [FromRoute] string userId,
        [FromBody] Account account,
        [FromQuery] string? lang = null
    )
    {
        try
        {
            var language = lang ?? CultureInfo.CurrentCulture.Name;

            if (userId.IsNullOrEmpty())
            {
                return this.BadRequest();
            }

            User? user = await this.manager.GetUserById(userId, CultureInfo.CurrentCulture.Name);

            if (user == null)
            {
                return this.StatusCode(
                    StatusCodes.Status403Forbidden,
                    this.languageManager.GetMessage("error.user.tokenfaliure", language, "User not found"));
            }

            // any additional validation needed here? (there's some built into the SAP endpoint)

            List<Account>? accounts = await this.accountManager.GetAccountsByUser(user, language, forceRefresh: true);

            Account? existingAccount = accounts.EmptyIfNull()
                                    .FirstOrDefault(ua => ua.PrimaryAcct == account.PrimaryAcct &&
                                                       ua.CompanyCode == account.CompanyCode &&
                                                       ua.SalesOrganization == account.SalesOrganization &&
                                                       ua.DistributionChannel == account.DistributionChannel &&
                                                       ua.Division == account.Division);
            if (existingAccount != null)
            {
                return this.BadRequest(this.languageManager.GetMessage("user.account.error.exists", language, "Account already exists"));
            }

            account.UserId ??= userId;

            Account? createdAccount = await this.accountManager.CreateAccount(account);

            return this.Ok(createdAccount);
        }
        catch (Exception ex)
        {
            this.logger.LogError($"AddAccountManual(): error: {ex.Message}");
            return new ExceptionResult(ex);
        }
    }

    [HttpPost("{userId}/accounts/addbyinvoice")]
    [RequiresAllAbilities(Ability.ManageUsers, Ability.ManageLinkedSAPAccounts)]
    public async Task<IActionResult> AddAccountByInvoice(
        [FromRoute] string userId,
        [FromBody] InvoiceAccountRequest accountRequest,
        [FromQuery] string? lang = null
    )
    {
        try
        {
            var language = lang ?? CultureInfo.CurrentCulture.Name;

            if (userId.IsNullOrEmpty())
            {
                return this.BadRequest();
            }

            User? user = await this.manager.GetUserById(userId, CultureInfo.CurrentCulture.Name);

            if (user == null)
            {
                return this.StatusCode(
                    StatusCodes.Status403Forbidden,
                    this.languageManager.GetMessage("error.user.tokenfaliure", language, "User not found"));
            }

            var documentDetail = new DocumentDetail()
            {
                CustomerNumber = accountRequest.AccountNumber,
                DocumentNumber = accountRequest.InvoiceNumber,
                DocumentType = "01",  //TODO: is this the only doc type for invoices?
            };

            InvoiceDetailResponse? invoiceResponse = await this.invoiceManager.GetInvoiceDetails(documentDetail);
            InvoiceDetail? invoiceDetail = invoiceResponse?.Detail;

            if (!VerifyInvoiceMatch(accountRequest, invoiceDetail))
            {
                return this.NotFound(this.languageManager.GetMessage("user.account.error.invoice.notfound", language, "Matching invoice not found"));
            }

            var companyCode = invoiceDetail.HeaderData?.CompanyCode;
            if (companyCode.IsNullOrWhiteSpace())
            {
                return this.NotFound();
            }

            accountRequest.InvoiceDetail = invoiceDetail;

            InvoicePartnerData? partner = user.PrimaryAccountType.StartsWith("payer", StringComparison.InvariantCultureIgnoreCase)
                          ? invoiceDetail.PartnerData.FirstOrDefault(p => p.PartnerFunction == "RG")
                          : invoiceDetail.PartnerData.FirstOrDefault(p => p.PartnerFunction == "AG");

            if (partner == null)
            {
                return this.NotFound(this.languageManager.GetMessage("user.account.error.partner.notfound", language, "Partner with account matching invoice information not found"));
            }

            var accountNr = partner.PartnerNumber.TrimStart('0');

            var account = new Account()
            {
                UserId = userId,
                AccountId = null,
                PrimaryAcct = accountNr,
                AccountTypeId = "both",
                CompanyCode = companyCode,
                Division = invoiceDetail.HeaderData.Division,
                SalesOrganization = invoiceDetail.HeaderData.SalesOrganization,
                DistributionChannel = invoiceDetail.HeaderData.DistributionChannel,
            };

            if (await VerifyAccountDuplicate(user, account, language))
            {
                return this.BadRequest(this.languageManager.GetMessage("user.account.error.exists", language, "The specified account already exists"));
            }

            Account? createdAccount = await this.accountManager.CreateAccount(account, language);

            return this.Ok(createdAccount);
        }
        catch (Exception ex)
        {
            this.logger.LogError($"AddAccountByInvoice(): error: {ex.Message}");
            return new ExceptionResult(ex);
        }
    }

    [HttpPut("{userId}/accounts/{accountId}")]
    [RequiresAllAbilities(Ability.ManageUsers, Ability.ManageLinkedSAPAccounts)]
    public async Task<IActionResult> UpdateAccount(string userId, string accountId, Account account, [FromQuery] string? lang = null)
    {
        try
        {
            var language = lang ?? CultureInfo.CurrentCulture.Name;

            if (userId.IsNullOrEmpty() || accountId.IsNullOrEmpty())
            {
                return this.BadRequest();
            }

            Account? updatedAccount = await this.accountManager.UpdateAccount(account);

            return this.Ok(updatedAccount);
        }
        catch (Exception ex)
        {
            this.logger.LogError($"DeleteAccount(): error: {ex.Message}");
            return new ExceptionResult(ex);
        }
    }

    [HttpDelete("{userId}/accounts/{accountId}")]
    [RequiresAllAbilities(Ability.ManageUsers, Ability.ManageLinkedSAPAccounts)]
    public async Task<IActionResult> DeleteAccount(string userId, string accountId)
    {
        try
        {
            if (userId.IsNullOrEmpty() || accountId.IsNullOrEmpty())
            {
                return this.BadRequest();
            }

            Account? deletedAccount = await this.accountManager.DeleteAccount(userId, accountId);

            return this.Ok(deletedAccount);
        }
        catch (Exception ex)
        {
            this.logger.LogError($"DeleteAccount(): error: {ex.Message}");
            return new ExceptionResult(ex);
        }
    }

    [HttpPost("password-reset-request")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.AuthSensitive)]
    public async Task<IActionResult> PasswordResetRequest([FromBody] RequestPasswordReset request)
    {
        if (request.Email == null)
        {
            return this.BadRequest();
        }

        User? user = await this.manager.GetUserByEmail(request?.Email ?? "");
        EmailError? emailErrorObj = null;
        if (user != null && !string.Equals(user.Role, "admin", StringComparison.OrdinalIgnoreCase))
        {
            if (DateTime.TryParseExact(
                user.LastPasswordReset,
                "yyyyMMddHHmmss",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out DateTime lastResetTime))
            {
                if (DateTime.Now < lastResetTime.AddMinutes(5))
                {
                    return this.Ok();
                }
            }

            string resetToken = Guid.NewGuid().ToString();
            user.PasswordResetToken = resetToken;
            await this.manager.UpdateUser(user);
            await this.authManager.UpdateLogonStatus(user, LoginStatusAction.PasswordReset);

            var language = this.Request.Headers["Accept-Language"].ToString();
            var country = this.Request.Headers["X-Country"].ToString();
            try
            {
                await this.mailer.SendResetPasswordEmail(
                    language,
                    user.FirstName,
                    new MailboxAddress(user.FirstName + " " + user.LastName, user.Email),
                    resetToken,
                    country);
            }
            catch (Exception)
            {
                emailErrorObj = new EmailError
                {
                    Code = "warning.email.sending",
                    Message = "There was an issue sending the password reset email. Please contact support."
                };
            }
        }

        return this.Ok(new
        {
            emailError = emailErrorObj
        });
    }

    [HttpPost]
    [Route("complete-password-reset")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.AuthSensitive)]
    public async Task<IActionResult> CompletePasswordReset([FromBody] CompletePasswordResetForm request)
    {
        User? user = await this.manager.GetUserByResetPassword(request.Id);

        if (user == null)
        {
            return this.StatusCode(400, "Invalid password reset id.");
        }

        if (request.Password != request.ConfirmPassword)
        {
            return this.StatusCode(400);
        }

        if (!this.ValidatePasswordComplexity(request.Password, out string complexityError))
        {
            return this.BadRequest(complexityError);
        }

        var salt = Salt.Create();
        var hash = Hash.Create(request.Password, salt);
        var resetId = request.Id;
        user.PasswordSalt = salt;
        user.PasswordHash = hash;
        user.LastLogin = DateTime.UtcNow;
        user.LastPasswordChange = DateTime.UtcNow;
        user.PasswordResetToken = null;
        await this.manager.UpdateUser(user);
        await this.authManager.UpdateLogonStatus(user, LoginStatusAction.PasswordChanged);

        if (string.Equals(user.Role, "admin", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(user.Email))
        {
            var language = this.Request.Headers["Accept-Language"].ToString();
            var country = this.Request.Headers["X-Country"].ToString();

            try
            {
                await this.mailer.SendPasswordChangedEmail(
                    language,
                    user.FirstName,
                    new MailboxAddress(user.FirstName + " " + user.LastName, user.Email),
                    resetId,
                    country);
            }
            catch (Exception ex)
            {
                this.logger.LogWarning(ex, "Failed to send admin password changed notification for user {UserId}", user.UserId);
            }
        }

        return this.Ok("Success");
    }

    private async Task<IList<string>> ValidateCreateUserRequest(AddChangeUserRequest request, ClaimsPrincipal currentUser, string language = "en")
    {
        request.Email = request.Email?.ToLower() ?? "";
        request.Login = request.Login?.ToLower() ?? "";
        if (request == null)
        {
            return new List<string>() { this.languageManager.GetMessage("user.error.null", language, "User is null") };
        }

        var errors = new List<string>();

        if (CheckRequired(errors, request.Login, "user.error.loginid", "User ID is required", language))
        {
            if (await this.manager.GetUserByLogin(request.Login) != null)
            {
                errors.Add(this.languageManager.GetMessage("user.error.loginid.exists", language, "A user with the specified ID already exists"));
                return errors;
            }
        }

        if (CheckRequired(errors, request.Email, "user.error.email", "Email is required", language))
        {
            if (!this.emailValidationRE.IsMatch(request.Email))
            {
                errors.Add(this.languageManager.GetMessage("user.error.email.bad", language, "Email is invalid"));
            }
            else if (await this.manager.GetUserByEmail(request.Email) != null)
            {
                errors.Add(this.languageManager.GetMessage("user.error.email.exists", language, "A user with the specified email already exists"));
                return errors;
            }
        }

        CheckRequired(errors, request.FirstName, "user.error.givenname", "First Name is required", language);
        CheckRequired(errors, request.LastName, "user.error.surname", "Last Name is required", language);
        CheckRequired(errors, request.Company, "user.error.company", "Company is required", language);

        if (CheckRequired(errors, request.Status, "user.error.status", "Status is required", language))
        {
            CheckValue(errors, request.Status, this.validCreateStatuses, "user.error.status.bad", "Status is invalid", language);
        }

        if (CheckRequired(errors, request.PrimaryAccountType, "user.error.accounttype", "Account Type is required", language))
        {
            CheckValue(errors, request.PrimaryAccountType, this.validAccountTypes, "user.error.accounttype.bad", "Account Type is invalid", language);
        }

        if (CheckRequired(errors, request.Role, "user.error.role", "Role is required", language))
        {
            if (CheckValue(errors, request.Role, this.validRoles, "user.error.role.bad", "Role is invalid", language))
            {
                // Role is valid, now check admin restriction
                if (request.Role != null && request.Role.Equals("admin", StringComparison.OrdinalIgnoreCase) && !currentUser.IsInRole("admin"))
                {
                    var adminRoleName = this.languageManager.GetMessage("user.role.admin", language, "Admin");
                    var adminRoleReqdMsg = this.languageManager.GetMessage("user.error.role.admin.requires-admin", language, "Only '{admin}' users can assign '{admin}' role")
                        .Replace("{admin}", adminRoleName);
                    errors.Add(adminRoleReqdMsg);
                }
            }
        }

        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            if (!this.ValidatePasswordComplexity(request.Password, out string complexityError, language))
            {
                errors.Add(complexityError);
            }
        }

        return errors;
    }

    private async Task<IList<string>> ValidateUpdateUserRequest(AddChangeUserRequest request, ClaimsPrincipal currentUser, string language = "en")
    {
        User? existingUser;
        var errors = new List<string>();
        var userId = request.UserId;
        if (userId.IsNullOrWhiteSpace())
        {
            return new List<string>() { this.languageManager.GetMessage("user.error.userid", language, "User ID is null") };
        }
        else
        {
            existingUser = await this.manager.GetUserById(userId);
            if (existingUser == null)
            {
                // User not found; return no errors so Update action can handle it with NotFound()
                return new List<string>();
            }
        }

        if (CheckRequired(errors, request.Login, "user.error.loginid", "User ID is required", language))
        {
            if (!request.Login.Equals(existingUser.Login, StringComparison.OrdinalIgnoreCase))
            {
                // if login was changed, verify the new one isn't already in use
                if (await this.manager.GetUserByLogin(request.Login) != null)
                {
                    errors.Add(this.languageManager.GetMessage("user.error.loginid.exists", language, "A user with the specified ID already exists"));
                }
            }
        }

        if (CheckRequired(errors, request.Email, "user.error.email", "Email is required", language))
        {
            if (!request.Email.Equals(existingUser.Email, StringComparison.OrdinalIgnoreCase))
            {
                // if email was changed, verify the new one isn't already in use
                if (await this.manager.GetUserByEmail(request.Email) != null)
                {
                    errors.Add(this.languageManager.GetMessage("user.error.email.exists", language, "A user with the specified email already exists"));
                }
            }
        }

        CheckRequired(errors, request.FirstName, "user.error.givenname", "First Name is required", language);
        CheckRequired(errors, request.LastName, "user.error.surname", "Last Name is required", language);
        CheckRequired(errors, request.Company, "user.error.company", "Company is required", language);

        if (CheckRequired(errors, request.Status, "user.error.status", "Status is required", language))
        {
            CheckValue(errors, request.Status, this.validUpdateStatuses, "user.error.status.bad", "Status is invalid", language);
        }

        if (CheckRequired(errors, request.PrimaryAccountType, "user.error.accounttype", "Account Type is required", language))
        {
            CheckValue(errors, request.PrimaryAccountType, this.validAccountTypes, "user.error.accounttype.bad", "Account Type is invalid", language);
        }

        if (CheckRequired(errors, request.Role, "user.error.role", "Role is required", language))
        {
            if (CheckValue(errors, request.Role, this.validRoles, "user.error.role.bad", "Role is invalid", language))
            {
                if (!request.Role.Equals(existingUser.Role, StringComparison.OrdinalIgnoreCase) && request.Role.Equals("admin", StringComparison.OrdinalIgnoreCase) && !currentUser.IsInRole("admin"))
                {
                    var adminRoleName = this.languageManager.GetMessage("user.role.admin", language, "Admin");
                    var adminRoleReqdMsg = this.languageManager.GetMessage("user.error.role.admin.requires-admin", language, "Only '{admin}' users can assign '{admin}' role")
                                           .Replace("{admin}", adminRoleName);
                    errors.Add(adminRoleReqdMsg);
                }
            }
        }

        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            if (!this.ValidatePasswordComplexity(request.Password, out string complexityError, language))
            {
                errors.Add(complexityError);
            }
        }

        return errors;
    }

    private bool ValidatePasswordComplexity(string password, out string errorMessage, string language = "en")
    {
        errorMessage = "";
        if (password.Length < 8)
        {
            errorMessage = this.languageManager.GetMessage("user.error.password.length", language, "Password must be at least 8 characters long");
            return false;
        }

        bool hasUpper = password.Any(char.IsUpper);
        bool hasLower = password.Any(char.IsLower);
        bool hasDigit = password.Any(char.IsDigit);
        bool hasSpecial = password.Any(ch => !char.IsLetterOrDigit(ch));

        if (!hasUpper || !hasLower || !hasDigit || !hasSpecial)
        {
            errorMessage = this.languageManager.GetMessage("user.error.password.complexity", language, "Password must contain uppercase, lowercase, numbers, and special characters");
            return false;
        }

        return true;
    }

    private bool CheckRequired(List<string> errors, string? value, string messageKey, string defaultMessage, string language)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors.Add(this.languageManager.GetMessage(messageKey, language, defaultMessage));
            return false;
        }
        return true;
    }

    private bool CheckValue(List<string> errors, string? value, IEnumerable<string> validValues, string messageKey, string defaultMessage, string language)
    {
        if (value != null && !validValues.Contains(value, StringComparer.OrdinalIgnoreCase))
        {
            errors.Add(this.languageManager.GetMessage(messageKey, language, defaultMessage));
            return false;
        }
        return true;
    }

    private bool VerifyInvoiceMatch(InvoiceAccountRequest accountRequest, InvoiceDetail? invoiceDetail)
    {
        if (invoiceDetail == null) return false;

        bool totalMatches = accountRequest.InvoiceAmount == invoiceDetail.HeaderData.TotalAmount;
        bool accountMatches = false;

        bool shouldMatchSoldTo = this.configuration.GetValue("Registration:MatchSoldTo", true);
        if (shouldMatchSoldTo)
        {
            accountMatches = accountRequest.AccountNumber.TrimStartSafe('0') == invoiceDetail.HeaderData?.SoldtoNumber.TrimStartSafe('0');

            if (!accountMatches)
            {
                InvoicePartnerData? soldToPartner = invoiceDetail.PartnerData.EmptyIfNull().FirstOrDefault(pd => pd.PartnerFunction == "RG");
                if (soldToPartner != null)
                {
                    accountMatches = accountRequest.AccountNumber.TrimStartSafe('0') == soldToPartner.PartnerNumber.TrimStartSafe('0');
                }
            }
        }

        return totalMatches && accountMatches;
    }

    private async Task<bool> VerifyAccountDuplicate(User user, Account newAccount, string language)
    {
        List<Account>? accounts = await this.accountManager.GetAccountsByUser(user, language);
        if (accounts == null) return false;

        return accounts.Any(x => x.PrimaryAcct == newAccount.PrimaryAcct
                                  && x.CompanyCode == newAccount.CompanyCode
                                  && x.Division == newAccount.Division
                                  && x.SalesOrganization == newAccount.SalesOrganization
                                  && x.DistributionChannel == newAccount.DistributionChannel);
    }

    private List<UserAccountDto> MapAccountViewsToResponse(IEnumerable<AccountView> accountViews)
    {
        return accountViews.Select(accountView => new UserAccountDto
        {
            AccountId = accountView.AccountId,
            UserId = accountView.UserId,
            PrimaryAcct = accountView.PrimaryAcct,
            AccountTypeId = accountView.AccountTypeId,
            CompanyCode = accountView.CompanyCode,
            SalesOrganization = accountView.SalesOrganization,
            DistributionChannel = accountView.DistributionChannel,
            Division = accountView.Division,
            AllowPayments = accountView.AllowPayments,
            AllowDeposits = accountView.AllowDeposits,
            Address = accountView.Address == null ? null : new CompanyAddress
            {
                Name = accountView.Address.Name,
                Name2 = accountView.Address.Name2,
                Name3 = accountView.Address.Name3,
                Name4 = accountView.Address.Name4,
                City = accountView.Address.City,
                District = accountView.Address.District,
                Street = accountView.Address.Street,
                PostalCodeCity = accountView.Address.PostalCodeCity,
                Region = accountView.Address.Region,
                Country = accountView.Address.Country
            },
            RelatedAccounts = accountView.RelatedAccounts?.Select(this.CloneRelatedAccount).ToList() ?? [],
            AvailablePayers = accountView.AvailablePayers?.Select(this.CloneRelatedAccount).ToList() ?? [],
            DefaultPayer = accountView.DefaultPayer == null ? null : this.CloneRelatedAccount(accountView.DefaultPayer),
            ResolvedPayerDetails = this.MapResolvedPayerDetails(accountView)
        }).ToList();
    }

    private UserPayerDetailsDto? MapResolvedPayerDetails(AccountView accountView)
    {
        PayerDetail? source = accountView.ResolvedPayerDetails;
        if (source == null)
        {
            return null;
        }

        return new UserPayerDetailsDto
        {
            CustomerNumber = accountView.DefaultPayer?.PrimaryAccount ?? accountView.PrimaryAcct,
            CompanyCode = source.CompanyData?.FirstOrDefault()?.Data?.CompanyCode
                          ?? accountView.DefaultPayer?.CompanyCode
                          ?? accountView.CompanyCode,
            IsAutoPayEnrolled = source.IsAutoPayEnrolled,
            AddressData = source.AddressData == null ? null : new CompanyAddress
            {
                Name = source.AddressData.Name,
                Name2 = source.AddressData.Name2,
                Name3 = source.AddressData.Name3,
                Name4 = source.AddressData.Name4,
                City = source.AddressData.City,
                District = source.AddressData.District,
                Street = source.AddressData.Street,
                PostalCodeCity = source.AddressData.PostalCodeCity,
                Region = source.AddressData.Region,
                Country = source.AddressData.Country
            },
            PaymentCards = source.PaymentCards?.Select(this.ClonePaymentCard).ToList() ?? [],
            PayerAutoPayStatus = source.PayerAutoPayStatus?.Select(this.CloneAutoPayStatus).ToList() ?? []
        };
    }

    private void PrepareAccountsForResponse(IEnumerable<UserAccountDto> accounts)
    {
        foreach (UserAccountDto account in accounts)
        {
            this.PrepareAutoPayStatusesForResponse(
               account.ResolvedPayerDetails?.PayerAutoPayStatus,
               account.ResolvedPayerDetails?.PaymentCards
           );
            this.PreparePaymentCardsForResponse(account.ResolvedPayerDetails?.PaymentCards);
        }
    }

    private void PreparePaymentCardsForResponse(IEnumerable<PaymentCardResponseDto>? paymentCards)
    {
        foreach (PaymentCardResponseDto card in paymentCards ?? [])
        {
            if (!string.IsNullOrEmpty(card.PaymentCardToken))
            {
                card.PaymentCardToken = Encryption.Encrypt(
                    card.PaymentCardToken,
                    this.secrets.EncryptionKey
                );
            }
        }
    }

    private void PrepareAutoPayStatusesForResponse(
        IEnumerable<AutoPayStatus>? autoPayStatuses,
        IEnumerable<PaymentCardResponseDto>? paymentCards
    )
    {
        foreach (AutoPayStatus autoPayStatus in autoPayStatuses ?? [])
        {
            if (!string.IsNullOrEmpty(autoPayStatus.PaymentCardToken))
            {
                PaymentCardResponseDto? matchedCard = paymentCards?.FirstOrDefault(card =>
                    string.Equals(card.PaymentCardToken, autoPayStatus.PaymentCardToken, StringComparison.OrdinalIgnoreCase));

                if (!string.IsNullOrEmpty(matchedCard?.CardLast4Digit))
                {
                    autoPayStatus.CardLast4Digit = matchedCard.CardLast4Digit;
                }
            }

            if (!string.IsNullOrEmpty(autoPayStatus.PaymentCardToken))
            {
                autoPayStatus.PaymentCardToken = Encryption.Encrypt(
                    autoPayStatus.PaymentCardToken,
                    this.secrets.EncryptionKey
                );
            }
        }
    }

    private RelatedAccount CloneRelatedAccount(RelatedAccount account)
    {
        return new RelatedAccount
        {
            SubType = account.SubType,
            PrimaryAccount = account.PrimaryAccount,
            CompanyCode = account.CompanyCode,
            Name = account.Name,
            Name2 = account.Name2,
            Name3 = account.Name3,
            Name4 = account.Name4,
            DistributionChannel = account.DistributionChannel,
            Division = account.Division,
            SalesOrganization = account.SalesOrganization,
            Selected = account.Selected
        };
    }

    private PaymentCardResponseDto ClonePaymentCard(PaymentCard card)
    {
        string sapCardType = CardTypeMappingHelper.ToSapCardType(card.PaymentCardType);

        return new PaymentCardResponseDto
        {
            PaymentCardType = card.PaymentCardType,
            SapCardType = sapCardType,
            GatewayCardType = CardTypeMappingHelper.ToGatewayCardType(card.PaymentCardType),
            PaymentCardToken = card.PaymentCardToken,
            PaymentCardName = card.PaymentCardName,
            ValidFrom = card.ValidFrom,
            ValidTo = card.ValidTo,
            ElectronicCheckAccountType = card.ElectronicCheckAccountType,
            ElectronicCheckRdfiNumber = card.ElectronicCheckRdfiNumber,
            Default = card.Default,
            CardLast4Digit = card.CardLast4Digit,
            CardValidationCode = card.CardValidationCode
        };
    }

    private AutoPayStatus CloneAutoPayStatus(AutoPayStatus autoPayStatus)
    {
        return new AutoPayStatus
        {
            CompanyCode = autoPayStatus.CompanyCode,
            Enrolled = autoPayStatus.Enrolled,
            PaymentMethod = autoPayStatus.PaymentMethod,
            PaymentCardToken = autoPayStatus.PaymentCardToken,
            CardLast4Digit = autoPayStatus.CardLast4Digit
        };
    }
}
