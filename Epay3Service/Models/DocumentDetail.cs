using Newtonsoft.Json;

namespace Epay3Service.Models;

public class DocumentDetail
{
    [JsonProperty("billing_document_number")]
    public string DocumentNumber { get; set; } = null!;

    [JsonProperty("document_type")]
    public string DocumentType { get; set; } = null!;
  
    [JsonProperty("customer_number")]
    public string CustomerNumber { get; set; } = null!;

}
