using System.ComponentModel.DataAnnotations;

namespace Epay3Net.Models;

public class AdminRecoveryStartRequest
{
    [Required]
    public string Key { get; set; } = string.Empty;

    [Required]
    public string User { get; set; } = string.Empty;
}
