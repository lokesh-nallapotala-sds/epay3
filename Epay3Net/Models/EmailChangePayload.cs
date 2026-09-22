namespace Epay3Net.Models;

/// <summary>
/// Payload carried inside the signed, short-lived email-change token. Encoding
/// the target user and new email in the token keeps the flow stateless — no SAP
/// schema change is needed to remember a pending email change.
/// </summary>
public class EmailChangePayload
{
    public string? UserId { get; set; }
    public string? NewEmail { get; set; }
}
