using Newtonsoft.Json;

namespace Epay3Service.Models;

public class UserAccountsResponse
{
    [JsonProperty("accounts")]
    public List<UserAccountDto> Accounts { get; set; } = [];
}
