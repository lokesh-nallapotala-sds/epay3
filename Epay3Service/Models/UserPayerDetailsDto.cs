namespace Epay3Service.Models;

public class UserPayerDetailsDto
{
    public string? CustomerNumber { get; set; }

    public string? CompanyCode { get; set; }

    public bool? IsAutoPayEnrolled { get; set; }

    public CompanyAddress? AddressData { get; set; }

    public List<PaymentCardResponseDto> PaymentCards { get; set; } = [];

    public List<AutoPayStatus> PayerAutoPayStatus { get; set; } = [];
}
