using Newtonsoft.Json;
using System.Text.Json.Serialization;

namespace WebAR.Service.Services.API.Models;

public partial class PaymentInvoiceResponse
{

    [JsonProperty("payment_list")]
    public List<PaymentList> PaymentList { get; set; } = new List<PaymentList>();

    [JsonProperty("status")]
    public Status? Status { get; set; }

    //public static PaymentInvoiceResponse? FromJson(string json) => JsonConvert.DeserializeObject<PaymentInvoiceResponse>(json, Converter.Settings);
}

public partial class PaymentList
{
    [JsonProperty("document_number_finance")]
    public string? DocumentNumberFinance { get; set; }

    [JsonProperty("finance_document_type")]
    public string? FinanceDocumentType { get; set; }

    [JsonProperty("reference_number")]
    public string? ReferenceNumber { get; set; }

    [JsonProperty("fiscal_year_of_the_relevant_invoice")]
    public long? FiscalYearOfTheRelevantInvoice { get; set; }

    [JsonProperty("payer_number")]
    public string? PayerNumber { get; set; }

    [JsonProperty("posting_date")]
    public string? PostingDate { get; set; }

    [JsonProperty("document_date")]
    public string? DocumentDate { get; set; }

    [JsonProperty("currency_key")]
    public string? CurrencyKey { get; set; }

    [JsonProperty("last_four")]
    public string? CardLast4Digit { get; set; }

    [JsonProperty("paid_amount")]
    public decimal? PaidAmount { get; set; }

    [JsonProperty("item_text")]
    public string? ItemText { get; set; }

    [JsonProperty("authorization_number")]
    public string? AuthorizationNumber { get; set; }

    [JsonProperty("authorization_reference_code")]
    public string? AuthorizationReferenceCode { get; set; }

    [JsonProperty("authorization_amount")]
    public decimal? AuthorizationAmount { get; set; }

    [JsonProperty("payment_method")]
    public string? PaymentMethod { get; set; }

    [JsonProperty("payment_card_type")]
    public string? PaymentCardType { get; set; }

    [JsonProperty("payment_card_token")]
    public string? PaymentCardToken { get; set; }

    [JsonProperty("payment_card_name")]
    public string? PaymentCardName { get; set; }

    [JsonProperty("valid_to")]
    public string? ValidTo { get; set; }

    [JsonProperty("applied_credit_amount")]
    public decimal AppliedCreditAmount { get; set; }

    [JsonProperty("sd_invoices")]
    public List<SdInvoice>? SdInvoices { get; set; }
}

public partial class SdInvoice
{
    [JsonProperty("billing_document_number")]
    public string? BillingDocumentNumber { get; set; }

    [JsonProperty("billing_document_type")]
    public string? BillingDocumentType { get; set; }

    [JsonProperty("sales_organization")]
    public string? SalesOrganization { get; set; }

    [JsonProperty("distribution_channel")]
    public string? DistributionChannel { get; set; }

    [JsonProperty("division")]
    public string? Division { get; set; }

    [JsonProperty("reference_number")]
    public string? ReferenceNumber { get; set; }

    [JsonProperty("currency_key")]
    public string? CurrencyKey { get; set; }

    [JsonProperty("posting_date")]
    public string? PostingDate { get; set; }

    [JsonProperty("document_date")]
    public string? DocumentDate { get; set; }

    [JsonProperty("due_date")]
    public string? DueDate { get; set; }

    [JsonProperty("days_in_arrears")]
    public long? DaysInArrears { get; set; }

    [JsonProperty("total_amount")]
    public decimal? TotalAmount { get; set; }

    [JsonProperty("open_amount")]
    public decimal? OpenAmount { get; set; }

    [JsonProperty("paid_amount")]
    public decimal? PaidAmount { get; set; }

    [JsonProperty("pdf_document_available")]
    public string? PdfDocumentAvailable { get; set; }

    [JsonProperty("soldto_number")]
    public string? SoldtoNumber { get; set; }

    [JsonProperty("current_paid_amount")]
    public string? CurrentPaidAmount { get; set; }
}



public partial class PaymentCardsResponse
{
    [JsonProperty("pre_auth")]
    [JsonPropertyName("pre_auth")]
    public PaymentCardPreAuthResponse? PreAuth { get; set; }

    [JsonProperty("status")]
    [JsonPropertyName("status")]
    public Status? Status { get; set; }

    public static PaymentCardsResponse? FromJson(string json) => JsonConvert.DeserializeObject<PaymentCardsResponse>(json, Converter.Settings);
}

public class PaymentCardPreAuthResponse
{
    [JsonProperty("action")]
    [JsonPropertyName("action")]
    public string? Action { get; set; }

    [JsonProperty("rccvv")]
    [JsonPropertyName("rccvv")]
    public string? Rccvv { get; set; }

    [JsonProperty("rcavr")]
    [JsonPropertyName("rcavr")]
    public string? Rcavr { get; set; }

    [JsonProperty("message_line_string")]
    [JsonPropertyName("message_line_string")]
    public string? MessageLineString { get; set; }
}

public static class Converter
{
    public static readonly JsonSerializerSettings Settings = new()
    {
        MetadataPropertyHandling = MetadataPropertyHandling.Ignore,
        DateParseHandling = DateParseHandling.None,
        NullValueHandling = NullValueHandling.Ignore
    };
}

public class Status
{
    [JsonProperty("message_type")]
    public string? message_type { get; set; }

    [JsonProperty("message_identification")]
    public string? message_identification { get; set; }

    [JsonProperty("message_number")]
    public int? message_number { get; set; }

    [JsonProperty("message_line_string")]
    public string? message_line_string { get; set; }
}
public partial class PaymentHistoryResponse
{
    public static PaymentHistoryResponse? FromJson(string json) => JsonConvert.DeserializeObject<PaymentHistoryResponse>(json, Converter.Settings);
}
