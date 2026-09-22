using Newtonsoft.Json;

namespace Epay3Service.Models;

public  class InvoicePdfRequest
{
    [JsonProperty("document_detail")]
    public DocumentDetail? DocumentDetail { get; set; }
}
