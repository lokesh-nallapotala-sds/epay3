using System.ComponentModel.DataAnnotations;

namespace Epay3Net.Models;

public class AdminRecoveryRequest
{
    [Required]
    public string Key { get; set; }
    [Required]
    public string User { get; set; }
    [Required]
    public string Mode { get; set; }
    [Required]
    public string Password { get; set; }

    public string Firstname { get; set; }
    public string Lastname { get; set; }
    public string Company { get; set; }
    public string Email { get; set; }
    public string AccountType { get; set; }
    public string Role { get; set; }
}
