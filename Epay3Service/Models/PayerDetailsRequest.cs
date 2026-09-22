namespace Epay3Service.Models;

public class PayerDetailsRequest
{
    public string CustomerNumber { get; set; }

    public string CompanyCode { get; set; }

    public string Action { get; set; }

    public SalesArea SalesArea { get; set; }
}