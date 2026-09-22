
using Newtonsoft.Json;

namespace Epay3Service.Models;

public  class Partner
{
    [JsonProperty("partner_function")]
    public string? PartnerFunction { get; set; }

    [JsonProperty("partner_number")]
    public string? PartnerNumber { get; set; }

    [JsonProperty("default_partner")]
    public string? DefaultPartner { get; set; }

    [JsonProperty("partner_counter")]
    public string? PartnerCounter { get; set; }

    [JsonProperty("address_data")]
    public CompanyAddress? Address { get; set; }
}
