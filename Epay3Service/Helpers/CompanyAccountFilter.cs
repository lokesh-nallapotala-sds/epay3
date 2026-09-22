using Epay3Service.Models;

namespace Epay3Service.Helpers;

/// <summary>
/// Filters out user accounts that are linked to an INACTIVE company code. Pure
/// (no I/O) so it is fully unit-testable; the caller supplies the resolved company
/// list (e.g. from <c>GetCustomConfig().CompanyCodes</c>).
/// </summary>
public static class CompanyAccountFilter
{
    /// <summary>
    /// Returns the accounts excluding any whose company code is explicitly marked
    /// inactive. Accounts whose company code is absent from <paramref name="companies"/>
    /// are KEPT — the company list may be incomplete and SAP remains the authority on
    /// company validity (mirrors the payment-policy "unknown company" handling).
    /// </summary>
    public static List<Account> RemoveInactiveCompanyAccounts(
        IEnumerable<Account> accounts,
        IEnumerable<CompanyInfo>? companies)
    {
        ArgumentNullException.ThrowIfNull(accounts);

        var inactiveCompanyCodes = new HashSet<string>(
            (companies ?? [])
                .Where(c => c is { IsActive: false } && !string.IsNullOrWhiteSpace(c.CompanyCode))
                .Select(c => c.CompanyCode!),
            StringComparer.OrdinalIgnoreCase);

        if (inactiveCompanyCodes.Count == 0)
        {
            return accounts.ToList();
        }

        return accounts
            .Where(a => string.IsNullOrWhiteSpace(a.CompanyCode)
                        || !inactiveCompanyCodes.Contains(a.CompanyCode))
            .ToList();
    }
}
