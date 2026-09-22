using Epay3Service.Models;

namespace Epay3Service.DTOs;

public class PayerDetailsRequestInfo
{
    public string customer_number { get; set; }
    public string company_code { get; set; }
    public string action { get; set; }
    public SalesArea sales_area_data { get; set; }
}

public class PaymentOptionInfo
{
    public string payment_provider { get; set; }
    public string payment_card_type { get; set; }
    public string external_payment_card_type { get; set; }
    public bool preauthorization_active { get; set; }
    public decimal preauthorization_amount { get; set; }
}
