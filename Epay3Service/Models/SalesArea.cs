using Newtonsoft.Json;


namespace Epay3Service.Models;

public class SalesArea
{
    [JsonProperty("sales_organization")] 
    public string? SalesOrganization { get; set; }

    [JsonProperty("distribution_channel")] 
    public string? DistributionChannel { get; set; }

    [JsonProperty("division")] 
    public string? Division { get; set; }

    [JsonProperty("company_code")]
    public string? CompanyCode { get; set; }

    [JsonProperty("terms_of_payment")]
    public string? TermsOfPayment { get; set; }

    [JsonProperty("currency_key")]
    public string? CurrencyKey { get; set; }

}
