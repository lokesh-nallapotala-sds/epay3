using Epay3Service.Clients;
using Epay3Service.Clients.Models;
using Epay3Service.Configuration;
using Epay3Service.CustomExceptions;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Epay3Service.Tests.Clients;

public class SalesforceHttpClientTests
{
    [Fact]
    public void Configuration_DefaultValues_AreCorrect()
    {
        var config = new SalesforceConfiguration
        {
            InstanceUrl = "https://example.my.salesforce.com",
            ClientId = "test-client-id",
            ClientSecret = "test-client-secret"
        };

        Assert.Equal("https://orgfarm-3ff9cf6103-dev-ed.develop.my.salesforce.com/services/oauth2/token", config.TokenUrl);
        Assert.Equal("v59.0", config.ApiVersion);
        Assert.Equal(30, config.TimeoutSeconds);
        Assert.Equal("https://example.my.salesforce.com", config.InstanceUrl);
        Assert.Equal("test-client-id", config.ClientId);
        Assert.Equal("test-client-secret", config.ClientSecret);
    }

    [Fact]
    public void SalesforceKeys_GetUrl_ReturnsConfiguredPath()
    {
        var keys = new SalesforceKeys
        {
            SalesforceUrls = new List<SalesforceUrl>
            {
                new() { Key = "CNBS_INVOICE_LIST_PATH", Path = "getInvoiceList" },
                new() { Key = "CNBS_INVOICE_DETAIL_PATH", Path = "getInvoicesDetailsAPI" },
                new() { Key = "CNBS_PAYER_PATH", Path = "getPayerDetails" },
                new() { Key = "CNBS_SOLD_TO_PATH", Path = "getSoldToDetails" },
                new() { Key = "CNBS_CUSTOM_DATA_URL", Path = "customizing" },
                new() { Key = "CNBS_GET_APP_USERS", Path = "getApplicationUserList" },
                new() { Key = "CNBS_GET_APP_USER_ACTION", Path = "applicationUsersDetail" },
                new() { Key = "CNBS_GET_APP_USER_ACCOUNTS", Path = "getApplicationUserAccountsList" },
                new() { Key = "CNBS_GET_APP_USER_ACCOUNT_ACTION", Path = "applicationUserAccountDetail" },
                new() { Key = "CNBS_UPDATE_LOGON_STATUS", Path = "applicationUserLogonStatus" },
                new() { Key = "CNBS_GET_APP_VALUES", Path = "custom-data-metadata" },
                new() { Key = "CNBS_MANAGE_PAYMENT", Path = "payerAllowedPaymentCards" },
                new() { Key = "CNBS_PAYMENT_PATH", Path = "SAPPayment" },
                new() { Key = "CNBS_CHANGE_PASSWORD", Path = "changePassword" }
            }
        };

        Assert.Equal("getInvoiceList", keys.GetUrl("CNBS_INVOICE_LIST_PATH"));
        Assert.Equal("getInvoicesDetailsAPI", keys.GetUrl("CNBS_INVOICE_DETAIL_PATH"));
        Assert.Equal("getPayerDetails", keys.GetUrl("CNBS_PAYER_PATH"));
        Assert.Equal("getSoldToDetails", keys.GetUrl("CNBS_SOLD_TO_PATH"));
        Assert.Equal("customizing", keys.GetUrl("CNBS_CUSTOM_DATA_URL"));
        Assert.Equal("getApplicationUserList", keys.GetUrl("CNBS_GET_APP_USERS"));
        Assert.Equal("applicationUsersDetail", keys.GetUrl("CNBS_GET_APP_USER_ACTION"));
        Assert.Equal("getApplicationUserAccountsList", keys.GetUrl("CNBS_GET_APP_USER_ACCOUNTS"));
        Assert.Equal("applicationUserAccountDetail", keys.GetUrl("CNBS_GET_APP_USER_ACCOUNT_ACTION"));
        Assert.Equal("applicationUserLogonStatus", keys.GetUrl("CNBS_UPDATE_LOGON_STATUS"));
        Assert.Equal("custom-data-metadata", keys.GetUrl("CNBS_GET_APP_VALUES"));
        Assert.Equal("payerAllowedPaymentCards", keys.GetUrl("CNBS_MANAGE_PAYMENT"));
        Assert.Equal("SAPPayment", keys.GetUrl("CNBS_PAYMENT_PATH"));
        Assert.Equal("changePassword", keys.GetUrl("CNBS_CHANGE_PASSWORD"));
    }

    [Fact]
    public void QueryAsync_ThrowsArgumentException_WhenQueryIsEmpty()
    {
        var config = new SalesforceConfiguration
        {
            InstanceUrl = "https://example.my.salesforce.com",
            ClientId = "test-client-id",
            ClientSecret = "test-client-secret"
        };
        var keys = new SalesforceKeys();

        using var client = new SalesforceHttpClient(config, keys, NullLogger<SalesforceHttpClient>.Instance);

        Assert.ThrowsAsync<ArgumentException>(() => client.QueryAsync<object>(string.Empty));
    }

    [Fact]
    public void SalesforceErrorResponse_ToString_FormatsCorrectly()
    {
        var error = new SalesforceErrorResponse
        {
            ErrorCode = "INVALID_FIELD",
            Message = "No such column 'NonExistentField' on entity 'Account'."
        };

        var str = error.ToString();
        Assert.Contains("INVALID_FIELD", str);
        Assert.Contains("No such column 'NonExistentField'", str);
    }

    [Fact]
    public async Task Live_GetInvoiceList_DeserializesCorrectly()
    {
        var config = new SalesforceConfiguration
        {
            InstanceUrl = Environment.GetEnvironmentVariable("SALESFORCE_INSTANCE_URL") ?? "https://login.salesforce.com",
            ClientId = Environment.GetEnvironmentVariable("SALESFORCE_CLIENT_ID") ?? "test-client-id",
            ClientSecret = Environment.GetEnvironmentVariable("SALESFORCE_CLIENT_SECRET") ?? "test-client-secret"
        };
        var keys = new SalesforceKeys
        {
            SalesforceUrls = new List<SalesforceUrl>
            {
                new() { Key = "CNBS_INVOICE_LIST_PATH", Path = "getInvoiceList" },
                new() { Key = "CNBS_INVOICE_DETAIL_PATH", Path = "getInvoicesDetailsAPI" }
            }
        };

        using var client = new SalesforceHttpClient(config, keys, NullLogger<SalesforceHttpClient>.Instance);
        var queryParams = new Dictionary<string, string?>
        {
            { "payer_number", "3000" },
            { "company_code", "3000" },
            { "document_type", "F2" },
            { "document_search_status", "01" }
        };

        var result = await client.Get<List<Epay3Service.Models.Invoice>>("CNBS_INVOICE_LIST_PATH", queryParams);

        Assert.NotNull(result?.Data);
        Assert.True(result.Data.Count > 0);
        Assert.Contains(result.Data, inv => inv.BillingDocumentNumber == "90041034");

        // Also test detail
        var detailParams = new Dictionary<string, string?>
        {
            { "billing_document_number", "90041034" },
            { "customer_number", "3000" }
        };
        var detailResult = await client.GetData<Epay3Service.Models.InvoiceDetailResponse>("CNBS_INVOICE_DETAIL_PATH", detailParams);
        Assert.NotNull(detailResult?.Data?.Detail);
    }

    [Fact]
    public async Task Live_GetApplicationUserList_DeserializesCorrectly()
    {
        var config = new SalesforceConfiguration
        {
            InstanceUrl = Environment.GetEnvironmentVariable("SALESFORCE_INSTANCE_URL") ?? "https://login.salesforce.com",
            ClientId = Environment.GetEnvironmentVariable("SALESFORCE_CLIENT_ID") ?? "test-client-id",
            ClientSecret = Environment.GetEnvironmentVariable("SALESFORCE_CLIENT_SECRET") ?? "test-client-secret"
        };
        var keys = new SalesforceKeys
        {
            SalesforceUrls = new List<SalesforceUrl>
            {
                new() { Key = "CNBS_GET_APP_USERS", Path = "getApplicationUserList" }
            }
        };

        using var client = new SalesforceHttpClient(config, keys, NullLogger<SalesforceHttpClient>.Instance);
        var result = await client.Get<List<Epay3Service.Models.User>>("CNBS_GET_APP_USERS", null);

        Assert.NotNull(result?.Data);
        Assert.True(result.Data.Count > 0);
        Assert.Contains(result.Data, u => u.Login == "sfcpdemo");
    }

    [Fact]
    public async Task Live_ApplicationUserAccountDetail_Modify_DeserializesCorrectly()
    {
        var config = new SalesforceConfiguration
        {
            InstanceUrl = Environment.GetEnvironmentVariable("SALESFORCE_INSTANCE_URL") ?? "https://login.salesforce.com",
            ClientId = Environment.GetEnvironmentVariable("SALESFORCE_CLIENT_ID") ?? "test-client-id",
            ClientSecret = Environment.GetEnvironmentVariable("SALESFORCE_CLIENT_SECRET") ?? "test-client-secret"
        };
        var keys = new SalesforceKeys
        {
            SalesforceUrls = new List<SalesforceUrl>
            {
                new() { Key = "CNBS_GET_APP_USER_ACCOUNT_ACTION", Path = "applicationUserAccountDetail" }
            }
        };

        using var client = new SalesforceHttpClient(config, keys, NullLogger<SalesforceHttpClient>.Instance);
        var requestBody = new
        {
            user_id = "a08fj00000iOqQzAAK",
            account_id = "001fj00001c78U0AAI",
            primary_account = "3000",
            sales_organization = "1000",
            distribution_channel = "10",
            division = "00",
            company_code = "1000"
        };

        var result = await client.Post<Epay3Service.Models.Account>(
            "CNBS_GET_APP_USER_ACCOUNT_ACTION",
            null,
            new { action = "modify", data = requestBody });

        Assert.NotNull(result?.Data);
        Assert.Equal("001fj00001c78U0AAI", result!.Data.AccountId);
        Assert.Equal("3000", result.Data.PrimaryAcct);
    }
}