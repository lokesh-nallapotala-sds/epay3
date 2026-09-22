namespace Epay3Service.Models;

public class UserAccountDto
{
    public string? AccountId { get; set; }

    public string? UserId { get; set; }

    public string? PrimaryAcct { get; set; }

    public string? AccountTypeId { get; set; }

    public string? CompanyCode { get; set; }

    public string? SalesOrganization { get; set; }

    public string? DistributionChannel { get; set; }

    public string? Division { get; set; }

    public bool AllowPayments { get; set; }

    public bool AllowDeposits { get; set; }

    public CompanyAddress? Address { get; set; }

    public List<RelatedAccount> RelatedAccounts { get; set; } = [];

    public List<RelatedAccount> AvailablePayers { get; set; } = [];

    public RelatedAccount? DefaultPayer { get; set; }

    public UserPayerDetailsDto? ResolvedPayerDetails { get; set; }
}
