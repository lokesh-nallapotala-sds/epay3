using Newtonsoft.Json;

namespace Epay3Service.Models;

public class PaymentInvoice
{
    [JsonProperty("document_number_finance")]
    public string? DocumentNumberFinance { get; set; }

    [JsonProperty("line_item_in_the_relevant_invoice")]
    public long LineItemInTheRelevantInvoice { get; set; }

    [JsonProperty("fiscal_year_of_the_relevant_invoice")]
    public long FiscalYearOfTheRelevantInvoice { get; set; }

    [JsonProperty("open_amount")]
    public double OpenAmount { get; set; }

    [JsonProperty("amount_to_process")]
    public double PaymentAmount { get; set; }

    [JsonProperty("currency_key")]
    public string? CurrencyKey { get; set; }

    [JsonProperty("reason_code")]
    public string? Reason { get; set; }

    [JsonProperty("reference_number")]
    public string? ReferenceNumber { get; set; }

    [JsonProperty("billing_document_number")]
    public string? BillingDocumentNumber { get; set; }

    [JsonProperty("comment")]
    public string? Description { get; set; }

    [JsonProperty("document_date")]
    public string? DocDate => this.DocumentDate == null ? null : this.DocumentDate.Value.ToString("MM-dd-yyyy");

    [JsonIgnore]
    public DateTime? DocumentDate { get; set; }
}
