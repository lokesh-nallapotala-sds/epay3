using Epay3Net.Custom.ActionResult;
using Epay3Net.Maintenance;
using Epay3Net.Models;
using Epay3Net.RateLimiting;
using Epay3Service.Configuration;
using Epay3Service.Helpers;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using Epay3Net.Authorization.Abilities;
using Epay3Service.Services;

namespace Epay3Net.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController(
    IUserManager userManager,
    IAuthManager manager,
    ISystemConfigService configService,
    ApplicationSecrets secrets,
    ILanguageManager languageManager,
    IJwtKeyManager jwtKeyManager,
    IMaintenanceCacheService maintenanceCache
    ) : ControllerBase
{
    public const string AuthCookieName = "__Host-sid";
    private static readonly TimeSpan AuthCookieLifetime = TimeSpan.FromHours(1);

    private readonly IAuthManager manager = manager;
    private readonly IUserManager userManager = userManager;
    private readonly ApplicationSecrets secrets = secrets;
    private readonly ILanguageManager languageManager = languageManager;
    private readonly ISystemConfigService configService = configService;
    private readonly IJwtKeyManager jwtKeyManager = jwtKeyManager;
    private readonly IMaintenanceCacheService maintenanceCache = maintenanceCache;
    private const int Password_Minimum_Length = 8;

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.AuthSensitive)]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, [FromQuery] string? lang = null)
    {
        try
        {
            request.UserName = request?.UserName?.ToLowerInvariant() ?? "";
            var language = lang ?? CultureInfo.CurrentCulture.Name;

            if (string.IsNullOrEmpty(request?.UserName) || string.IsNullOrEmpty(request.Password))
            {
                return this.BadRequest(this.languageManager.GetMessage("error.username.required", language, "Missing information"));
            }

            var maintenanceState = maintenanceCache.GetState();
            if (!request.IsAdminLogin && maintenanceState.IsSapUnavailable)
            {
                return StatusCode(
                    StatusCodes.Status503ServiceUnavailable,
                    MaintenancePresentation.CreateStatusResponse(maintenanceState));
            }

            if (!request.IsAdminLogin && maintenanceState.IsMaintenanceActive)
            {
                return StatusCode(
                    StatusCodes.Status423Locked,
                    MaintenancePresentation.CreateStatusResponse(maintenanceState));
            }

            Epay3Service.Models.User? user = await this.manager.ValidateLogin(request.UserName, request.Password);
            var genericAuthError = this.languageManager.GetMessage("error.auth.failed", language, "User ID and password doesn't match any records.  Please try again or click Forgot Password.");

            if (user == null || "deactive".Equals(user.Status, StringComparison.OrdinalIgnoreCase) || "locked".Equals(user.Status, StringComparison.OrdinalIgnoreCase))
            {
                return this.StatusCode(401, genericAuthError);
            }

            if ((maintenanceState.IsSapUnavailable || maintenanceState.IsMaintenanceActive) &&
                !string.Equals(user.Role, UserRole.Admin, StringComparison.OrdinalIgnoreCase))
            {
                var blockedStatus = maintenanceState.IsSapUnavailable
                    ? StatusCodes.Status503ServiceUnavailable
                    : StatusCodes.Status423Locked;

                return StatusCode(
                    blockedStatus,
                    MaintenancePresentation.CreateStatusResponse(maintenanceState));
            }

            if (TextConstant.WaitingConfirmation.Equals(user.Status, StringComparison.OrdinalIgnoreCase))
            {
                return this.Ok(new
                {
                    user.Status,
                    isLoggedIn = false
                });
            }

            if (user.Role.Equals(UserRole.User, StringComparison.CurrentCultureIgnoreCase) && (user.Accounts == null || user.Accounts.Count == 0))
            {
                return this.StatusCode(401, this.languageManager.GetMessage("error.user.noaccounts", language, "No Accounts"));
            }

            var (keyBytes, kid) = await this.jwtKeyManager.GetActiveKeyAsync();
            var token = JwtTokenHelper.GetAuthToken(user, keyBytes, kid);
            this.Response.Cookies.Append(AuthCookieName, token, CreateAuthCookieOptions(DateTimeOffset.UtcNow.Add(AuthCookieLifetime)));

            return this.Ok(new
            {
                isLoggedIn = true,
                role = user.Role,
                user = ToLoggedInUser(user.Claims)
            });
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpGet("session")]
    public IActionResult Session()
    {
        if (this.User?.Identity?.IsAuthenticated != true)
        {
            return this.Unauthorized();
        }

        return this.Ok(new
        {
            isLoggedIn = true,
            role = this.User.FindFirst(ClaimTypes.Role)?.Value ?? "",
            user = ToLoggedInUser(this.User.Claims)
        });
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        this.Response.Cookies.Delete(AuthCookieName, CreateAuthCookieOptions(DateTimeOffset.UnixEpoch));
        return this.NoContent();
    }

    [Route("auto-register/user-confirm/{token}")]
    [HttpPost]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.AuthSensitive)]
    public async Task<IActionResult> AutoRegisterConfirmUser(string token)
    {
        try
        {
            Epay3Service.Models.SystemConfiguration config = await this.configService.GetConfig();


            if (string.IsNullOrEmpty(token))
            {
                return this.NotFound("Could not find activation token.");
            }

            JwtSecurityToken jwtToken = HashTokenService.DeserializeToken(token, this.secrets.RegistrationKey);
            if (await this.TokenIsExpired(jwtToken))
            {
                var returnMessage = string.IsNullOrEmpty(config.RegistrationEmailExpirationMessage) ? "Activation link has expired"
                : config.RegistrationEmailExpirationMessage;
                return this.NotFound(returnMessage);
            }

            Epay3Service.Models.User user = await this.manager.GetUserByConfirmationToken(token);

            if (user == null)
            {
                return this.NotFound("Could not find activation token.");
            }

            user.Status = "active";
            user.ConfirmationToken = null;
            Epay3Service.Models.User? updatedUser = await this.userManager.UpdateUser(user);

            //// copy all admins to local storage to be available offline
            //await _blackoutService.UpdateBlackoutAdmins();

            return this.Ok(new
            {
                updatedUser
            });

        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpPost]
    [Route("complete-registration")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.AuthSensitive)]
    public async Task<IActionResult> CompleteRegistration([FromBody] CompletePasswordResetForm request)
    {
        var user = await this.manager.GetUserByInviteToken(request?.Id ?? "");

        if (user == null)
        {
            return StatusCode(400, "Invalid invite id.");
        }

        if (request.Password != request.ConfirmPassword)
        {
            return StatusCode(400);
        }

        if (!Hash.IsComplex(request.Password ?? ""))
        {
            var language = this.Request.Headers["Accept-Language"].ToString() ?? "en";
            return this.BadRequest(this.languageManager.GetMessage("user.password.invalid.message", language, "Not a valid password").Replace("{minLength}", Convert.ToString(Password_Minimum_Length)));
        }

        var salt = Salt.Create();
        var hash = Hash.Create(request.Password ?? "", salt);
        user.PasswordSalt = salt;
        user.PasswordHash = hash;
        user.LastLogin = DateTime.UtcNow;
        user.InviteToken = null;

        if (user.Status == "waiting-confirmation")
        {
            user.Status = "active";
        }

        await this.userManager.UpdateUser(user);

        return Ok("Success");
    }

    /// <summary>
    /// Self-service email change — step 2. Applies the email change that was
    /// requested via <c>UserController.RequestEmailChange</c> once the recipient
    /// clicks the verification link. The change is applied in place, so the user's
    /// id, session and linked accounts are all preserved. The JWT itself is
    /// short-lived; <see cref="HashTokenService.DeserializeToken"/> rejects it once expired.
    /// </summary>
    [Route("confirm-email-change/{token}")]
    [HttpPost]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.AuthSensitive)]
    public async Task<IActionResult> ConfirmEmailChange(string token)
    {
        var language = this.Request.Headers["Accept-Language"].ToString();
        try
        {
            if (string.IsNullOrEmpty(token))
            {
                return this.NotFound("Could not find email change token.");
            }

            JwtSecurityToken jwtToken;
            try
            {
                jwtToken = HashTokenService.DeserializeToken(token, this.secrets.RegistrationKey);
            }
            catch (Exception)
            {
                return this.BadRequest(this.languageManager.GetMessage(
                    "settings.account.email_change.invalid_token", language,
                    "This email change link is invalid or has expired."));
            }

            string? payload = jwtToken.Claims.FirstOrDefault(c => c.Type == "Payload")?.Value;
            EmailChangePayload? data = string.IsNullOrEmpty(payload)
                ? null
                : JsonSerializer.Deserialize<EmailChangePayload>(payload);

            if (data == null || string.IsNullOrWhiteSpace(data.UserId) || string.IsNullOrWhiteSpace(data.NewEmail))
            {
                return this.BadRequest(this.languageManager.GetMessage(
                    "settings.account.email_change.invalid_token", language,
                    "This email change link is invalid or has expired."));
            }

            string newEmail = data.NewEmail.ToLower();

            Epay3Service.Models.User? user = await this.userManager.GetUserById(data.UserId);
            if (user == null)
            {
                return this.NotFound();
            }

            // Re-check the target email is still free — someone else may have
            // claimed it (as an email or login) during the verification window.
            Epay3Service.Models.User? existingByEmail = await this.userManager.GetUserByEmail(newEmail);
            Epay3Service.Models.User? existingByLogin = await this.userManager.GetUserByLogin(newEmail);
            bool takenByEmail = existingByEmail != null
                && !string.Equals(existingByEmail.UserId, user.UserId, StringComparison.OrdinalIgnoreCase);
            bool takenByLogin = existingByLogin != null
                && !string.Equals(existingByLogin.UserId, user.UserId, StringComparison.OrdinalIgnoreCase);
            if (takenByEmail || takenByLogin)
            {
                return this.Conflict(this.languageManager.GetMessage(
                    "user.error.email.exists", language,
                    "A user with the specified email already exists"));
            }

            // Email and login (the User ID used to sign in) are the same value, so
            // update both. The user must sign in with the new email next time.
            user.Email = newEmail;
            user.Login = newEmail;
            Epay3Service.Models.User? updatedUser = await this.userManager.UpdateUser(user);

            return this.Ok(new
            {
                updatedUser
            });
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    private async Task<bool> TokenIsExpired(JwtSecurityToken token)
    {
        bool isExpired = false;
        Epay3Service.Models.SystemConfiguration config = await this.configService.GetConfig();

        if (!string.IsNullOrEmpty(config.RegistrationEmailExpiration))
        {
            if (int.TryParse(config.RegistrationEmailExpiration, out int expirationHours))
            {
                if (token.IssuedAt.AddHours(expirationHours) < DateTime.UtcNow)
                {
                    isExpired = true;
                }
            }

        }

        return isExpired;
    }

    internal static CookieOptions CreateAuthCookieOptions(DateTimeOffset expires) =>
    new()
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Lax,
        Path = "/",
        Expires = expires
    };

    private static object ToLoggedInUser(IEnumerable<Claim> claims)
    {
        Claim[] claimArray = claims.ToArray();
        string[] accounts = claimArray
            .Where(claim => claim.Type == "Accounts")
            .Select(claim => claim.Value)
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
        string[] abilities = claimArray
            .Where(claim => claim.Type == Ability.ClaimType)
            .Select(claim => claim.Value)
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return new
        {
            userId = claimArray.FirstOrDefault(claim => claim.Type == "UserId")?.Value ?? "",
            login = claimArray.FirstOrDefault(claim => claim.Type == ClaimTypes.Name)?.Value ?? "",
            email = claimArray.FirstOrDefault(claim => claim.Type == ClaimTypes.Email)?.Value ?? "",
            primaryAccountType = claimArray.FirstOrDefault(claim => claim.Type == "AccountType")?.Value ?? "",
            role = claimArray.FirstOrDefault(claim => claim.Type == ClaimTypes.Role)?.Value ?? "",
            accounts,
            abilities,
            isImpersonating = bool.TryParse(
                claimArray.FirstOrDefault(claim => claim.Type == "IsImpersonating")?.Value,
                out bool isImpersonating) && isImpersonating,
            regionalFormat = claimArray.FirstOrDefault(claim => claim.Type == "RegionalFormat")?.Value ?? ""
        };
    }
}
