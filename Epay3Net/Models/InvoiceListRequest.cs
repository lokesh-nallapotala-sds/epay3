using Newtonsoft.Json.Converters;
using Newtonsoft.Json;
using System.Globalization;

namespace Epay3Service.Models;

public partial class InvoicesRequest
{
    [JsonProperty("payer_data")]
    public Partner PayerData { get; set; }

    [JsonProperty("soldto_data")]
    public SoldTo SoldtoData { get; set; }

    [JsonProperty("search_parameters")]
    public Invoices_SearchParameters InvoicesSearchParameters { get; set; }
}

public partial class Invoices_SearchParameters
{
    [JsonProperty("document_type")]
    public string DocumentType { get; set; }

    [JsonProperty("status")]
    public string Status { get; set; }

    [JsonProperty("date_from")]
    public string DateFrom { get; set; }

    [JsonProperty("date_to")]
    public string DateTo { get; set; }

    [JsonProperty("due_date_from")]
    public string DueDateFrom { get; set; }

    [JsonProperty("due_date_to")]
    public string DueDateTo { get; set; }

    [JsonProperty("currency_key")]
    public string CurrencyKey { get; set; }

    [JsonProperty("filter")]
    public IList<Invoices_Filter> Filter { get; set; } = new List<Invoices_Filter>();

    [JsonProperty("SoldTo_SearchParams")]
    public int[] SoldToSearchParams { get; set; }

    [JsonProperty("GridViewDocIds")]
    public int[] GridViewDocIds { get; set; }
}

public partial class Invoices_Filter
{
    [JsonProperty("filter_type")]
    public string FilterType { get; set; }

    [JsonProperty("value")]
    public string Value { get; set; }
}

public partial class SoldtoData
{
    [JsonProperty("customer_number")]
    public string CustomerNumber { get; set; } = "";

    [JsonProperty("sales_area_data")]
    public SalesArea SalesArea { get; set; } = new SalesArea();

}

public partial class InvoicesRequest
{
    public static InvoicesRequest FromJson(string json) => JsonConvert.DeserializeObject<InvoicesRequest>(json, Converter.Settings);
}

public static class Serialize
{
    public static string ToJson(this InvoicesRequest self) => JsonConvert.SerializeObject(self, Converter.Settings);
}

internal static class Converter
{
    public static readonly JsonSerializerSettings Settings = new() {
        MetadataPropertyHandling = MetadataPropertyHandling.Ignore,
        DateParseHandling = DateParseHandling.None,
        Converters = {
            new IsoDateTimeConverter()
            {
                DateTimeStyles = DateTimeStyles.AssumeUniversal,
            },
        },
    };
}
