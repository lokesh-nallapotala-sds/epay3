using Epay3Service.Models;

namespace Epay3Net.Models;

public abstract class PaymentCardActionRequest
{
    public PayerData PayerData { get; set; } = new();

    public PaymentCard PaymentCard { get; set; } = new();

    public string? UserId { get; set; }
}

public class AddPaymentCardRequest : PaymentCardActionRequest
{
    [System.ComponentModel.DataAnnotations.MaxLength(256)]
    public string? VRef { get; set; }
}

public class UpdatePaymentCardRequest : PaymentCardActionRequest
{
}

public class DeletePaymentCardRequest : PaymentCardActionRequest
{
}

public class PreAuthorizePaymentCardRequest : PaymentCardActionRequest
{
    public SapPaymentCardAddressData? AddressData { get; set; }
}

public class GuestPaymentPreAuthorizeCardRequest : PreAuthorizePaymentCardRequest
{
    [System.ComponentModel.DataAnnotations.MaxLength(256)]
    public string? VRef { get; set; }
}
