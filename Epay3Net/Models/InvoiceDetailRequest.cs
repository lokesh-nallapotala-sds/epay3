namespace Epay3Net.Models;

public partial class InvoiceDetailRequest
{
    public string? DocumentNumber { get; set; }
    public string? CustomerNumber { get; set; }
    public string? DocumentType { get; set; }
    public List<ValidateInvoiceAccount>? ValidatedAccounts { get; set; }
}
