using Newtonsoft.Json;


namespace Epay3Service.Models;

public class PayerDetail
{
    public bool? IsAutoPayEnrolled { get; set; }

    [JsonProperty("address_data")]
    public CompanyAddress? AddressData { get; set; }

    [JsonProperty("communcation_data")]
    public Communications? Communications { get; set; }

    [JsonProperty("payment_cards")]
    public List<PaymentCard>? PaymentCards { get; set; }

    [JsonProperty("company_data")]
    public List<CompanyDataWrapper>? CompanyData { get; set; }

    [JsonProperty("soldto_list")]
    public List<SoldTo>? SoldToList { get; set; }

    [JsonProperty("auto_pay_status")]
    public List<AutoPayStatus>? PayerAutoPayStatus { get; set; }
}
