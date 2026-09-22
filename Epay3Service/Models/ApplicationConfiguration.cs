
using Epay3Service.Custom.Attributes;

namespace Epay3Service.Models;

public class ApplicationConfiguration
{
    [ApplicationValue("AllowRegistration")]
    public bool AllowRegistration { get; set; }
    [ApplicationValue("PrivacyPolicy")]
    public string? PrivacyPolicy { get; set; }
    [ApplicationValue("TermsAndConditions")]
    public string? TermsAndConditions { get; set; }
    [ApplicationValue("ContactUs")]
    public string? ContactUs { get; set; }
    [ApplicationValue("ApplicationLinks")]
    public List<ApplicationLinkItem>? ApplicationLinks { get; set; }

    [ApplicationValue("IsPaymentsDisable")]
    public bool IsPaymentDisabled { get; set; }

    [ApplicationValue("RegistrationEmail")]
    public string? RegistrationEmail { get; set; }

    [ApplicationValue("RegistrationEmailExpiration")]
    public string? RegistrationEmailExpiration { get; set; }

    [ApplicationValue("ExpirationMessage")]
    public string? ExpirationMessage { get; set; }

    [ApplicationValue("DisablePaymentsGlobally")]
    public bool DisablePaymentsGlobally { get; set; }

    [ApplicationValue("AddressValidationOptions")]
    public string? AddressValidationOptions { get; set; }

    [ApplicationValue("AllowGuestPayment")]
    public bool AllowGuestPayment { get; set; }

    [ApplicationValue("IsAccountLinkingEnabled")]
    public bool IsAccountLinkingEnabled { get; set; }

    [ApplicationValue("MessageLanguage")]
    public string? MessageLanguage { get; set; }

    [ApplicationValue("PaymentDisableMessageText")]
    public Dictionary<string, string>? PaymentDisableMessageText { get; set; }

    [ApplicationValue("MaxPaymentAllowed")]
    public string? MaxPaymentAllowed { get; set; }

    [ApplicationValue("ApplicationUrl")]
    public string? ApplicationUrl { get; set; }

    [ApplicationValue("CompanyName")]
    public string? CompanyName { get; set; }

    [ApplicationValue("MaxECheckPaymentAllowed")]
    public string? MaxECheckPaymentAllowed { get; set; }

    [ApplicationValue("isPaymentsDisable")]
    public string? isPaymentsDisable { get; set; }

    [ApplicationValue("notificationLanguage")]
    public string? notificationLanguage { get; set; }

    [ApplicationValue("notificationText")]
    public string? notificationText { get; set; }

    [ApplicationValue("maintenanceUrl")]
    public string? maintenanceUrl { get; set; }

    [ApplicationValue("selectedlanguage")]
    public string? selectedlanguage { get; set; }

    [ApplicationValue("fromDateLocal")]
    public string? fromDateLocal { get; set; }

    [ApplicationValue("toDateLocal")]
    public string? toDateLocal { get; set; }
    public int CopyrightYear => DateTime.UtcNow.Year;

    [ApplicationValue("IsSignInDisable")]
    public bool IsSignInDisable { get; set; }

    [ApplicationValue("ApplicationName")]
    public string? ApplicationName { get; set; }

    [ApplicationValue("IsAutoPayEnabled")]
    public bool IsAutoPayEnabled { get; set; }

    [ApplicationValue("IsSchedulePaymentsEnabled")]
    public bool IsSchedulePaymentsEnabled { get; set; }

    [ApplicationValue("ScheduledPaymentPolicy")]
    public ScheduledPaymentPolicy? ScheduledPaymentPolicy { get; set; }

    [ApplicationValue("AllowCVV")]
    public bool AllowCVV { get; set; }

    [ApplicationValue("PaymentIntegrationType")]
    public string? PaymentIntegrationType { get; set; }
}
