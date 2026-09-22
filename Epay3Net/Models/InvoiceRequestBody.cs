using Epay3Service.Models;
using System.ComponentModel.DataAnnotations;

namespace Epay3Net.Models;

public partial class InvoicesRequest
{

    [Required]
    public string DocumentType { get; set; } = null!;

    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public DateTime? DueDateFrom { get; set; }
    public DateTime? DueDateTo { get; set; }

    public string Status { get; set; } = null!;

    public PayerData PayerData { get; set; } = null!;


}




public class InvoicesSearchRequest
{
    public string? SelectedAccount { get; set; }
    public string[]? SubAccounts { get; set; }
    public string? From { get; set; }
    public string? To { get; set; }
    public string? DocumentType { get; set; }
    public string? Status { get; set; }
}

public class InvoiceRequestBody
{
    public SearchParameters? SearchParameters { get; set; }
  //  public SoldToData? SoldToData { get; set; } //Need to revisit
    public PayerData? PayerData { get; set; }
    public List<ValidateInvoiceAccount>? ValidatedAccounts { get; set; }
    public string? DocumentType { get; set; }
    public string? Status { get; set; }
}

public class SearchParameters
{
    public string? DocumentType { get; set; }
    public string? Status { get; set; }
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public DateTime? DueDateFrom { get; set; }
    public DateTime? DueDateTo { get; set; }
    public string? Currency { get; set; }
    public List<SearchFilter>? Filters { get; set; }
    public string[]? SoldToSearchParams { get; set; }
}

public class SearchFilter
{
    public string? FilterType { get; set; }
    public string? Value { get; set; }
}

public class SoldToData
{
    public string? CustomerNumber { get; set; }
    public Epay3Net.Models.SalesArea? SalesArea { get; set; }
}

public class SalesArea
{
    public string? SalesOrganization { get; set; }
    public string? DistributionChannel { get; set; }
    public string? Division { get; set; }
}
