using Epay3Service.Custom.Attributes;


namespace Epay3Service.Models;

public class PaymentConfiguration
{
    [ApplicationValue("MaxPaymentAllowed")]
    public double MaximumAllowedCCAmount { get; set; }

    [ApplicationValue("MaxECheckPaymentAllowed")]
    public double MaximumAllowedECAmount { get; set; }

    [ApplicationValue("DisablePaymentsGlobally")]
    public bool IsPaymentDisabled { get; set; }

    [ApplicationValue("AddressValidationOptions")]
    public string? AddressValidationOptions { get; set; }

}
