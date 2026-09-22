using Epay3Service.Models;

namespace Epay3Net.Models;

public class AutoRegisterRequest
{
    public User User { get; set; } = null!;

    public List<ValidateInvoiceAccount> Accounts { get; set; } = new();
}
