using Epay3Service.Helpers;
using Epay3Service.Models;
using Xunit;

namespace Epay3Service.Tests.Helpers;

public class CompanyAccountFilterTests
{
    private static Account Account(string companyCode) =>
        new() { CompanyCode = companyCode };

    private static CompanyInfo Company(string code, bool isActive) =>
        new() { CompanyCode = code, IsActive = isActive };

    [Fact]
    public void Removes_accounts_linked_to_inactive_company()
    {
        var accounts = new List<Account> { Account("1000"), Account("3000") };
        var companies = new List<CompanyInfo> { Company("1000", true), Company("3000", false) };

        var result = CompanyAccountFilter.RemoveInactiveCompanyAccounts(accounts, companies);

        Assert.Single(result);
        Assert.Equal("1000", result[0].CompanyCode);
    }

    [Fact]
    public void Keeps_all_when_no_inactive_companies()
    {
        var accounts = new List<Account> { Account("1000"), Account("3000") };
        var companies = new List<CompanyInfo> { Company("1000", true), Company("3000", true) };

        var result = CompanyAccountFilter.RemoveInactiveCompanyAccounts(accounts, companies);

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public void Keeps_accounts_whose_company_is_unknown()
    {
        // Company not present in the list -> kept (SAP remains the authority).
        var accounts = new List<Account> { Account("9999") };
        var companies = new List<CompanyInfo> { Company("1000", false) };

        var result = CompanyAccountFilter.RemoveInactiveCompanyAccounts(accounts, companies);

        Assert.Single(result);
        Assert.Equal("9999", result[0].CompanyCode);
    }

    [Fact]
    public void Matches_company_code_case_insensitively()
    {
        var accounts = new List<Account> { Account("abc") };
        var companies = new List<CompanyInfo> { Company("ABC", false) };

        var result = CompanyAccountFilter.RemoveInactiveCompanyAccounts(accounts, companies);

        Assert.Empty(result);
    }

    [Fact]
    public void Keeps_all_when_company_list_is_null()
    {
        var accounts = new List<Account> { Account("1000") };

        var result = CompanyAccountFilter.RemoveInactiveCompanyAccounts(accounts, null);

        Assert.Single(result);
    }

    [Fact]
    public void Keeps_account_with_blank_company_code()
    {
        var accounts = new List<Account> { Account("") };
        var companies = new List<CompanyInfo> { Company("1000", false) };

        var result = CompanyAccountFilter.RemoveInactiveCompanyAccounts(accounts, companies);

        Assert.Single(result);
    }
}
