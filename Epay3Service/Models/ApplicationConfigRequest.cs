using Epay3Service.Models;

namespace Epay3Service.Models.ConfigRequest;

public class ApplicationConfigRequest
{
    public bool AllowRegistration { get; set; }
    public string? RegistrationEmail { get; set; }
    public string? RegistrationEmailExpiration { get; set; }
    public string? ExpirationMessage { get; set; }
    public string? PrivacyPolicy { get; set; }
    public string? TermsAndConditions { get; set; }
    public string? ContactUs { get; set; }
    public List<ApplicationLinkItem>? ApplicationLinks { get; set; }
    public bool DisablePaymentsGlobally { get; set; }
    public bool AllowCVV { get; set; }
    public string? AddressValidationOptions { get; set; }
    public bool AllowGuestPayment { get; set; }
    public bool IsAccountLinkingEnabled { get; set; }
    public string? MessageLanguage { get; set; }
    public Dictionary<string, string>? PaymentDisableMessageText { get; set; }
    public string? MaxPaymentAllowed { get; set; }
    public string? MaxECheckPaymentAllowed { get; set; }
    public string? PaymentIntegrationType { get; set; }

    public bool IsAutoPayEnabled { get; set; }
    public bool IsSchedulePaymentsEnabled { get; set; }
    public ScheduledPaymentPolicy? ScheduledPaymentPolicy { get; set; }
}
