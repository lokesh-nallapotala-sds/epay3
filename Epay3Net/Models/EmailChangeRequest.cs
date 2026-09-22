namespace Epay3Net.Models;

/// <summary>
/// Request to change the caller's email. A verification link is sent to
/// <see cref="NewEmail"/>; the change is only applied once that link is clicked.
/// </summary>
public class EmailChangeRequest
{
    /// <summary>
    /// Optional. When omitted the caller's own id (from claims) is used.
    /// </summary>
    public string? UserId { get; set; }
    public string? NewEmail { get; set; }

    /// <summary>
    /// The caller's current password. Required — because email is also the login,
    /// an email change is a credential change, so the caller must re-authenticate.
    /// </summary>
    public string? CurrentPassword { get; set; }
}
