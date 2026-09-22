using System.Security.Claims;
using Epay3Service.Clients.Interfaces;
using Epay3Service.Extensions;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;

namespace Epay3Service.Managers;

public class UserManager : IUserManager {
    private readonly ISalesforceHttpClient? sfClient;
    private readonly ISapHttpClient client;

    public UserManager(ISalesforceHttpClient sfClient, ISapHttpClient client) {
        this.sfClient = sfClient;
        this.client = client;
    }

    public UserManager(ISapHttpClient client) {
        this.sfClient = null;
        this.client = client;
    }

    public async Task<IList<User>?> GetUsers(string searchFilter = "", string language = "en") {
        // note, we currently filter client-side, so `searchFilter` will always be blank (may need to revisit if the # of users becomes large)
        // left this code in place to clarify the back-end API
        Dictionary<string, string?>? queryParams = null;
        if (!searchFilter.IsNullOrWhiteSpace()) {
            queryParams = new Dictionary<string, string?>();
            queryParams.Add("search_string", searchFilter);
        }

        if (this.sfClient != null) {
            try {
                Clients.Models.SapHttpData<List<User>?> sfResponse = await this.sfClient.Get<List<User>>(
                    "CNBS_GET_APP_USERS",
                    queryParams,
                    language);

                if (sfResponse?.Data != null) {
                    return sfResponse.Data;
                }
            } catch {
                // Fall back to SAP if Salesforce query fails or errors
            }
        }

        Clients.Models.SapHttpData<List<User>?> response = await this.client.Get<List<User>>("CNBS_GET_APP_USERS", queryParams, language);

        return response?.Data;
    }

    // note, the path key for GetUserById differs from all the other GetByXXX methods
    public async Task<User?> GetUserById(string userId, string language = "en") {
        User? user = null;

        if (this.sfClient != null) {
            try {
                Clients.Models.SapHttpData<List<User>?> sfResponse = await this.sfClient.Get<List<User>>(
                    "CNBS_GET_APP_USER_ACTION",
                    new Dictionary<string, string?> {
                        {"user_id", userId}
                    },
                    language);

                user = sfResponse?.Data?.FirstOrDefault();
            } catch {
                // Fall back to SAP if Salesforce query fails or errors
            }
        }

        if (user == null) {
            Clients.Models.SapHttpData<List<User>?> response = await this.client.Get<List<User>>(
                "CNBS_GET_APP_USER_ACTION",
                new Dictionary<string, string?> {
                    {"user_id", userId}
                },
                language);

            user = response?.Data?.FirstOrDefault();
        }

        if (user != null)
        {
            user.Claims ??= new List<Claim>();
            user.Claims.AddRange(user.GetMetainfoClaims());
            user.Claims.AddRange(user.GetAbilityClaims());
        }

        return user;
    }

    // note, these methods use a different path key than GetUserById
    public async Task<User?> GetUserByLogin(string login, string language = "en") => await this.GetUserByKeyValuePair("login", login, language);
    public async Task<User?> GetUserByEmail(string email, string language = "en") => await this.GetUserByKeyValuePair("email", email, language);
    private async Task<User?> GetUserByKeyValuePair(string paramKey, string paramValue, string language = "en") {
        User? user = null;

        if (this.sfClient != null) {
            try {
                Clients.Models.SapHttpData<List<User>?> sfResponse = await this.sfClient.Get<List<User>>(
                    "CNBS_GET_APP_USER_ACTION",
                    new Dictionary<string, string?> {
                        { paramKey, paramValue }
                    },
                    language);

                user = sfResponse?.Data?.FirstOrDefault();
            } catch {
                // Fall back to SAP
            }
        }

        if (user == null) {
            Clients.Models.SapHttpData<List<User>?> response = await this.client.Get<List<User>>(
                "CNBS_GET_APP_USERS",
                new Dictionary<string, string?> {
                    { paramKey, paramValue }
                },
                language);

            user = response?.Data?.FirstOrDefault();
        }

        if (user != null)
        {
            user.Claims ??= new List<Claim>();
            user.Claims.AddRange(user.GetMetainfoClaims());
            user.Claims.AddRange(user.GetAbilityClaims());
        }

        return user;
    }

    public async Task<User?> CreateUser(User user, string language = "en") {
        // does the Create call attach the accounts to the new user?
        foreach (Account? account in user.Accounts.EmptyIfNull()) {
            account.AccountTypeId = account.AccountTypeId.ToUpper();
        }

        Clients.Models.SapHttpData<User?> response = await this.client.Post<User>(
            "CNBS_GET_APP_USER_ACTION",
            null,
            new { Data = user, Action = "create", },
            language
        );

        User? newUser = response?.Data;
        if (newUser != null) {
            //_logger.LogTrace($"CreateUser(): created: user '{newUser.Login}' status='{newUser.Status}' accounts={newUser.Accounts.EmptyIfNull().Count()}");

            //TODO: determine whether these reassignments are really necessary, remove if possible
            newUser.Accounts = user.Accounts;
            newUser.Status = user.Status;

            this.ClearSensitiveData(user);
        }
        return newUser;
    }

    public async Task<User?> UpdateUser(User user, string language = "en") {
        foreach (Account? account in user.Accounts.EmptyIfNull()) {
            account.AccountTypeId = account.AccountTypeId.ToUpper();
        }

        bool isSalesforceUser = !string.IsNullOrEmpty(user.UserId) &&
            (user.UserId.Length == 18 || user.UserId.Length == 15 || user.UserId.StartsWith("a08", StringComparison.OrdinalIgnoreCase));

        if (this.sfClient != null && isSalesforceUser) {
            try {
                Clients.Models.SapHttpData<User?> sfResponse = await this.sfClient.Post<User>(
                    "CNBS_GET_APP_USER_ACTION",
                    null,
                    new { Data = user, Action = "modify" },
                    language
                );
                if (sfResponse?.Data != null) {
                    this.ClearSensitiveData(user);
                    return sfResponse.Data;
                }
            } catch {
                // Fallback to client
            }
        }

        //_logger.LogTrace($"UpdateUser(): before: user '{user.Login}' status='{user.Status}' accounts={user.Accounts.EmptyIfNull().Count()}");
        Clients.Models.SapHttpData<User?> response = await this.client.Post<User>(
            "CNBS_GET_APP_USER_ACTION",
            null,
            new { Data = user, Action = "modify", },
            language
        );
        //_logger.LogTrace($"UpdateUser(): after: user '{user.Login}' status='{user.Status}' accounts={user.Accounts.EmptyIfNull().Count()}");

        User? updatedUser = response?.Data;
        if (updatedUser != null) {
            //_logger.LogTrace($"UpdateUser(): updated: user '{updatedUser.Login}' status='{updatedUser.Status}' accounts={updatedUser.Accounts.EmptyIfNull().Count()}");
            this.ClearSensitiveData(user);
        }

        return updatedUser;
    }

    public async Task<User?> DeleteUser(User user, string language = "en") {
        foreach (Account? account in user.Accounts.EmptyIfNull()) {
            account.AccountTypeId = account.AccountTypeId.ToUpper();
        }

        bool isSalesforceUser = !string.IsNullOrEmpty(user.UserId) &&
            (user.UserId.Length == 18 || user.UserId.Length == 15 || user.UserId.StartsWith("a08", StringComparison.OrdinalIgnoreCase));

        if (this.sfClient != null && isSalesforceUser) {
            try {
                Clients.Models.SapHttpData<User?> sfResponse = await this.sfClient.Post<User>(
                    "CNBS_GET_APP_USER_ACTION",
                    null,
                    new { Data = user, Action = "delete" },
                    language
                );
                return sfResponse?.Data;
            } catch {
                // Fallback to client
            }
        }

        Clients.Models.SapHttpData<User?> response = await this.client.Post<User>(
            "CNBS_GET_APP_USER_ACTION",
            null,
            new { Data = user, Action = "delete", },
            language
        );

        return response.Data;  // should always be null
    }

    private void ClearSensitiveData(User user) {
        if (user != null) {
            user.PasswordHash = "";
            user.PasswordSalt = "";
            user.ConfirmationToken = "";
            user.PasswordResetToken = "";
            user.InviteToken = "";
        }
    }

    public async Task<Status?> RecoverUser(string key, string user, string mode, string language) {
        //CNBS_GET_ADMIN_RECOVERY
        Clients.Models.SapHttpData<Status?> response = await this.client.GetData<Status>("CNBS_GET_ADMIN_RECOVERY",
               new Dictionary<string, string?> {
                    { "recovery_key", key },
                    { "recovery_mode", mode},
                    {"login", user }
               }, language);

        Status? status = response.Data;

        return status;
    }

    public async Task<User?> GetUserByResetPassword(string requestId, string language = "en") => await this.GetUserByKeyValuePair("password_reset_token", requestId, language);

}
