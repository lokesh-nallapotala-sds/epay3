namespace Epay3Service.DTOs;

public class EmailConfigRequestInfo
{
    public string smtpAddress { get; set; }
    public string smtpPort { get; set; }
    public bool smtpUseUser { get; set; }
    public string smtpUser { get; set; }
    public string? smtpPassword { get; set; }
    public string? registrationRequestEmail { get; set; }
    public string? overrideEmail { get; set; }
    public string? securityEmail { get; set; }

    public string? fromAddress { get; set; }
    public string? fromAddressName { get; set; }
    public string? registrationRequestEmailContent { get; set; }
    public string? welcomeEmailContent { get; set; }
    public string? resetPasswordEmailContent { get; set; }

    public string? emailConfirmationContent { get; set; }
    public string? applicationUrl { get; set; }
    public string? companyName { get; set; }
    public bool HasPassword { get; set; }
}
