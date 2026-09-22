namespace Epay3Service.Models;

public class PaymentCardResponseDto
{
    public string? PaymentCardType { get; set; }
    public string? SapCardType { get; set; }

    public string? GatewayCardType { get; set; }

    public string? PaymentCardToken { get; set; }

    public string? PaymentCardName { get; set; }

    public string? ValidFrom { get; set; }

    public string? ValidTo { get; set; }

    public string? ElectronicCheckAccountType { get; set; }

    public string? ElectronicCheckRdfiNumber { get; set; }

    public string? Default { get; set; }

    public string? CardLast4Digit { get; set; }

    public string? CardValidationCode { get; set; }
}
