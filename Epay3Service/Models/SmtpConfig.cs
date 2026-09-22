namespace Epay3Service.Models;

public class SmtpConfig
{
    public string SmtpAddress { set; get; }
    public bool SmtpUseUser { set; get; }
    public int SmtpPort { set; get; }
    public string SmtpUser { set; get; }
    public string SmtpPassword { set; get; }
    public string RegistrationRequestEmail { set; get; }
    public string FromAddress { get; set; }
    public string FromAddressName { get; set; }
    public string TestEmail { get; set; }

    public string MailSubject { get; set; }

    public string MailBody { get; set; }
}