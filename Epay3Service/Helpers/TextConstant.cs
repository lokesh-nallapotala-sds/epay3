namespace Epay3Service.Helpers;

public class TextConstant
{
    public static string WaitingConfirmation = "waiting-confirmation";
    public static readonly List<string> ExpectedEmailTemplateKeys = new()
        {
             "welcome_email_content",
             "confirmation_email_content",
             "email_change_verification_content",
             "reset_password_email_content",
             "password_changed_email_content",
             "invoice_receipt_content",
             "guest_invoice_receipt_content"
        };
}
