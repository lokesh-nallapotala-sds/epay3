using Epay3Service.Clients.Models;
using Newtonsoft.Json;

namespace Epay3Service.Models;

public partial class DepositsResponse
{
    [JsonProperty("payed")]
    public List<Payed> Payed { get; set; } = new List<Payed>();
    public SapHttpStatus? Error { get; set; }
}

public partial class Payed
{
    [JsonProperty("company_code")]
    public string? CompanyCode { get; set; }

    [JsonProperty("document_number_finance")]
    public string? DocumentNumberFinance { get; set; }

    [JsonProperty("fiscal_year_of_the_relevant_invoice")]
    public long FiscalYearOfTheRelevantInvoice { get; set; }

    [JsonProperty("authorization_number")]
    public string? AuthorizationNumber { get; set; }

    [JsonProperty("authorization_reference_code")]
    public string? AuthorizationReferenceCode { get; set; }

    [JsonProperty("authorization_amount")]
    public double AuthorizationAmount { get; set; }

    [JsonProperty("currency_key")]
    public string? CurrencyKey { get; set; }
}

public partial class DepositsResponse
{
    public static DepositsResponse FromJson(string json) =>
        JsonConvert.DeserializeObject<DepositsResponse>(json, Converter.Settings);
}