using Epay3Service.Models;

namespace Epay3Net.Models;

public class UserView
{
    public string? UserId { get; set; }
    public string? Login { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public string? Company { get; set; }
    public string? PrimaryAccountType { get; set; }
    public string? Status { get; set; }
    public string? Role { get; set; }
    public string? RegionalFormat { get; set; }
    public List<LinkedAccountView> LinkedAccounts { get; set; } = [];

    public static UserView FromUser(User user) =>
        new()
        {
            UserId = user.UserId,
            Login = user.Login,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            Company = user.Company,
            PrimaryAccountType = user.PrimaryAccountType,
            Status = NormalizeStatus(user.Status),
            Role = user.Role,
            RegionalFormat = user.RegionalFormat,
            LinkedAccounts = user.LinkedAccounts?
                .OrderBy(account => string.IsNullOrWhiteSpace(account.PrimaryAccount))
                .ThenBy(account => account.PrimaryAccount, StringComparer.Ordinal)
                .Select(LinkedAccountView.FromLinkedAccount)
                .ToList() ?? []
        };

    private static string? NormalizeStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status)) return status;
        var trimmed = status.Trim();
        if (trimmed.Equals("awaiting confirmation", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Equals("awaiting-confirmation", StringComparison.OrdinalIgnoreCase))
        {
            return "waiting-confirmation";
        }
        if (trimmed.Equals("inactive", StringComparison.OrdinalIgnoreCase))
        {
            return "deactive";
        }
        return trimmed.ToLowerInvariant();
    }
}

public class LinkedAccountView
{
    public string? PrimaryAccount { get; set; }
    public string? Name { get; set; }

    public static LinkedAccountView FromLinkedAccount(LinkedAccount account) =>
        new()
        {
            PrimaryAccount = account.PrimaryAccount,
            Name = account.Name
        };
}
