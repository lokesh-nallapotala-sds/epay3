using Epay3Service.Models;

namespace Epay3Service.Managers.Interfaces;

public interface IAccountManager
{
    public Task<List<Account>?> GetAccountsByUser(User user, string language = "en", bool forceRefresh = false);

    public Task<List<AccountView>> GetAccountViewsByUser(User user, string language = "en", bool forceRefresh = false);

    public Task<List<Account>?> GetLinkedAccountsByUser(User user, string language = "en", bool forceRefresh = false);

    public Account? FindLinkedAccount(IEnumerable<Account>? accounts, string accountNumber, string? companyCode = null, string? salesOrganization = null);

    public Task<List<RelatedAccount>?> GetRelatedAccounts(User user, string accountNumber, string language = "en", string? companyCode = null);

    public Task<List<RelatedAccount>?> GetRelatedAccounts(User user, Account account, string language = "en");

    public Task<Account?> CreateAccount(Account account, string language = "en");

    public Task<Account?> UpdateAccount(Account account, string language = "en");

    public Task<Account?> DeleteAccount(string userId, string accountId, string language = "en");
}
