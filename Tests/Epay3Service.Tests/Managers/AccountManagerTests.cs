using Epay3.Test.Common.Helpers;
using Epay3Service.Clients.Interfaces;
using Epay3Service.Clients.Models;
using Epay3Service.Managers;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;
using Moq;
using Xunit;

namespace Epay3Service.Tests.Managers;

public class AccountManagerTests
{
    private readonly Mock<ISalesforceHttpClient> _mockSapClient;
    private readonly Mock<IApplicationConfigurationManager> _mockConfigManager;
    private readonly AccountManager _accountManager;

    public AccountManagerTests()
    {
        _mockSapClient = new Mock<ISalesforceHttpClient>();
        _mockConfigManager = new Mock<IApplicationConfigurationManager>();
        _accountManager = new AccountManager(_mockSapClient.Object, _mockSapClient.Object, _mockConfigManager.Object);
    }

    [Fact]
    public async Task GetAccountsByUser_ReturnsAccountsWithDetails_WhenAccountsExist()
    {
        // Arrange
        var user = new User { UserId = "000C29F0318A1EDFAC969B7AF90ECB83", PrimaryAccountType = "SoldTo" };

        // Mock accounts list response
        var accountsData = new List<Account>
        {
            new() { PrimaryAcct = "1000", CompanyCode = "3000", AccountTypeId = "SoldTo" }
        };
        // Wrap in SapHttpData as client returns that
        var sapAccountsResponse = new SapHttpData<List<Account>?> { Data = accountsData };

        _mockSapClient.Setup(c => c.Get<List<Account>>(
            "CNBS_GET_APP_USER_ACCOUNTS",
            It.Is<Dictionary<string, string?>>(d => d["user_id"] == user.UserId && d["cache_id"] == user.UserId),
            "en",
            true))
            .ReturnsAsync(sapAccountsResponse);

        // Mock account detail response (used for all accounts for simplicity in this test)
        var detailData = MockDataLoader.Load<SapHttpData<AccountDetail?>>("accountdetail.json");

        _mockSapClient.Setup(c => c.Get<AccountDetail>(
            It.IsAny<string>(), // Matches both CNBS_SOLD_TO_PATH and CNBS_PAYER_PATH
            It.IsAny<Dictionary<string, string?>>(),
            "en",
            true))
            .ReturnsAsync(detailData);

        // Act
        var result = await _accountManager.GetAccountsByUser(user, "en");

        // Assert
        Assert.NotNull(result);
        Assert.Equal(accountsData.Count, result!.Count);

        // Verify detail call was made (using SoldTo path because PrimaryAccountType is SoldTo)
        _mockSapClient.Verify(c => c.Get<AccountDetail>(
            "CNBS_SOLD_TO_PATH",
            It.IsAny<Dictionary<string, string?>>(),
            "en",
            true), Times.AtLeastOnce);

        // Verify address was populated from details
        Assert.All(result, account => Assert.NotNull(account.Address));
        Assert.Equal("Test City", result[0].Address?.City);
    }

    [Fact]
    public async Task GetLinkedAccountsByUser_ReturnsAccountsWithoutHydration_WhenAccountsExist()
    {
        var user = new User { UserId = "linked-user", PrimaryAccountType = "SoldTo" };
        var accountsData = MockDataLoader.Load<List<Account>>("accounts.json");
        var sapAccountsResponse = new SapHttpData<List<Account>?> { Data = accountsData };

        _mockSapClient.Setup(c => c.Get<List<Account>>(
            "CNBS_GET_APP_USER_ACCOUNTS",
            It.Is<Dictionary<string, string?>>(d => d["user_id"] == user.UserId && d["cache_id"] == user.UserId),
            "en",
            true))
            .ReturnsAsync(sapAccountsResponse);

        var result = await _accountManager.GetLinkedAccountsByUser(user, "en");

        Assert.NotNull(result);
        Assert.Equal(accountsData.Count, result!.Count);
        Assert.Contains(accountsData[0].PrimaryAcct, result.Select(r => r.PrimaryAcct));

        _mockSapClient.Verify(c => c.Get<AccountDetail>(
            It.IsAny<string>(),
            It.IsAny<Dictionary<string, string?>>(),
            It.IsAny<string>(),
            It.IsAny<bool>()), Times.Never);
    }

    [Fact]
    public async Task GetLinkedAccountsByUser_FiltersOutAccountsLinkedToInactiveCompany()
    {
        var user = new User { UserId = "linked-user", PrimaryAccountType = "SoldTo" };
        var accountsData = new List<Account>
        {
            new() { PrimaryAcct = "A1", CompanyCode = "1000", AccountTypeId = "SoldTo" },
            new() { PrimaryAcct = "A2", CompanyCode = "3000", AccountTypeId = "SoldTo" },
        };

        _mockSapClient.Setup(c => c.Get<List<Account>>(
            "CNBS_GET_APP_USER_ACCOUNTS",
            It.IsAny<Dictionary<string, string?>>(),
            "en",
            It.IsAny<bool>()))
            .ReturnsAsync(new SapHttpData<List<Account>?> { Data = accountsData });

        var customData = new SapCustomData();
        customData.CompanyCodes.Add(new CompanyInfo { CompanyCode = "1000", IsActive = true });
        customData.CompanyCodes.Add(new CompanyInfo { CompanyCode = "3000", IsActive = false });
        _mockConfigManager
            .Setup(m => m.GetCustomConfig(It.IsAny<string>(), It.IsAny<bool>()))
            .ReturnsAsync(customData);

        var result = await _accountManager.GetLinkedAccountsByUser(user, "en");

        Assert.NotNull(result);
        Assert.Single(result!);
        Assert.Equal("1000", result![0].CompanyCode);
    }

    [Fact]
    public async Task GetAccountViewsByUser_UsesCacheIdAndReturnsResolvedPayerDetails_ForSoldToUser()
    {
        var user = new User { UserId = "soldto-user", PrimaryAccountType = "SoldTo" };
        var account = new Account
        {
            PrimaryAcct = "5000",
            CompanyCode = "3000",
            SalesOrganization = "3000",
            DistributionChannel = "10",
            Division = "00",
            AccountTypeId = "SoldTo"
        };
        var linkedAccounts = new SapHttpData<List<Account>?> { Data = [account] };
        var soldToDetail = new SapHttpData<AccountDetail?>
        {
            Data = new AccountDetail
            {
                AddressData = new CompanyAddress { Name = "Sold To" },
                SalesData =
                [
                    new SalesData
                    {
                        SalesArea = new SalesArea
                        {
                            CompanyCode = "3000",
                            SalesOrganization = "3000",
                            DistributionChannel = "10",
                            Division = "00"
                        },
                        Partners =
                        [
                            new Partner
                            {
                                PartnerFunction = "RG",
                                PartnerNumber = "0000004000",
                                DefaultPartner = "X",
                                Address = new CompanyAddress { Name = "Default Payer" }
                            }
                        ]
                    }
                ]
            }
        };
        var payerDetail = new SapHttpData<PayerDetail?>
        {
            Data = new PayerDetail
            {
                PaymentCards = [new PaymentCard { PaymentCardToken = "tok-1" }]
            }
        };

        _mockSapClient.Setup(c => c.Get<List<Account>>(
            "CNBS_GET_APP_USER_ACCOUNTS",
            It.Is<Dictionary<string, string?>>(d => d["user_id"] == user.UserId && d["cache_id"] == user.UserId),
            "en",
            true)).ReturnsAsync(linkedAccounts);
        _mockSapClient.Setup(c => c.Get<AccountDetail>(
            "CNBS_SOLD_TO_PATH",
            It.Is<Dictionary<string, string?>>(d => d["cache_id"] == "soldto-user|SoldTo|5000|3000|3000|10|00"),
            "en",
            true)).ReturnsAsync(soldToDetail);
        _mockSapClient.Setup(c => c.Get<PayerDetail>(
            "CNBS_PAYER_PATH",
            It.Is<Dictionary<string, string?>>(d =>
                d["cache_id"] == "soldto-user|Payer|4000|3000|3000|10|00" &&
                d["customer_number"] == "4000"),
            "en",
            true)).ReturnsAsync(payerDetail);

        var result = await _accountManager.GetAccountViewsByUser(user, "en");

        Assert.Single(result);
        Assert.Equal("4000", result[0].DefaultPayer?.PrimaryAccount);
        Assert.Single(result[0].AvailablePayers);
        Assert.Single(result[0].ResolvedPayerDetails?.PaymentCards!);
    }

    [Fact]
    public async Task GetAccountViewsByUser_ForwardsForceRefreshToSapRequests()
    {
        var user = new User { UserId = "payer-user", PrimaryAccountType = "Payer" };
        var account = new Account
        {
            PrimaryAcct = "3000",
            CompanyCode = "3000",
            SalesOrganization = "3000",
            DistributionChannel = "10",
            Division = "00",
            AccountTypeId = "Payer"
        };

        _mockSapClient.Setup(c => c.Get<List<Account>>(
            "CNBS_GET_APP_USER_ACCOUNTS",
            It.Is<Dictionary<string, string?>>(d =>
                d["cache_id"] == user.UserId &&
                d["forceRefresh"] == bool.TrueString),
            "en",
            true)).ReturnsAsync(new SapHttpData<List<Account>?> { Data = [account] });

        _mockSapClient.Setup(c => c.Get<PayerDetail>(
            "CNBS_PAYER_PATH",
            It.Is<Dictionary<string, string?>>(d =>
                d["cache_id"] == "payer-user|Payer|3000|3000|3000|10|00" &&
                d["forcerefresh"] == bool.TrueString),
            "en",
            true)).ReturnsAsync(new SapHttpData<PayerDetail?> { Data = new PayerDetail() });

        await _accountManager.GetAccountViewsByUser(user, "en", true);

        _mockSapClient.VerifyAll();
    }

    [Fact]
    public async Task GetAccountsByUser_ReturnsEmpty_WhenResponseIsNull()
    {
        // Arrange
        var user = new User { UserId = "test-user", PrimaryAccountType = "SoldTo" };

        _mockSapClient.Setup(c => c.Get<List<Account>>(
            "CNBS_GET_APP_USER_ACCOUNTS",
            It.IsAny<Dictionary<string, string?>>(),
            "en",
            true))
            .ReturnsAsync((SapHttpData<List<Account>?>)null!);

        // Act
        var result = await _accountManager.GetAccountsByUser(user);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result!);
    }

    [Fact]
    public async Task GetAccountsByUser_CallsGetPayerAccount_WhenUserIsPayer()
    {
        // Arrange
        var user = new User { UserId = "payer-user", PrimaryAccountType = "Payer" };
        var accountsData = MockDataLoader.Load<List<Account>>("accounts.json");
        accountsData.ForEach(account => account.PayerDet = new PayerDetail
        {
            AddressData = new CompanyAddress { City = "Embedded City" },
            SoldToList = new List<SoldTo>
            {
                new() { CustomerNumber = "0000005555" }
            },
            PaymentCards = new List<PaymentCard>
            {
                new() { PaymentCardToken = "tok-1" }
            }
        });
        var sapAccountsResponse = new SapHttpData<List<Account>?> { Data = accountsData };

        _mockSapClient.Setup(c => c.Get<List<Account>>(
            "CNBS_GET_APP_USER_ACCOUNTS",
            It.Is<Dictionary<string, string?>>(d => d["user_id"] == user.UserId && d["cache_id"] == user.UserId),
            "en",
            true))
            .ReturnsAsync(sapAccountsResponse);

        // Act
        var result = await _accountManager.GetAccountsByUser(user, "en");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Embedded City", result![0].Address?.City);
        _mockSapClient.Verify(c => c.Get<AccountDetail>(
            "CNBS_PAYER_PATH",
            It.IsAny<Dictionary<string, string?>>(),
            "en",
            true), Times.Never);
        _mockSapClient.Verify(c => c.Get<PayerDetail>(
            "CNBS_PAYER_PATH",
            It.IsAny<Dictionary<string, string?>>(),
            "en",
            true), Times.Never);
    }

    [Fact]
    public async Task GetAccountsByUser_SetsAddressNull_WhenPayerDetailIsNull()
    {
        // Arrange
        var user = new User { UserId = "payer-user", PrimaryAccountType = "Payer" };
        var accountsData = MockDataLoader.Load<List<Account>>("accounts.json");
        var sapAccountsResponse = new SapHttpData<List<Account>?> { Data = accountsData };

        _mockSapClient.Setup(c => c.Get<List<Account>>(
            "CNBS_GET_APP_USER_ACCOUNTS",
            It.Is<Dictionary<string, string?>>(d => d["user_id"] == user.UserId && d["cache_id"] == user.UserId),
            "en",
            true))
            .ReturnsAsync(sapAccountsResponse);

        // Mock detail response as null
        _mockSapClient.Setup(c => c.Get<AccountDetail>(
            "CNBS_PAYER_PATH",
            It.IsAny<Dictionary<string, string?>>(),
            "en",
            true))
            .ReturnsAsync((SapHttpData<AccountDetail?>)null!);

        // Act
        var result = await _accountManager.GetAccountsByUser(user, "en");

        // Assert
        Assert.NotNull(result);
        Assert.All(result, account => Assert.Null(account.Address));
    }

    [Fact]
    public async Task GetAccountsByUser_SetsAddressNull_WhenSoldToDetailIsNull()
    {
        // Arrange
        var user = new User { UserId = "soldto-user", PrimaryAccountType = "SoldTo" };
        var accountsData = MockDataLoader.Load<List<Account>>("accounts.json");
        var sapAccountsResponse = new SapHttpData<List<Account>?> { Data = accountsData };

        _mockSapClient.Setup(c => c.Get<List<Account>>(
            "CNBS_GET_APP_USER_ACCOUNTS",
            It.Is<Dictionary<string, string?>>(d => d["user_id"] == user.UserId && d["cache_id"] == user.UserId),
            "en",
            true))
            .ReturnsAsync(sapAccountsResponse);

        // Mock detail response as null
        _mockSapClient.Setup(c => c.Get<AccountDetail>(
            "CNBS_SOLD_TO_PATH",
            It.IsAny<Dictionary<string, string?>>(),
            "en",
            true))
            .ReturnsAsync((SapHttpData<AccountDetail?>)null!);

        // Act
        var result = await _accountManager.GetAccountsByUser(user, "en");

        // Assert
        Assert.NotNull(result);
        Assert.All(result, account => Assert.Null(account.Address));
    }

    [Fact]
    public async Task GetRelatedAccounts_ReturnsRelatedAccounts_WhenFound()
    {
        // Arrange
        var user = new User { UserId = "000C29F0318A1EDFAC969B7AF90ECB83", PrimaryAccountType = "SoldTo" };
        var targetAccountNumber = "9508"; // Matches first account in accounts.json

        // Mock accounts list
        var accountsData = MockDataLoader.Load<List<Account>>("accounts.json");
        var sapAccountsResponse = new SapHttpData<List<Account>?> { Data = accountsData };

        _mockSapClient.Setup(c => c.Get<List<Account>>(
            "CNBS_GET_APP_USER_ACCOUNTS",
            It.Is<Dictionary<string, string?>>(d => d["user_id"] == user.UserId && d["cache_id"] == user.UserId),
            "en",
            true))
            .ReturnsAsync(sapAccountsResponse);

        // Mock detail response
        var detailData = MockDataLoader.Load<SapHttpData<AccountDetail?>>("accountdetail.json");
        _mockSapClient.Setup(c => c.Get<AccountDetail>(
            "CNBS_SOLD_TO_PATH",
            It.IsAny<Dictionary<string, string?>>(),
            "en",
            true))
            .ReturnsAsync(detailData);

        // Act
        var result = await _accountManager.GetRelatedAccounts(user, targetAccountNumber);

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result);
        Assert.Contains(result, r => r.PrimaryAccount == "9508"); // Check partner logic from accountdetail.json
        Assert.Equal("Partner", result![0].SubType);
    }

    [Fact]
    public void FindLinkedAccount_MatchesByNormalizedAccountNumber()
    {
        var accounts = new List<Account>
        {
            new() { PrimaryAcct = "000123" },
            new() { PrimaryAcct = "456" }
        };

        Account? result = _accountManager.FindLinkedAccount(accounts, "123");

        Assert.NotNull(result);
        Assert.Equal("000123", result!.PrimaryAcct);
    }

    [Fact]
    public void FindLinkedAccount_DistinguishesAccountsBySalesOrganization()
    {
        var accounts = new List<Account>
        {
            new() { PrimaryAcct = "3000", CompanyCode = "3000", SalesOrganization = "3000" },
            new() { PrimaryAcct = "3000", CompanyCode = "1000", SalesOrganization = "1000" }
        };

        Account? result3000 = _accountManager.FindLinkedAccount(accounts, "3000", "3000", "3000");
        Account? result1000 = _accountManager.FindLinkedAccount(accounts, "3000", "1000", "1000");

        Assert.NotNull(result3000);
        Assert.Equal("3000", result3000!.SalesOrganization);
        Assert.Equal("3000", result3000.CompanyCode);

        Assert.NotNull(result1000);
        Assert.Equal("1000", result1000!.SalesOrganization);
        Assert.Equal("1000", result1000.CompanyCode);
    }

    [Fact]
    public async Task GetAccountViewsByUser_ScopesPayerDetailCacheIdsByCompanyCode_ForDuplicatePayerAccounts()
    {
        var user = new User { UserId = "admin-user", PrimaryAccountType = "Payer" };
        var accounts = new List<Account>
        {
            new()
            {
                PrimaryAcct = "3000",
                CompanyCode = "1000",
                SalesOrganization = "1000",
                DistributionChannel = "10",
                Division = "00",
                AccountTypeId = "Payer"
            },
            new()
            {
                PrimaryAcct = "3000",
                CompanyCode = "3000",
                SalesOrganization = "3000",
                DistributionChannel = "10",
                Division = "00",
                AccountTypeId = "Payer"
            }
        };

        _mockSapClient.Setup(c => c.Get<List<Account>>(
            "CNBS_GET_APP_USER_ACCOUNTS",
            It.Is<Dictionary<string, string?>>(d => d["user_id"] == user.UserId && d["cache_id"] == user.UserId),
            "en",
            true)).ReturnsAsync(new SapHttpData<List<Account>?> { Data = accounts });

        _mockSapClient.Setup(c => c.Get<PayerDetail>(
            "CNBS_PAYER_PATH",
            It.Is<Dictionary<string, string?>>(d =>
                d["cache_id"] == "admin-user|Payer|3000|1000|1000|10|00" &&
                d["company_code"] == "1000"),
            "en",
            true)).ReturnsAsync(new SapHttpData<PayerDetail?>
            {
                Data = new PayerDetail
                {
                    PaymentCards = [new PaymentCard { PaymentCardToken = "tok-1000" }]
                }
            });

        _mockSapClient.Setup(c => c.Get<PayerDetail>(
            "CNBS_PAYER_PATH",
            It.Is<Dictionary<string, string?>>(d =>
                d["cache_id"] == "admin-user|Payer|3000|3000|3000|10|00" &&
                d["company_code"] == "3000"),
            "en",
            true)).ReturnsAsync(new SapHttpData<PayerDetail?>
            {
                Data = new PayerDetail
                {
                    PaymentCards = []
                }
            });

        List<AccountView> result = await _accountManager.GetAccountViewsByUser(user, "en");

        Assert.Equal(2, result.Count);
        Assert.Single(result.Single(x => x.CompanyCode == "1000").ResolvedPayerDetails!.PaymentCards!);
        Assert.Empty(result.Single(x => x.CompanyCode == "3000").ResolvedPayerDetails!.PaymentCards!);
        _mockSapClient.VerifyAll();
    }

    [Fact]
    public async Task CreateAccount_ReturnsCreatedAccount_OnSuccess()
    {
        // Arrange
        var account = new Account
        {
            UserId = "user1",
            PrimaryAcct = "12345",
            CompanyCode = "3000",
            SalesOrganization = "3000",
            DistributionChannel = "10",
            Division = "00",
            AccountTypeId = "SoldTo"
        };

        var sapResponse = new SapHttpData<Account?> { Data = account }; // Return same account for simplicity

        _mockSapClient.Setup(c => c.Post<Account>(
            "CNBS_GET_APP_USER_ACCOUNT_ACTION",
            null,
            It.IsAny<object>(),
            "en",
            true))
            .ReturnsAsync(sapResponse);

        // Act
        var result = await _accountManager.CreateAccount(account);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(account.PrimaryAcct, result!.PrimaryAcct);
    }

    [Fact]
    public async Task DeleteAccount_ReturnsResponseData_OnSuccess()
    {
        // Arrange
        var userId = "user1";
        var accountId = "acc1";

        // Delete usually returns null or the deleted object depending on API, assuming null/success here
        // The manager returns response?.Data
        var sapResponse = new SapHttpData<Account?> { Data = null };

        _mockSapClient.Setup(c => c.Post<Account>(
            "CNBS_GET_APP_USER_ACCOUNT_ACTION",
            null,
            It.IsAny<object>(),
            "en",
            true))
            .ReturnsAsync(sapResponse);

        // Act
        var result = await _accountManager.DeleteAccount(userId, accountId);

        // Assert
        Assert.Null(result);
    }
    [Fact]
    public async Task GetRelatedAccounts_ReturnsNull_WhenResponseIsNull()
    {
        var user = new User { UserId = "u1" };
        _mockSapClient.Setup(c => c.Get<List<Account>>(It.IsAny<string>(), It.IsAny<Dictionary<string, string?>>(), It.IsAny<string>(), It.IsAny<bool>()))
            .ReturnsAsync((SapHttpData<List<Account>?>)null!);

        var result = await _accountManager.GetRelatedAccounts(user, "123");
        Assert.Null(result);
    }

    [Fact]
    public async Task GetRelatedAccounts_ReturnsNull_WhenAccountsListIsEmpty()
    {
        var user = new User { UserId = "u1" };
        var sapResponse = new SapHttpData<List<Account>?> { Data = new List<Account>() };
        _mockSapClient.Setup(c => c.Get<List<Account>>(It.IsAny<string>(), It.IsAny<Dictionary<string, string?>>(), It.IsAny<string>(), It.IsAny<bool>()))
            .ReturnsAsync(sapResponse);

        var result = await _accountManager.GetRelatedAccounts(user, "123");
        Assert.Null(result);
    }

    [Fact]
    public async Task GetRelatedAccounts_ReturnsNull_WhenTargetAccountNotFound()
    {
        var user = new User { UserId = "u1" };
        var accounts = new List<Account> { new Account { PrimaryAcct = "999" } };
        var sapResponse = new SapHttpData<List<Account>?> { Data = accounts };
        _mockSapClient.Setup(c => c.Get<List<Account>>(It.IsAny<string>(), It.IsAny<Dictionary<string, string?>>(), It.IsAny<string>(), It.IsAny<bool>()))
            .ReturnsAsync(sapResponse);

        var result = await _accountManager.GetRelatedAccounts(user, "123");
        Assert.Null(result);
    }

    [Fact]
    public async Task GetRelatedAccounts_ReturnsSoldToList_WhenUserIsPayer()
    {
        // Arrange
        var user = new User { UserId = "payer", PrimaryAccountType = "Payer" };
        var targetAccount = "1001";

        var accounts = new List<Account> { new Account { PrimaryAcct = targetAccount, CompanyCode = "3000" } };
        var sapAccountsResponse = new SapHttpData<List<Account>?> { Data = accounts };

        _mockSapClient.Setup(c => c.Get<List<Account>>("CNBS_GET_APP_USER_ACCOUNTS", It.IsAny<Dictionary<string, string?>>(), "en", true))
            .ReturnsAsync(sapAccountsResponse);

        var detail = new PayerDetail
        {
            SoldToList = new List<SoldTo>
            {
                new SoldTo
                {
                    CustomerNumber = "555",
                    Address = new CompanyAddress { Name = "SoldToChild" },
                    SalesArea = new SalesArea { DistributionChannel = "10" }
                }
            }
        };
        var sapDetailResponse = new SapHttpData<PayerDetail?> { Data = detail };

        _mockSapClient.Setup(c => c.Get<PayerDetail>("CNBS_PAYER_PATH", It.IsAny<Dictionary<string, string?>>(), "en", true))
            .ReturnsAsync(sapDetailResponse);

        // Act
        var result = await _accountManager.GetRelatedAccounts(user, targetAccount, "en");

        // Assert
        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal("SoldTo", result![0].SubType);
        Assert.Equal("555", result[0].PrimaryAccount);
        Assert.True(result[0].Selected);
    }

    [Fact]
    public async Task GetRelatedAccounts_WithResolvedAccount_ReturnsRelatedAccounts_WhenFound()
    {
        var user = new User { UserId = "soldto", PrimaryAccountType = "SoldTo" };
        var account = new Account
        {
            PrimaryAcct = "1001",
            CompanyCode = "3000",
            SalesOrganization = "3000",
            DistributionChannel = "10",
            Division = "00"
        };
        var sapAccountsResponse = new SapHttpData<List<Account>?> { Data = new List<Account> { account } };

        var detail = new AccountDetail
        {
            SalesData = new List<SalesData>
            {
                new()
                {
                    SalesArea = new SalesArea { CompanyCode = "3000" },
                    Partners = new List<Partner>
                    {
                        new() { PartnerFunction = "RG", PartnerNumber = "P1", DefaultPartner = "X" }
                    }
                }
            }
        };
        var sapDetailResponse = new SapHttpData<AccountDetail?> { Data = detail };

        _mockSapClient.Setup(c => c.Get<List<Account>>("CNBS_GET_APP_USER_ACCOUNTS", It.IsAny<Dictionary<string, string?>>(), "en", true))
            .ReturnsAsync(sapAccountsResponse);
        _mockSapClient.Setup(c => c.Get<AccountDetail>("CNBS_SOLD_TO_PATH", It.IsAny<Dictionary<string, string?>>(), "en", true))
            .ReturnsAsync(sapDetailResponse);

        var result = await _accountManager.GetRelatedAccounts(user, account, "en");

        Assert.NotNull(result);
        Assert.Single(result!);
        Assert.Equal("P1", result[0].PrimaryAccount);
        Assert.True(result[0].Selected);
    }

    [Fact]
    public async Task GetRelatedAccounts_AutoSelects_WhenSinglePartnerFound_ForSoldToUser()
    {
        // Arrange
        var user = new User { UserId = "soldto", PrimaryAccountType = "SoldTo" };
        var targetAccount = "1001";
        var companyCode = "3000";

        var accounts = new List<Account> { new Account { PrimaryAcct = targetAccount, CompanyCode = companyCode } };
        var sapAccountsResponse = new SapHttpData<List<Account>?> { Data = accounts };

        _mockSapClient.Setup(c => c.Get<List<Account>>("CNBS_GET_APP_USER_ACCOUNTS", It.IsAny<Dictionary<string, string?>>(), "en", true))
            .ReturnsAsync(sapAccountsResponse);

        var detail = new AccountDetail
        {
            SalesData = new List<SalesData>
            {
                new SalesData
                {
                    SalesArea = new SalesArea { CompanyCode = companyCode },
                    Partners = new List<Partner>
                    {
                        new Partner { PartnerFunction = "RG", PartnerNumber = "P1", DefaultPartner = "" }
                    }
                }
            }
        };
        var sapDetailResponse = new SapHttpData<AccountDetail?> { Data = detail };

        _mockSapClient.Setup(c => c.Get<AccountDetail>("CNBS_SOLD_TO_PATH", It.IsAny<Dictionary<string, string?>>(), "en", true))
            .ReturnsAsync(sapDetailResponse);

        // Act
        var result = await _accountManager.GetRelatedAccounts(user, targetAccount, "en");

        // Assert
        Assert.NotNull(result);
        Assert.Single(result);
        Assert.True(result![0].Selected); // Count == 1 logic sets Selected = true
    }

    [Fact]
    public async Task GetRelatedAccounts_RespectsDefaultPartner_ForSoldToUser()
    {
        // Arrange
        var user = new User { UserId = "soldto", PrimaryAccountType = "SoldTo" };
        var targetAccount = "1001";
        var companyCode = "3000";

        var accounts = new List<Account> { new Account { PrimaryAcct = targetAccount, CompanyCode = companyCode } };
        var sapAccountsResponse = new SapHttpData<List<Account>?> { Data = accounts };

        _mockSapClient.Setup(c => c.Get<List<Account>>("CNBS_GET_APP_USER_ACCOUNTS", It.IsAny<Dictionary<string, string?>>(), "en", true))
            .ReturnsAsync(sapAccountsResponse);

        var detail = new AccountDetail
        {
            SalesData = new List<SalesData>
            {
                new SalesData
                {
                    SalesArea = new SalesArea { CompanyCode = companyCode },
                    Partners = new List<Partner>
                    {
                        new Partner { PartnerFunction = "RG", PartnerNumber = "P1", DefaultPartner = "" },
                        new Partner { PartnerFunction = "RG", PartnerNumber = "P2", DefaultPartner = "X" }
                    }
                }
            }
        };
        var sapDetailResponse = new SapHttpData<AccountDetail?> { Data = detail };

        _mockSapClient.Setup(c => c.Get<AccountDetail>("CNBS_SOLD_TO_PATH", It.IsAny<Dictionary<string, string?>>(), "en", true))
            .ReturnsAsync(sapDetailResponse);

        // Act
        var result = await _accountManager.GetRelatedAccounts(user, targetAccount, "en");

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result!.Count);
        Assert.False(result.First(x => x.PrimaryAccount == "P1").Selected);
        Assert.True(result.First(x => x.PrimaryAccount == "P2").Selected);
    }

    [Fact]
    public async Task GetRelatedAccounts_UsesHydratedUserAccounts_WhenAvailable()
    {
        var user = new User
        {
            UserId = "soldto",
            PrimaryAccountType = "SoldTo",
            Accounts = new List<Account>
            {
                new()
                {
                    PrimaryAcct = "5000",
                    RelatedAccounts = new List<RelatedAccount>
                    {
                        new() { PrimaryAccount = "4000", CompanyCode = "3000", Selected = true }
                    }
                }
            }
        };

        var result = await _accountManager.GetRelatedAccounts(user, "5000", "en");

        Assert.NotNull(result);
        Assert.Single(result!);
        Assert.Equal("4000", result[0].PrimaryAccount);
        _mockSapClient.Verify(c => c.Get<List<Account>>(
            It.IsAny<string>(),
            It.IsAny<Dictionary<string, string?>>(),
            It.IsAny<string>(),
            It.IsAny<bool>()), Times.Never);
    }
    [Fact]
    public async Task CreateAccountByInvoice_ReturnsAccount_OnSuccess()
    {
        // Arrange
        var userId = "user1";
        var accountId = "acc1";
        var invoiceId = "inv1";
        var invoiceAmt = 100.50m;
        var language = "en";

        var expectedAccount = new Account { PrimaryAcct = accountId };
        var sapResponse = new SapHttpData<Account?> { Data = expectedAccount };

        _mockSapClient.Setup(c => c.Post<Account>(
            "CNBS_GET_APP_USER_ACCOUNT_ACTION",
            null,
            It.Is<object>(o =>
                o.ToString()!.Contains(accountId) &&
                o.ToString()!.Contains(invoiceId) &&
                o.ToString()!.Contains("create")),
            language,
            true))
            .ReturnsAsync(sapResponse);

        // Act
        var result = await _accountManager.CreateAccountByInvoice(userId, accountId, invoiceId, invoiceAmt, language);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(accountId, result!.PrimaryAcct);
    }

    [Fact]
    public async Task CreateAccountByInvoice_ReturnsNull_OnException()
    {
        // Arrange
        _mockSapClient.Setup(c => c.Post<Account>(
            It.IsAny<string>(),
            It.IsAny<Dictionary<string, string?>>(),
            It.IsAny<object>(),
            It.IsAny<string>(),
            It.IsAny<bool>()))
            .ThrowsAsync(new Exception("Simulated error"));

        // Act
        var result = await _accountManager.CreateAccountByInvoice("u", "a", "i", 10m);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateAccount_ReturnsUpdatedAccount_OnSuccess()
    {
        // Arrange
        var account = new Account { PrimaryAcct = "123", CompanyCode = "3000" };
        var sapResponse = new SapHttpData<Account?> { Data = account };

        _mockSapClient.Setup(c => c.Post<Account>(
            "CNBS_GET_APP_USER_ACCOUNT_ACTION",
            null,
            It.Is<object>(o => o.ToString()!.Contains("modify")),
            "en",
            true))
            .ReturnsAsync(sapResponse);

        // Act
        var result = await _accountManager.UpdateAccount(account, "en");

        // Assert
        Assert.NotNull(result);
        Assert.Equal(account.PrimaryAcct, result!.PrimaryAcct);
    }

    [Fact]
    public async Task UpdateAccount_ReturnsNull_OnException()
    {
        // Arrange
        var account = new Account { PrimaryAcct = "123" };
        _mockSapClient.Setup(c => c.Post<Account>(
            It.IsAny<string>(),
            It.IsAny<Dictionary<string, string?>>(),
            It.IsAny<object>(),
            It.IsAny<string>(),
            It.IsAny<bool>()))
            .ThrowsAsync(new Exception("Simulated error"));

        // Act
        var result = await _accountManager.UpdateAccount(account);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task CreateAccount_CallsSalesforceFirst_WhenSalesforceReturnsAccount()
    {
        // Arrange
        var mockSfClient = new Mock<ISalesforceHttpClient>();
        var mockSapClient = new Mock<ISapHttpClient>();
        var manager = new AccountManager(mockSfClient.Object, mockSapClient.Object, _mockConfigManager.Object);

        var account = new Account { UserId = "a08fj001", PrimaryAcct = "3000", AccountTypeId = "SoldTo" };
        var sfAccount = new Account { AccountId = "001fj001", UserId = "a08fj001", PrimaryAcct = "3000" };
        mockSfClient.Setup(c => c.Post<Account>(
            "CNBS_GET_APP_USER_ACCOUNT_ACTION",
            null,
            It.Is<object>(o => o.ToString()!.Contains("create")),
            "en",
            true))
            .ReturnsAsync(new SapHttpData<Account?> { Data = sfAccount });

        // Act
        var result = await manager.CreateAccount(account);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("001fj001", result!.AccountId);
        mockSfClient.Verify(c => c.Post<Account>("CNBS_GET_APP_USER_ACCOUNT_ACTION", null, It.IsAny<object>(), "en", true), Times.Once);
        mockSapClient.Verify(c => c.Post<Account>(It.IsAny<string>(), It.IsAny<Dictionary<string, string?>>(), It.IsAny<object>(), It.IsAny<string>(), It.IsAny<bool>()), Times.Never);
    }

    [Fact]
    public async Task CreateAccount_FallsBackToSap_WhenSalesforceThrows()
    {
        // Arrange
        var mockSfClient = new Mock<ISalesforceHttpClient>();
        var mockSapClient = new Mock<ISapHttpClient>();
        var manager = new AccountManager(mockSfClient.Object, mockSapClient.Object, _mockConfigManager.Object);

        var account = new Account { UserId = "u1", PrimaryAcct = "3000", AccountTypeId = "SoldTo" };
        var sapAccount = new Account { AccountId = "sap1", UserId = "u1", PrimaryAcct = "3000" };

        mockSfClient.Setup(c => c.Post<Account>(
            "CNBS_GET_APP_USER_ACCOUNT_ACTION",
            null,
            It.IsAny<object>(),
            "en",
            true))
            .ThrowsAsync(new Exception("SF error"));

        mockSapClient.Setup(c => c.Post<Account>(
            "CNBS_GET_APP_USER_ACCOUNT_ACTION",
            null,
            It.IsAny<object>(),
            "en",
            true))
            .ReturnsAsync(new SapHttpData<Account?> { Data = sapAccount });

        // Act
        var result = await manager.CreateAccount(account);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("sap1", result!.AccountId);
        mockSfClient.Verify(c => c.Post<Account>("CNBS_GET_APP_USER_ACCOUNT_ACTION", null, It.IsAny<object>(), "en", true), Times.Once);
        mockSapClient.Verify(c => c.Post<Account>("CNBS_GET_APP_USER_ACCOUNT_ACTION", null, It.IsAny<object>(), "en", true), Times.Once);
    }

    [Fact]
    public async Task UpdateAccount_CallsSalesforceFirst_WhenSalesforceReturnsAccount()
    {
        // Arrange
        var mockSfClient = new Mock<ISalesforceHttpClient>();
        var mockSapClient = new Mock<ISapHttpClient>();
        var manager = new AccountManager(mockSfClient.Object, mockSapClient.Object, _mockConfigManager.Object);

        var account = new Account { AccountId = "001fj001", UserId = "a08fj001", PrimaryAcct = "3000", AccountTypeId = "Payer" };
        var sfAccount = new Account { AccountId = "001fj001", UserId = "a08fj001", PrimaryAcct = "3000" };

        mockSfClient.Setup(c => c.Post<Account>(
            "CNBS_GET_APP_USER_ACCOUNT_ACTION",
            null,
            It.Is<object>(o => o.ToString()!.Contains("modify")),
            "en",
            true))
            .ReturnsAsync(new SapHttpData<Account?> { Data = sfAccount });

        // Act
        var result = await manager.UpdateAccount(account);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("001fj001", result!.AccountId);
        mockSfClient.Verify(c => c.Post<Account>("CNBS_GET_APP_USER_ACCOUNT_ACTION", null, It.IsAny<object>(), "en", true), Times.Once);
        mockSapClient.Verify(c => c.Post<Account>(It.IsAny<string>(), It.IsAny<Dictionary<string, string?>>(), It.IsAny<object>(), It.IsAny<string>(), It.IsAny<bool>()), Times.Never);
    }

    [Fact]
    public async Task UpdateAccount_FallsBackToSap_WhenSalesforceThrows()
    {
        // Arrange
        var mockSfClient = new Mock<ISalesforceHttpClient>();
        var mockSapClient = new Mock<ISapHttpClient>();
        var manager = new AccountManager(mockSfClient.Object, mockSapClient.Object, _mockConfigManager.Object);

        var account = new Account { AccountId = "acc1", UserId = "u1", PrimaryAcct = "3000" };
        var sapAccount = new Account { AccountId = "acc1", UserId = "u1", PrimaryAcct = "3000" };

        mockSfClient.Setup(c => c.Post<Account>(
            "CNBS_GET_APP_USER_ACCOUNT_ACTION",
            null,
            It.IsAny<object>(),
            "en",
            true))
            .ThrowsAsync(new Exception("SF error"));

        mockSapClient.Setup(c => c.Post<Account>(
            "CNBS_GET_APP_USER_ACCOUNT_ACTION",
            null,
            It.IsAny<object>(),
            "en",
            true))
            .ReturnsAsync(new SapHttpData<Account?> { Data = sapAccount });

        // Act
        var result = await manager.UpdateAccount(account);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("acc1", result!.AccountId);
        mockSfClient.Verify(c => c.Post<Account>("CNBS_GET_APP_USER_ACCOUNT_ACTION", null, It.IsAny<object>(), "en", true), Times.Once);
        mockSapClient.Verify(c => c.Post<Account>("CNBS_GET_APP_USER_ACCOUNT_ACTION", null, It.IsAny<object>(), "en", true), Times.Once);
    }

    [Fact]
    public async Task DeleteAccount_CallsSalesforceFirst_WhenSalesforceReturnsSuccess()
    {
        // Arrange
        var mockSfClient = new Mock<ISalesforceHttpClient>();
        var mockSapClient = new Mock<ISapHttpClient>();
        var manager = new AccountManager(mockSfClient.Object, mockSapClient.Object, _mockConfigManager.Object);

        mockSfClient.Setup(c => c.Post<Account>(
            "CNBS_GET_APP_USER_ACCOUNT_ACTION",
            null,
            It.Is<object>(o => o.ToString()!.Contains("delete")),
            "en",
            true))
            .ReturnsAsync(new SapHttpData<Account?>
            {
                Data = null,
                Status = new SapHttpStatus { MessageType = "S" }
            });

        // Act
        var result = await manager.DeleteAccount("a08fj001", "001fj001");

        // Assert
        Assert.Null(result);
        mockSfClient.Verify(c => c.Post<Account>("CNBS_GET_APP_USER_ACCOUNT_ACTION", null, It.IsAny<object>(), "en", true), Times.Once);
        mockSapClient.Verify(c => c.Post<Account>(It.IsAny<string>(), It.IsAny<Dictionary<string, string?>>(), It.IsAny<object>(), It.IsAny<string>(), It.IsAny<bool>()), Times.Never);
    }

    [Fact]
    public async Task DeleteAccount_FallsBackToSap_WhenSalesforceThrows()
    {
        // Arrange
        var mockSfClient = new Mock<ISalesforceHttpClient>();
        var mockSapClient = new Mock<ISapHttpClient>();
        var manager = new AccountManager(mockSfClient.Object, mockSapClient.Object, _mockConfigManager.Object);

        mockSfClient.Setup(c => c.Post<Account>(
            "CNBS_GET_APP_USER_ACCOUNT_ACTION",
            null,
            It.IsAny<object>(),
            "en",
            true))
            .ThrowsAsync(new Exception("SF error"));

        mockSapClient.Setup(c => c.Post<Account>(
            "CNBS_GET_APP_USER_ACCOUNT_ACTION",
            null,
            It.IsAny<object>(),
            "en",
            true))
            .ReturnsAsync(new SapHttpData<Account?> { Data = null });

        // Act
        var result = await manager.DeleteAccount("u1", "acc1");

        // Assert
        Assert.Null(result);
        mockSfClient.Verify(c => c.Post<Account>("CNBS_GET_APP_USER_ACCOUNT_ACTION", null, It.IsAny<object>(), "en", true), Times.Once);
        mockSapClient.Verify(c => c.Post<Account>("CNBS_GET_APP_USER_ACCOUNT_ACTION", null, It.IsAny<object>(), "en", true), Times.Once);
    }
}
