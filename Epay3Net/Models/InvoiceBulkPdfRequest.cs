namespace Epay3Net.Models;

public class InvoiceBulkPdfRequest
{
    public string DocumentNumber { get; set; } = null!;
    public string CustomerNumber { get; set; } = null!;
    public string PrimaryAccount { get; set; } = null!;
    public string billingDocs { get; set; } = null!;
}

