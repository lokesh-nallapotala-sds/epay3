namespace Epay3Service.Models;

public class SystemConfiguration
{
    public String applicationUrl { set; get; }
    public String SmtpAddress { set; get; }

    public String SmtpPort { set; get; }
    public bool SmtpUseUser { set; get; }
    public String SmtpUser { set; get; }
    public String SmtpPassword { set; get; }
    public String RegistrationRequestEmail { set; get; }
    public string SecurityEmail { set; get; }
    public string OverrideEmail { set; get; }
    public string FromAddress { get; set; }
    public String FromAddressName { get; set; }
    public String RegistrationRequestEmailContent { set; get; }
    public String WelcomeEmailContent { get; set; }
    public String ResetPasswordEmailContent { get; set; }
    public String EmailConfirmationContent { get; set; }
    public String RegistrationRequestorEmailContent { get; set; }

    public bool AllowRegistration { get; set; }
    public String RegistrationEmailExpiration { set; get; }

    public String RegistrationEmailExpirationMessage { set; get; }

    public bool AllowGuestPayment { get; set; }
    public String CompanyName { get; set; }

    public String PrivacyPolicy { get; set; }
    public String ContactUs { get; set; }
    public String TermsAndConditions { get; set; }
    public bool isPaymentsDisable { get; set; }
    public String en_paymentDisableMessageText { get; set; }
    public String fr_paymentDisableMessageText { get; set; }
    public String de_paymentDisableMessageText { get; set; }
    public String es_paymentDisableMessageText { get; set; }
    public String it_paymentDisableMessageText { get; set; }
    public String ja_paymentDisableMessageText { get; set; }
    public String pt_paymentDisableMessageText { get; set; }
    public String ru_paymentDisableMessageText { get; set; }
    public String maxPaymentAllowed { get; set; }

    public String maxECheckPaymentAllowed { get; set; }
    public string? addressValidationOptions { get; set; }
    public String bannerContent { get; set; }
    public bool AccountNumber { get; set; }
    public bool InvoiceNumber { get; set; }
    public bool InvoiceAmount { get; set; }

}
