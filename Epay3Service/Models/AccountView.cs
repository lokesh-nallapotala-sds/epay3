using Newtonsoft.Json;

namespace Epay3Service.Models;

/// <summary>
/// Enriched account response model for the user-accounts endpoint.
/// Inherits the raw linked-account fields from <see cref="Account"/> and adds
/// server-resolved payer/account metadata used by the UI.
/// </summary>
public class AccountView : Account
{
    [JsonProperty("available_payers")]
    public List<RelatedAccount> AvailablePayers { get; set; } = [];

    [JsonProperty("default_payer")]
    public RelatedAccount? DefaultPayer { get; set; }

    [JsonProperty("resolved_payer_details")]
    public PayerDetail? ResolvedPayerDetails { get; set; }

    [JsonProperty("soldto_detail")]
    [System.Text.Json.Serialization.JsonIgnore]
    public AccountDetail? SoldToDetail { get; set; }

    [JsonProperty("payer_detail")]
    [System.Text.Json.Serialization.JsonIgnore]
    public PayerDetail? PayerDetail { get; set; }
}
