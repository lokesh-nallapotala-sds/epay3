namespace Epay3Net.Models;

/// <summary>
/// Self-service profile update. Only the fields a user is allowed to change
/// about themselves are present here (email is handled via the verified
/// email-change flow, not this request).
/// </summary>
public class UpdateProfileRequest
{
    /// <summary>
    /// Optional. When omitted the caller's own id (from claims) is used.
    /// Supplying an id requires the caller to be able to access it
    /// (self or an impersonator).
    /// </summary>
    public string? UserId { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Company { get; set; }
    public string? RegionalFormat { get; set; }
}
