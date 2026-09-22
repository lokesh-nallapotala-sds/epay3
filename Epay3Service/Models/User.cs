using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Newtonsoft.Json;
using Epay3Service.Extensions;
using Epay3Service.Helpers;


namespace Epay3Service.Models;

public class User
{
    [JsonProperty("user_id")]
    public string? UserId { get; set; }

    [JsonProperty("login")]
    public string? Login { get; set; }

    [JsonProperty("first_name")]
    public string? FirstName { get; set; }

    [JsonProperty("last_name")]
    public string? LastName { get; set; }

    [JsonProperty("company")]
    public string? Company { get; set; }

    [JsonProperty("email")]
    public string? Email { get; set; }

    [JsonProperty("status")]
    public string? Status { get; set; }

    [JsonProperty("num_logins")]
    public int? NumLogins { get; set; } = 0;

    [JsonProperty("primary_account_type_id")]
    public string PrimaryAccountType { get; set; } = string.Empty;

    [JsonProperty("third_party_id")]
    public string ThirdPartyId { get; set; } = "";

    [JsonProperty("invite_token")]
    public string? InviteToken { get; set; }

    [JsonProperty("confirmation_token")]
    public string? ConfirmationToken { get; set; }

    [Required]
    public string Password { get; set; } = string.Empty;


    [JsonProperty("password_reset_token")]
    public string? PasswordResetToken { get; set; }

    [JsonProperty("salt")]
    public string? PasswordSalt { get; set; }

    [JsonProperty("hash")]
    public string? PasswordHash { get; set; }

    #region created date & time
    [JsonProperty("created_date_date")]
    public DateTime? CreatedDateDate
    {
        get => SapDateTimeHelper.SapDateAndTimeToDateTime(this.CreatedDate, this.CreatedTime);
    }

    [JsonProperty("created_date")]
    public string CreatedDate { get; set; } = "";

    [JsonProperty("created_time")]
    public string CreatedTime { get; set; } = "";
    #endregion

    #region last updated (modified) date & time
    [JsonProperty("updated_date_date")]
    public DateTime? UpdatedDateDate
    {
        get => SapDateTimeHelper.SapDateAndTimeToDateTime(this.UpdatedDate, this.UpdatedTime);
    }

    [JsonProperty("updated_date")]
    public string UpdatedDate { get; set; } = "";

    [JsonProperty("updated_time")]
    public string UpdatedTime { get; set; } = "";
    #endregion

    #region last login date & time
    [JsonProperty("last_login")]
    public DateTime? LastLogin
    {
        get => SapDateTimeHelper.SapDateAndTimeToDateTime(this.LastLoginDate, this.LastLoginTime);
        set
        {
            if (value != null)
            {
                DateTime datetime = value.GetValueOrDefault();
                this.LastPasswordChangeDate = datetime.ToString("yyyyMMdd");
                this.LastPasswordChangeTime = datetime.ToString("HHmmss");
            }
        }
    }

    [JsonProperty("last_login_date")]
    public string LastLoginDate { get; set; } = "";

    [JsonProperty("last_login_time")]
    public string LastLoginTime { get; set; } = "";
    #endregion

    #region last password change date & time
    [JsonProperty("last_password_change")]
    public DateTime? LastPasswordChange
    {
        get => SapDateTimeHelper.SapDateAndTimeToDateTime(this.LastPasswordChangeDate, this.LastPasswordChangeTime);
        set
        {
            if (value != null)
            {
                DateTime datetime = value.GetValueOrDefault();
                this.LastPasswordChangeDate = datetime.ToString("yyyyMMdd");
                this.LastPasswordChangeTime = datetime.ToString("HHmmss");
            }
        }
    }
    [JsonProperty("last_pwd_change_date")]
    public string LastPasswordChangeDate { get; set; } = "";
    [JsonProperty("last_pwd_change_time")]
    public string LastPasswordChangeTime { get; set; } = "";
    #endregion

    [JsonProperty("accounts")]
    public List<Account>? Accounts { get; set; }

    [JsonProperty("user_role")]
    public string? Role { get; set; }

    [JsonProperty("claims")]
    public List<Claim> Claims { get; set; } = new List<Claim>();

    [JsonProperty("failed_login_count")]
    public string FailedLoginCount { get; set; } = "";
    [JsonProperty("last_password_reset")]
    public string LastPasswordReset { get; set; } = "";

    [JsonProperty("regional_format")]
    public string? RegionalFormat { get; set; }

    //TODO
    //[JsonProperty("abilities")]
    //public List<string> Abilities
    //    => Claims.Where(x => x.Type == Ability.ClaimType)
    //       .Select(x => x.Value)
    //       .ToList();

    [JsonProperty("linked_accounts")]
    public List<LinkedAccount>? LinkedAccounts { get; set; }
}

public class LinkedAccount
{
    [JsonProperty("primary_account")]
    public string? PrimaryAccount { get; set; }
    [JsonProperty("name")]
    public string? Name { get; set; }
}

public static class UserExtensions
{
    public static void EnsureIdentityData(this User user)
    {
        ArgumentNullException.ThrowIfNull(user);

        if (string.IsNullOrWhiteSpace(user.UserId))
        {
            throw new InvalidOperationException("User is missing required identity field 'UserId'.");
        }

        if (string.IsNullOrWhiteSpace(user.Login))
        {
            throw new InvalidOperationException("User is missing required identity field 'Login'.");
        }

        if (string.IsNullOrWhiteSpace(user.PrimaryAccountType))
        {
            throw new InvalidOperationException("User is missing required identity field 'PrimaryAccountType'.");
        }
    }

    public static List<Claim> GetMetainfoClaims(this User user)
    {
        user.EnsureIdentityData();

        var claims = new List<Claim>()
        {
            new(ClaimTypes.Name, user.Login),
            new("UserId", user.UserId),
            new(ClaimTypes.Email, user.Email ?? ""),
            new("AccountType", user.PrimaryAccountType),
        };
        if (!user.Role.IsNullOrEmpty())
        {
            claims.Add(new Claim(ClaimTypes.Role, user.Role));
        }

        if (!string.IsNullOrEmpty(user.RegionalFormat))
        {
            claims.Add(new Claim("RegionalFormat", user.RegionalFormat));
        }

        return claims;
    }

    public static List<Claim> GetAbilityClaims(this User user)
    {
        List<Claim> claims;
        string role = user.Role ?? string.Empty;
        string accountType = user.PrimaryAccountType ?? string.Empty;

        switch (role.ToLowerInvariant())
        {
            case UserRole.Admin:
                claims = new List<Claim>
                {
                    new(Ability.ClaimType, Ability.Impersonate),
                    new(Ability.ClaimType, Ability.ViewUsers),
                    new(Ability.ClaimType, Ability.ManageUsers),
                    new(Ability.ClaimType, Ability.EditSystemConfig),
                    new(Ability.ClaimType, Ability.MakePayment),
                    new(Ability.ClaimType, Ability.ManagePaymentMethods),
                    new(Ability.ClaimType, Ability.IsAdmin),
                    new(Ability.ClaimType, Ability.ManageLinkedSAPAccounts),
                };
                break;
            case UserRole.Manager:
                claims = new List<Claim>
                {
                    new(Ability.ClaimType, Ability.Impersonate),
                    new(Ability.ClaimType, Ability.ViewUsers),
                    new(Ability.ClaimType, Ability.ManageUsers),
                    new(Ability.ClaimType, Ability.MakePayment),
                    new(Ability.ClaimType, Ability.ManageLinkedSAPAccounts),
                    new(Ability.ClaimType, Ability.ManageRegistrationRequests),
                };
                break;
            case UserRole.Internal:
                claims = new List<Claim>
                {
                    new(Ability.ClaimType, Ability.Impersonate),
                    new(Ability.ClaimType, Ability.ViewUsers),
                    new(Ability.ClaimType, Ability.ManageOwnSAPAccounts),
                };
                break;
            case UserRole.User:
                claims = new List<Claim>();

                bool isSoldTo = string.Equals(
                    user.PrimaryAccountType,
                    "SoldTo",
                    StringComparison.OrdinalIgnoreCase
                );

                claims.Add(new Claim(Ability.ClaimType, Ability.MakePayment));

                if (!isSoldTo)
                {
                    claims.Add(new Claim(Ability.ClaimType, Ability.ManagePaymentMethods));
                }


                break;
            default:
                claims = new List<Claim>();
                break;
        }

        return claims;
    }
}
