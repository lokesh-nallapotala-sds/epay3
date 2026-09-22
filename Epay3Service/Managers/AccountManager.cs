using Epay3Service.Clients.Interfaces;
using Epay3Service.Helpers;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;

namespace Epay3Service.Managers;

public class AccountManager(
    ISalesforceHttpClient sfClient,
    ISapHttpClient client,
    IApplicationConfigurationManager applicationConfigurationManager) : IAccountManager
{
    private readonly ISalesforceHttpClient sfClient = sfClient;
    private readonly ISapHttpClient client = client;
    private readonly IApplicationConfigurationManager applicationConfigurationManager = applicationConfigurationManager;

    // primary account type (account primary activity type?)
    private readonly string SoldTo = "SoldTo";
    private readonly string Payer = "Payer";
    private readonly string Partner = "Partner";

    private static string BuildCacheId(string? userId, params string?[] parts) =>
        string.Join("|", new[] { userId }
            .Concat(parts)
            .Where(part => !string.IsNullOrWhiteSpace(part))
            .Select(part => part!.Trim()));

    public async Task<List<Account>?> GetAccountsByUser(User user, string language = "en", bool forceRefresh = false)
    {
        List<AccountView> accountViews = await this.GetAccountViewsByUser(user, language, forceRefresh);
        return accountViews.Select(this.CloneAccount).ToList();
    }

    public async Task<List<AccountView>> GetAccountViewsByUser(User user, string language = "en", bool forceRefresh = false)
    {
        List<Account>? linkedAccounts = await this.GetLinkedAccountsByUser(user, language, forceRefresh);
        if (linkedAccounts == null || linkedAccounts.Count == 0)
        {
            return [];
        }

        var accountViews = new List<AccountView>(linkedAccounts.Count);
        foreach (Account account in linkedAccounts)
        {
            AccountView accountView = await this.BuildAccountView(user, account, language, forceRefresh);
            accountViews.Add(accountView);
        }

        return accountViews;
    }

    public async Task<List<Account>?> GetLinkedAccountsByUser(User user, string language = "en", bool forceRefresh = false)
    {
        Dictionary<string, string?> queryParams = new()
        {
            { "userId", user.UserId },
            { "user_id", user.UserId },
            { "cache_id", user.UserId }
        };

        if (forceRefresh)
        {
            queryParams["forceRefresh"] = bool.TrueString;
        }

        Clients.Models.SapHttpData<List<Account>?>? response = null;
        try
        {
            response = await this.sfClient.Get<List<Account>>(
                "CNBS_GET_APP_USER_ACCOUNTS",
                queryParams,
                language
            );
        }
        catch
        {
            // Fall back to SAP if SF fails
        }

        if (response?.Data == null || response.Data.Count == 0)
        {
            try
            {
                response = await this.client.Get<List<Account>>(
                    "CNBS_GET_APP_USER_ACCOUNTS",
                    queryParams,
                    language
                );
            }
            catch
            {
                // ignore
            }
        }

        if (response?.Data == null)
        {
            return null;
        }

        List<Account> accounts = response.Data.Select(this.CloneAccount).ToList();

        // Drop accounts linked to an inactive company code (server-side; the company
        // activity flag is resolved from config, not trusted from the client).
        SapCustomData? customData = await this.applicationConfigurationManager.GetCustomConfig(language);
        accounts = CompanyAccountFilter.RemoveInactiveCompanyAccounts(accounts, customData?.CompanyCodes);

        return accounts
           .OrderBy(x => string.IsNullOrWhiteSpace(x.PrimaryAcct))
           .ThenBy(x => x.PrimaryAcct, StringComparer.Ordinal)
           .ToList();
    }

    public Account? FindLinkedAccount(
         IEnumerable<Account>? accounts,
         string accountNumber,
         string? companyCode = null,
         string? salesOrganization = null)
    {
        string normalizedAccountNumber = accountNumber.TrimStart('0');

        return accounts?
            .Where(x => (x.PrimaryAcct ?? string.Empty).TrimStart('0') == normalizedAccountNumber)
            .Where(x => string.IsNullOrWhiteSpace(companyCode) || x.CompanyCode == companyCode)
            .Where(x => string.IsNullOrWhiteSpace(salesOrganization) || x.SalesOrganization == salesOrganization)
            .FirstOrDefault();
    }

    public async Task<List<RelatedAccount>?> GetRelatedAccounts(User user, string accountNumber, string language = "en", string? companyCode = null)
    {
        List<Account>? accounts = await this.GetHydratedAccountsByUser(user, language);
        Account? account = this.FindLinkedAccount(accounts, accountNumber, companyCode);

        return account?.RelatedAccounts?.Select(this.CloneRelatedAccount).ToList();
    }

    public async Task<List<RelatedAccount>?> GetRelatedAccounts(User user, Account account, string language = "en")
    {
        if (account.RelatedAccounts?.Count > 0)
        {
            return account.RelatedAccounts.Select(this.CloneRelatedAccount).ToList();
        }

        List<Account>? accounts = await this.GetHydratedAccountsByUser(user, language);
        Account? hydratedAccount = this.FindLinkedAccount(accounts, account.PrimaryAcct ?? string.Empty, account.CompanyCode ?? null);

        return hydratedAccount?.RelatedAccounts?.Select(this.CloneRelatedAccount).ToList();
    }

    private async Task<List<Account>?> GetHydratedAccountsByUser(User user, string language)
    {
        if (this.HasHydratedAccounts(user.Accounts))
        {
            return user.Accounts?.Select(this.CloneAccount).ToList();
        }

        if (string.IsNullOrWhiteSpace(user.PrimaryAccountType))
        {
            List<Account>? linkedAccounts = await this.GetLinkedAccountsByUser(user, language);
            if (linkedAccounts != null)
            {
                user.Accounts = linkedAccounts.Select(this.CloneAccount).ToList();
            }

            return linkedAccounts;
        }

        List<Account>? accounts = await this.GetAccountsByUser(user, language);
        if (accounts != null)
        {
            user.Accounts = accounts.Select(this.CloneAccount).ToList();
        }

        return accounts;
    }

    private bool HasHydratedAccounts(IEnumerable<Account>? accounts) =>
        accounts?.Any(x => x.RelatedAccounts?.Count > 0 || x.Address != null) == true;

    private async Task<AccountDetail?> GetSoldToAccount(User user, Account account, string language, bool forceRefresh = false)
    {
        try
        {
            Dictionary<string, string?> queryParams = new()
            {
                {"customer_number", account.PrimaryAcct },
                {"sales_organization", account.SalesOrganization},
                {"distribution_channel", account.DistributionChannel},
                {"division", account.Division},
                {
                    "cache_id",
                    BuildCacheId(
                        user.UserId,
                        this.SoldTo,
                        account.PrimaryAcct,
                        account.CompanyCode,
                        account.SalesOrganization,
                        account.DistributionChannel,
                        account.Division)
                }
            };

            if (forceRefresh)
            {
                queryParams["forcerefresh"] = bool.TrueString;
            }

            Clients.Models.SapHttpData<AccountDetail?> response = await this.client.Get<AccountDetail>(
                "CNBS_SOLD_TO_PATH",
                queryParams,
                language
            );

            return response?.Data;
        }
        catch
        {
            return null;
        }

    }
    private async Task<PayerDetail?> GetPayerDetails(User user, RelatedAccount payer, string language, bool forceRefresh = false)
    {
        try
        {
            Dictionary<string, string?> queryParams = new()
            {
                {"customer_number", payer.PrimaryAccount },
                {"company_code", payer.CompanyCode},
                {"sales_organization", payer.SalesOrganization},
                {"distribution_channel", payer.DistributionChannel},
                {"division", payer.Division},
                {
                    "cache_id",
                    BuildCacheId(
                        user.UserId,
                        this.Payer,
                        payer.PrimaryAccount,
                        payer.CompanyCode,
                        payer.SalesOrganization,
                        payer.DistributionChannel,
                        payer.Division)
                }
            };

            if (forceRefresh)
            {
                queryParams["forcerefresh"] = bool.TrueString;
            }

            Clients.Models.SapHttpData<PayerDetail?> response = await this.client.Get<PayerDetail>(
                "CNBS_PAYER_PATH",
                queryParams,
                language
            );

            if (response?.Data != null)
            {
                response.Data.IsAutoPayEnrolled = response.Data.PayerAutoPayStatus?.Any(x => x.Enrolled) ?? false;
            }

            return response?.Data;
        }
        catch
        {
            return null;
        }
    }

    private async Task<AccountDetail?> GetPayerAccount(User user, Account account, string language, bool forceRefresh = false)
    {
        try
        {
            Dictionary<string, string?> queryParams = new()
            {
                {"customer_number", account.PrimaryAcct },
                {"company_code", account.CompanyCode},
                {"payer_det_action", "01"},
                {"sales_organization", account.SalesOrganization},
                {"distribution_channel", account.DistributionChannel},
                {"division", account.Division},
                {
                    "cache_id",
                    BuildCacheId(
                        user.UserId,
                        this.Payer,
                        account.PrimaryAcct,
                        account.CompanyCode,
                        account.SalesOrganization,
                        account.DistributionChannel,
                        account.Division)
                }
            };

            if (forceRefresh)
            {
                queryParams["forcerefresh"] = bool.TrueString;
            }

            Clients.Models.SapHttpData<AccountDetail?> response = await this.client.Get<AccountDetail>(
                "CNBS_PAYER_PATH",
                queryParams,
                language
            );

            return response?.Data;
        }
        catch
        {
            return null;
        }
    }

    private async Task<AccountView> BuildAccountView(User user, Account account, string language, bool forceRefresh)
    {
        AccountView accountView = this.CreateAccountView(account);

        if (user.PrimaryAccountType.StartsWith(this.Payer, StringComparison.OrdinalIgnoreCase))
        {
            PayerDetail? payerDetail = this.NormalizePayerDetail(account.PayerDet)
                ?? this.NormalizePayerDetail(await this.GetPayerDetails(user, this.ToSelfPayerAccount(accountView), language, forceRefresh));

            accountView.PayerDetail = payerDetail;
            accountView.Address = payerDetail?.AddressData;
            accountView.RelatedAccounts = this.BuildSoldToRelatedAccounts(account, payerDetail);
            accountView.AvailablePayers = [this.ToSelfPayerAccount(accountView)];
            accountView.DefaultPayer = accountView.AvailablePayers[0];
            accountView.ResolvedPayerDetails = payerDetail;
            return accountView;
        }

        AccountDetail? soldToDetail = account.SoldToDet ?? await this.GetSoldToAccount(user, account, language, forceRefresh);
        accountView.SoldToDetail = soldToDetail;
        accountView.Address = soldToDetail?.AddressData;
        accountView.RelatedAccounts = this.BuildPayerRelatedAccounts(account, soldToDetail);
        accountView.AvailablePayers = accountView.RelatedAccounts?.Select(this.CloneRelatedAccount).ToList() ?? [];
        accountView.DefaultPayer = this.ResolveDefaultPayer(accountView.AvailablePayers);

        if (accountView.DefaultPayer != null)
        {
            accountView.ResolvedPayerDetails = await this.GetPayerDetails(user, accountView.DefaultPayer, language, forceRefresh);
        }

        return accountView;
    }

    private List<RelatedAccount>? BuildSoldToRelatedAccounts(Account account, PayerDetail? detail) =>
        detail?.SoldToList?.Select(x => new RelatedAccount
        {
            CompanyCode = account.CompanyCode,
            SubType = this.SoldTo,
            PrimaryAccount = x.CustomerNumber?.TrimStart('0'),
            Name = x.Address?.Name,
            Name2 = x.Address?.Name2,
            Name3 = x.Address?.Name3,
            Name4 = x.Address?.Name4,
            DistributionChannel = x.SalesArea?.DistributionChannel,
            Division = x.SalesArea?.Division,
            SalesOrganization = x.SalesArea?.SalesOrganization,
            Selected = true
        }).ToList();

    private List<RelatedAccount>? BuildPayerRelatedAccounts(Account account, AccountDetail? soldToDetail)
    {
        SalesData? salesData = soldToDetail?.SalesData?.FirstOrDefault(x => x.SalesArea?.CompanyCode == account.CompanyCode);
        var partners = salesData?.Partners
            .Where(x => x.PartnerFunction != null && x.PartnerFunction.Equals("RG", StringComparison.InvariantCultureIgnoreCase))
            .OrderBy(x => x.PartnerNumber?.TrimStart('0'), StringComparer.Ordinal)
            .ToList();

        var relatedAccounts = partners?.Select(x => new RelatedAccount
        {
            SubType = this.Partner,
            PrimaryAccount = x.PartnerNumber?.TrimStart('0'),
            CompanyCode = account.CompanyCode,
            Division = salesData?.SalesArea?.Division,
            SalesOrganization = salesData?.SalesArea?.SalesOrganization,
            DistributionChannel = salesData?.SalesArea?.DistributionChannel,
            Name = x.Address?.Name,
            Name2 = x.Address?.Name2,
            Name3 = x.Address?.Name3,
            Name4 = x.Address?.Name4,
            Selected = !string.IsNullOrEmpty(x.DefaultPartner)
        }).ToList();

        if (relatedAccounts?.Count == 1)
        {
            relatedAccounts[0].Selected = true;
        }

        return relatedAccounts;
    }

    private RelatedAccount? ResolveDefaultPayer(IEnumerable<RelatedAccount>? availablePayers)
    {
        List<RelatedAccount> payers = availablePayers?.ToList() ?? [];
        if (payers.Count == 0)
        {
            return null;
        }

        RelatedAccount? markedDefault = payers.FirstOrDefault(x => x.Selected);
        if (markedDefault != null)
        {
            return this.CloneRelatedAccount(markedDefault);
        }

        RelatedAccount fallback = this.CloneRelatedAccount(payers
            .OrderBy(x => x.PrimaryAccount, StringComparer.Ordinal)
            .First());
        fallback.Selected = true;
        return fallback;
    }

    private RelatedAccount ToSelfPayerAccount(Account account) =>
        new()
        {
            SubType = this.Payer,
            PrimaryAccount = account.PrimaryAcct?.TrimStart('0'),
            CompanyCode = account.CompanyCode,
            Division = account.Division,
            SalesOrganization = account.SalesOrganization,
            DistributionChannel = account.DistributionChannel,
            Name = account.Address?.Name ?? account.PayerDet?.AddressData?.Name,
            Name2 = account.Address?.Name2 ?? account.PayerDet?.AddressData?.Name2,
            Name3 = account.Address?.Name3 ?? account.PayerDet?.AddressData?.Name3,
            Name4 = account.Address?.Name4 ?? account.PayerDet?.AddressData?.Name4,
            Selected = true
        };

    private PayerDetail? NormalizePayerDetail(PayerDetail? payerDetail)
    {
        if (payerDetail != null)
        {
            payerDetail.IsAutoPayEnrolled = payerDetail.PayerAutoPayStatus?.Any(x => x.Enrolled) ?? false;
        }

        return payerDetail;
    }

    public async Task<Account?> CreateAccount(Account account, string language = "en")
    {
        try
        {
            var requestBody = new
            {
                account_id = account.AccountId,
                user_id = account.UserId,
                primary_account = account.PrimaryAcct,
                account_type = account.AccountTypeId,
                company_code = account.CompanyCode,
                division = account.Division,
                sales_organization = account.SalesOrganization,
                distribution_channel = account.DistributionChannel,
                allow_payments = account.AllowPayments ? "X" : "",
                allow_deposits = account.AllowDeposits ? "X" : ""
            };

            if (this.sfClient != null)
            {
                try
                {
                    Clients.Models.SapHttpData<Account?> sfResponse = await this.sfClient.Post<Account>(
                        "CNBS_GET_APP_USER_ACCOUNT_ACTION",
                        null,
                        new { Data = requestBody, Action = "create" },
                        language
                    );
                    if (sfResponse?.Data != null)
                    {
                        return sfResponse.Data;
                    }
                }
                catch
                {
                    // Fall back to SAP if SF fails
                }
            }

            Clients.Models.SapHttpData<Account?> response = await this.client.Post<Account>(
                "CNBS_GET_APP_USER_ACCOUNT_ACTION",
                null,
                new { Data = requestBody, Action = "create" },
                language
            );

            Account? newAccount = response?.Data;
            return newAccount;
        }
        catch (Exception)
        {
            return null;
        }
    }

    public async Task<Account?> CreateAccountByInvoice(string userId, string accountId, string invoiceId, decimal invoiceAmt, string language = "en")
    {
        try
        {
            var requestBody = new
            {
                accountNumber = accountId,
                invoiceNumber = invoiceId,
                invoiceAmount = invoiceAmt.ToString("N2"),
            };

            if (this.sfClient != null)
            {
                try
                {
                    Clients.Models.SapHttpData<Account?> sfResponse = await this.sfClient.Post<Account>(
                        "CNBS_GET_APP_USER_ACCOUNT_ACTION",
                        null,
                        new { Data = requestBody, Action = "create" },
                        language
                    );
                    if (sfResponse?.Data != null)
                    {
                        return sfResponse.Data;
                    }
                }
                catch
                {
                    // Fall back to SAP if SF fails
                }
            }

            Clients.Models.SapHttpData<Account?> response = await this.client.Post<Account>(
                "CNBS_GET_APP_USER_ACCOUNT_ACTION",
                null,
                new { Data = requestBody, Action = "create" },
                language
            );

            return response?.Data;
        }
        catch (Exception)
        {
            return null;
        }
    }

    public async Task<Account?> UpdateAccount(Account account, string language = "en")
    {
        try
        {
            var requestBody = new
            {
                account_id = account.AccountId,
                user_id = account.UserId,
                primary_account = account.PrimaryAcct,
                account_type = account.AccountTypeId,
                company_code = account.CompanyCode,
                division = account.Division,
                sales_organization = account.SalesOrganization,
                distribution_channel = account.DistributionChannel,
                allow_payments = account.AllowPayments ? "X" : "",
                allow_deposits = account.AllowDeposits ? "X" : ""
            };

            if (this.sfClient != null)
            {
                try
                {
                    Clients.Models.SapHttpData<Account?> sfResponse = await this.sfClient.Post<Account>(
                        "CNBS_GET_APP_USER_ACCOUNT_ACTION",
                        null,
                        new { Data = requestBody, Action = "modify" },
                        language
                    );
                    if (sfResponse?.Data != null)
                    {
                        return sfResponse.Data;
                    }
                }
                catch
                {
                    // Fall back to SAP if SF fails
                }
            }

            Clients.Models.SapHttpData<Account?> response = await this.client.Post<Account>(
                "CNBS_GET_APP_USER_ACCOUNT_ACTION",
                null,
                new { Data = account, Action = "modify" },
                language
            );

            Account? updatedAccount = response?.Data;
            return updatedAccount;
        }
        catch (Exception)
        {
            return null;
        }
    }

    public async Task<Account?> DeleteAccount(string userId, string accountId, string language = "en")
    {
        try
        {
            var requestBody = new
            {
                account_id = accountId,
                user_id = userId,
            };

            if (this.sfClient != null)
            {
                try
                {
                    Clients.Models.SapHttpData<Account?> sfResponse = await this.sfClient.Post<Account>(
                        "CNBS_GET_APP_USER_ACCOUNT_ACTION",
                        null,
                        new { Data = requestBody, Action = "delete" },
                        language
                    );
                    if (sfResponse != null && (sfResponse.Status == null || sfResponse.Status.MessageType == "S"))
                    {
                        return sfResponse.Data;
                    }
                }
                catch
                {
                    // Fall back to SAP if SF fails
                }
            }

            Clients.Models.SapHttpData<Account?> response = await this.client.Post<Account>(
                "CNBS_GET_APP_USER_ACCOUNT_ACTION",
                null,
                new { Data = requestBody, Action = "delete" },
                language
            );

            return response?.Data;
        }
        catch (Exception)
        {
            return null;
        }
    }

    private Account CloneAccount(Account account)
    {
        Account clone = new();
        this.CopyBaseAccountFields(account, clone);
        return clone;
    }

    private AccountView CreateAccountView(Account account)
    {
        AccountView view = new();
        this.CopyBaseAccountFields(account, view);
        return view;
    }

    private void CopyBaseAccountFields(Account source, Account target)
    {
        target.AccountId = source.AccountId;
        target.UserId = source.UserId;
        target.PrimaryAcct = source.PrimaryAcct;
        target.AccountTypeId = source.AccountTypeId;
        target.SalesOrganization = source.SalesOrganization;
        target.DistributionChannel = source.DistributionChannel;
        target.Division = source.Division;
        target.CompanyCode = source.CompanyCode;
        target.AllowPayments = source.AllowPayments;
        target.AllowDeposits = source.AllowDeposits;
        target.PayerDet = source.PayerDet;
        target.SoldToDet = source.SoldToDet;
        target.Address = source.Address;
        target.RelatedAccounts = source.RelatedAccounts?.Select(this.CloneRelatedAccount).ToList();
    }

    private RelatedAccount CloneRelatedAccount(RelatedAccount account) =>
        new()
        {
            SubType = account.SubType,
            PrimaryAccount = account.PrimaryAccount,
            CompanyCode = account.CompanyCode,
            Division = account.Division,
            SalesOrganization = account.SalesOrganization,
            DistributionChannel = account.DistributionChannel,
            Name = account.Name,
            Name2 = account.Name2,
            Name3 = account.Name3,
            Name4 = account.Name4,
            Selected = account.Selected,
        };
}

