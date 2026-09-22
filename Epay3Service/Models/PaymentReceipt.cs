using Epay3Service.Clients.Models;
using Newtonsoft.Json;

namespace Epay3Service.Models;


public class PaymentReceipt
{
    [JsonProperty("payed")]
    public List<PaymentDocument>? Documents { get; set; }
    public SapHttpStatus? Error { get; set; }

    public EmailError? EmailError { get; set; }
}

public class EmailError
{
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class PaymentDocument
{
    [JsonProperty("document_number_finance")]
    public string? DocumentNumberFinance { get; set; }
    [JsonProperty("company_code")]
    public string? CompanyCode { get; set; }
    [JsonProperty("fiscal_year_of_the_relevant_invoice")]
    public string? FiscalYearOfTheInvocie { get; set; }
    [JsonProperty("authorization_number")]
    public string? AuthorizationNumber { get; set; }
    [JsonProperty("authorization_reference_code")]
    public string? AuthorizationReferenceCode { get; set; }
    [JsonProperty("authorization_amount")]
    public decimal AuthorizationAmount { get; set; }
    [JsonProperty("currency_key")]
    public string? CurrencyCode { get; set; }
}