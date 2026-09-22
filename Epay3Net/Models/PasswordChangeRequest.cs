using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Epay3Net.Models;

public class PasswordChangeRequest
{
    [MaxLength(45)]
    [Column("OldPassword")]
    public string? CurrentPassword { get; set; }

    [MaxLength(45)]
    [Column("password")]
    public string? NewPassword { get; set; }

    [MaxLength(45)]
    [Column("ConfirmPassword")]
    public string? NewPasswordConfirmation { get; set; }
}
