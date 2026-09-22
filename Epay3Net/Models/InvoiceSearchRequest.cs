using Epay3Service.Models;
using Newtonsoft.Json;
using System.ComponentModel.DataAnnotations;

namespace Epay3Net.Models;

public class InvoiceSearchRequest
{
    [Required]
    public string SelectedAccount { get; set; } = null!;
    public string? CompanyCode { get; set; }
    public string? SalesOrganization { get; set; }
    public string? UserId { get; set; } = null;  //for impersonation

    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public DateTime? DueDateFrom { get; set; }
    public DateTime? DueDateTo { get; set; }
    public List<string>? SubAccounts { get; set; }
    public string documentType { get; set; } = null!;
    public string Status { get; set; } = null!;
    public string CurrencyKey { get; set; } = null!;
    public bool ExcludePayments { get; set; }
    public bool ExcludeCredits { get; set; }
    public List<SearchFilter>? Filters { get; set; }
}
