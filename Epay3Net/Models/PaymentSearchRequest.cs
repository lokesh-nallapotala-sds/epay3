using System.ComponentModel.DataAnnotations;

namespace Epay3Net.Models;

public class PaymentSearchRequest
{

    [Required]
    public string SelectedAccount { get; set; } = null!;

    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public DateTime? DueDateFrom { get; set; }
    public DateTime? DueDateTo { get; set; }
    public List<string>? SubAccounts { get; set; }
    public string documentType { get; set; } = null!;
    public string Status { get; set; } = null!;

}
