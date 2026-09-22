namespace Epay3Net.Models;

public class ApplicationLinkItem
{
    public string? Id { get; set; }
    public string? Label { get; set; }
    public string? Url { get; set; }
}

public class ApplicationConfigRequest
{
    public bool AllowRegistration { get; set; }
    public string? RegistrationEmail { get; set; }
    public string? RegistrationEmailExpiration { get; set; }
    public string? RegistrationEmailExpirationMessage { get; set; }
    public string? PrivacyPolicy { get; set; }
    public string? TermsAndConditions { get; set; }
    public string? ContactUs { get; set; }
    public List<ApplicationLinkItem>? ApplicationLinks { get; set; }
    public bool DisablePaymentsGlobally { get; set; }
    public bool AllowGuestPayment { get; set; }
    public bool IsAccountLinkingEnabled { get; set; }
    public string? MessageLanguage { get; set; }
    public string? MessageText { get; set; }
    public string? MaxPaymentAllowed { get; set; }
    public string? MaxECheckPaymentAllowed { get; set; }

    public string? AddressValidationOptions { get; set; }

    public string? ApplicationUrl { set; get; }
    public string? SmtpAddress { set; get; }

    public string? SmtpPort { set; get; }
    public bool SmtpUseUser { set; get; }
    public string? SmtpUser { set; get; }
    public string? SmtpPassword { set; get; }
    public string? RegistrationRequestEmail { set; get; }
    public string? OverrideEmail { set; get; }
    public string? FromAddress { get; set; }
    public string? FromAddressName { get; set; }
    public string? RegistrationRequestEmailContent { set; get; }
    public string? WelcomeEmailContent { get; set; }
    public string? ResetPasswordEmailContent { get; set; }
    public string? EmailConfirmationContent { get; set; }
    public string? RegistrationRequestorEmailContent { get; set; }

    public string? CompanyName { get; set; }
    public bool isPaymentsDisable { get; set; }
    public string? en_paymentDisableMessageText { get; set; }
    public string? fr_paymentDisableMessageText { get; set; }
    public string? de_paymentDisableMessageText { get; set; }
    public string? es_paymentDisableMessageText { get; set; }
    public string? it_paymentDisableMessageText { get; set; }
    public string? ja_paymentDisableMessageText { get; set; }
    public string? pt_paymentDisableMessageText { get; set; }
    public string? ru_paymentDisableMessageText { get; set; }
    public string? bannerContent { get; set; }
    public bool AccountNumber { get; set; }
    public bool InvoiceNumber { get; set; }
    public bool InvoiceAmount { get; set; }
    public bool ShowInvoicePdfActions { get; set; }
    public bool ShowInvoiceDaysTillDue { get; set; }
    public bool ShowInvoiceHistoryFilter { get; set; }
    public bool ShowPaymentHistoryFilter { get; set; }
    public bool EnablePreAuth { get; set; }
}
