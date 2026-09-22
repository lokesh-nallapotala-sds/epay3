namespace Epay3Service.DTOs;

// SAP DTO form of Epay3Service.Clients.Models.SapHttpStatus
internal class SapStatus
{
    public string? message_identification { get; set; }

    public string? message_type { get; set; }

    public int message_number { get; set; }

    public string? message_line_string { get; set; }
}
