using Epay3Service.Clients.Interfaces;
using Epay3Service.Extensions;
using Epay3Service.Helpers;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;
using Microsoft.Extensions.Configuration;
using System.ComponentModel;
using System.Security.Claims;

namespace Epay3Service.Managers;

public class AuthManager(
    ISalesforceHttpClient sfClient,
    IApplicationConfigurationManager appConfigManager,
    IUserManager userManager,
    IConfiguration configuration
    ) : IAuthManager
{
    private readonly ISalesforceHttpClient sfClient = sfClient;
    private readonly IApplicationConfigurationManager appConfigManager = appConfigManager;
    private readonly IUserManager userManager = userManager;
    private readonly IConfiguration configuration = configuration;

    public async Task<User?> ValidateLogin(string username, string password, string language = "en")
    {
        if (await this.appConfigManager.ArePaymentsDisabled())
        {
            throw new Exception("Payments are disabled.");
        }

        // Look up user from Salesforce Chronarpay_User__c by login field.
        // applicationUsersDetail (CNBS_GET_APP_USER_ACTION) now supports ?login=
        // and returns real salt/hash — no standard SF User object is involved.
        Clients.Models.SapHttpData<List<User>?> response = await this.sfClient.Get<List<User>>(
            "CNBS_GET_APP_USER_ACTION",
            new Dictionary<string, string?>()
            {
                { "login", username }
            },
            language);

        if (response?.Data == null || response.Data.Count != 1)
        {
            return null;
        }

        User user = response.Data.First();

        if ("locked".Equals(user.Status, StringComparison.OrdinalIgnoreCase))
        {
            return user;
        }

        var match = Hash.Validate(password, user.PasswordSalt, user.PasswordHash);
        if (!match)
        {
            user = await UpdateLogonStatus(user, LoginStatusAction.Failure);
            if (user != null && int.TryParse(user.FailedLoginCount, out int failedCount) &&
                int.TryParse(configuration["MaximumFailedLoginCount"], out int maxFailed) &&
                failedCount >= maxFailed)
            {
                user.Status = "locked";
                await userManager.UpdateUser(user);
            }
            return null;
        }

        user.Claims ??= new List<Claim>();
        user.Claims.AddRange(user.GetMetainfoClaims());
        user.Claims.AddRange(user.GetAbilityClaims());

        if ("Active".Equals(user.Status, StringComparison.OrdinalIgnoreCase))
        {
            Clients.Models.SapHttpData<List<Account>?> accountResponse = await this.sfClient.Get<List<Account>>(
                "CNBS_GET_APP_USER_ACCOUNTS",
                new Dictionary<string, string?>()
                {
                    { "userId", user.UserId },
                    { "user_id", user.UserId }
                },
                language);

            user.Accounts = accountResponse?.Data;

            foreach (Account account in user.Accounts.EmptyIfNull())
            {
                if (!string.IsNullOrWhiteSpace(account.PrimaryAcct))
                {
                    user.Claims.Add(new Claim("Accounts", account.PrimaryAcct));
                }
            }
        }

        await UpdateLogonStatus(user, LoginStatusAction.Success);
        return user;
    }

    /// <summary>
    /// Looks up a user by their email confirmation token, using Chronarpay_User__c via Salesforce.
    /// </summary>
    public async Task<User> GetUserByConfirmationToken(string token, string language = "en")
    {
        Clients.Models.SapHttpData<List<User>?>? users = await this.sfClient.Get<List<User>>(
            "CNBS_GET_APP_USER_ACTION",
            new Dictionary<string, string?>()
            {
               { "confirmation_token", token }
            },
            language);

        if (users == null || users?.Data?.Count == 0)
        {
            return null;
        }

        return users?.Data?.FirstOrDefault();
    }

    /// <summary>
    /// Looks up a user by their invite token, using Chronarpay_User__c via Salesforce.
    /// </summary>
    public async Task<User> GetUserByInviteToken(string token, string language = "en")
    {
        Clients.Models.SapHttpData<List<User>?>? users = await this.sfClient.Get<List<User>>(
            "CNBS_GET_APP_USER_ACTION",
            new Dictionary<string, string?>()
            {
               { "invite_token", token }
            },
            language);

        if (users == null || users?.Data?.Count == 0)
        {
            return null;
        }

        return users?.Data?.FirstOrDefault();
    }

    public async Task<User> UpdateLogonStatus(User user, LoginStatusAction status, string language = "en")
    {
        var loginStatusAction = status switch
        {
            LoginStatusAction.Success => "S",
            LoginStatusAction.Failure => "E",
            LoginStatusAction.PasswordChanged => "P",
            LoginStatusAction.PasswordReset => "R",
            _ => throw new InvalidEnumArgumentException()
        };

        try
        {
            Clients.Models.SapHttpData<List<User>?> response = await this.sfClient.Post<List<User>>(
                "CNBS_UPDATE_LOGON_STATUS",
                null,
                new { Data = new { user_id = user.UserId }, login_status_action = loginStatusAction, time_stamp = DateTime.Now.ToString("yyyyMMddHHmmss") },
                language);

            return response?.Data?.FirstOrDefault() ?? user;
        }
        catch (Exception ex)
        {
            Console.Out.WriteLine($"[UpdateLogonStatus] Warning: Failed to update logon status for user {user.UserId}: {ex.Message}");
            return user;
        }
    }
}
