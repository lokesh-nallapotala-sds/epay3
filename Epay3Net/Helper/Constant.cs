namespace Epay3Net.Helper
{
    public static class StringConstant
    {
        public const string Tokenization = "02";
        public static readonly Dictionary<string, string> EmailTemplates =
            new()
           {
               { "welcome_email_content", "Welcome Email" },
               { "confirmation_email_content", "Confirmation Email" },
               { "email_change_verification_content", "Email Change Verification" },
               { "reset_password_email_content", "Password Reset Email" },
               { "password_changed_email_content", "Password Changed Email" },
               { "invoice_receipt_content", "Payment Confirmation Email" },
               { "guest_invoice_receipt_content", "Guest Payment Confirmation Email" }
           };
    }
}
