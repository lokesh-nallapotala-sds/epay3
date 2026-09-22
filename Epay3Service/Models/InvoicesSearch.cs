using Newtonsoft.Json;

namespace Epay3Service.Models;

public class InvoicesSearch
{
    [JsonProperty("payer_data")]
    public Payer? Payer { get; set; }

    [JsonProperty("soldto_data")]
    public Account? SoldToAccount{ get; set; }

    [JsonProperty("search_parameters")]
    public InvoicesSearchParameters? InvoicesSearchParameters { get; set; }
}

public class Payer
{
    [JsonProperty("customer_number")]
    public string? CustomerNumber { get; set; }

    [JsonProperty("company_code")]
    public string? CompanyCode { get; set; }
}

public class InvoicesSearchParameters
{
    [JsonProperty("payer_data")]
    public Payer? Payer { get; set; }

    [JsonProperty("document_type")]
    public string? DocumentType { get; set; }

    [JsonProperty("status")]
    public string? Status { get; set; }

    [JsonProperty("date_from")]
    public string? DateFrom { get; set; }

    [JsonProperty("date_to")]
    public string? DateTo { get; set; }

    [JsonProperty("due_date_from")]
    public string? DueDateFrom { get; set; }

    [JsonProperty("due_date_to")]
    public string? DueDateTo { get; set; }

    [JsonProperty("currency_key")]
    public string? CurrencyKey { get; set; }

    [JsonProperty("filter")]
    public IList<InvoicesFilter>? Filter { get; set; }

    [JsonProperty("SoldTo_SearchParams")]
    public string[]? SoldToSearchParams { get; set; }

    //[JsonProperty("GridViewDocIds")]
    //public int[]? GridViewDocIds { get; set; }
}

public partial class InvoicesFilter
{
    [JsonProperty("filter_type")]
    public string? FilterType { get; set; }

    [JsonProperty("value")]
    public string? Value { get; set; }
}