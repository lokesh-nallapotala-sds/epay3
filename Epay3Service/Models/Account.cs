using Newtonsoft.Json;

namespace Epay3Service.Models;

/// <summary>
/// Raw linked-account model returned from SAP/user-account APIs.
/// Endpoint-specific enrichment belongs on <see cref="AccountView"/>.
/// </summary>
public class Account
{
    [JsonProperty("account_id")]
    public string? AccountId { get; set; }

    [JsonProperty("user_id")]
    public string? UserId { get; set; }

    [JsonProperty("primary_account")]
    public string? PrimaryAcct { get; set; }

    [JsonProperty("account_type")]
    public string AccountTypeId { get; set; } = null!;

    [JsonProperty("sales_organization")]
    public string? SalesOrganization { get; set; }

    [JsonProperty("distribution_channel")]
    public string? DistributionChannel { get; set; }

    [JsonProperty("division")]
    public string? Division { get; set; }

    [JsonProperty("company_code")]
    public string? CompanyCode { get; set; }

    [JsonIgnore]
    public bool AllowPayments { get; set; } = true;

    [JsonIgnore]
    [JsonProperty("allow_deposits")]
    public bool AllowDeposits { get; set; } = true;

    [JsonProperty("payer_det")]
    [System.Text.Json.Serialization.JsonIgnore]
    public PayerDetail? PayerDet { get; set; }

    [JsonProperty("soldto_det")]
    [System.Text.Json.Serialization.JsonIgnore]
    public AccountDetail? SoldToDet { get; set; }

    public CompanyAddress? Address { get; set; }

    public List<RelatedAccount>? RelatedAccounts { get; set; }
}
