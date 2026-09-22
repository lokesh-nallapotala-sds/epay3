using Newtonsoft.Json;

namespace Epay3Service.Models;

public partial class InvoiceRequest
{
    [JsonProperty("document_detail")]
    public DocumentDetail DocumentDetail { get; set; }

    public InvoiceRequest(string invoiceNumber, string customerNumber) => this.DocumentDetail = new DocumentDetail { DocumentType = "01", DocumentNumber = invoiceNumber, CustomerNumber = customerNumber };
}

public partial class InvoiceRequest
{
    public static InvoiceRequest FromJson(string json) => JsonConvert.DeserializeObject<InvoiceRequest>(json, Converter.Settings);
}