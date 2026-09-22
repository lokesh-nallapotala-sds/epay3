using Newtonsoft.Json;
using System.ComponentModel.DataAnnotations;

namespace Epay3Service.Models;

public class SapPaymentRequest
{
  [JsonProperty("payer_data")]
  public PayerData? Payer { get; set; }
  [JsonProperty("payment_detail")]
  public PaymentDetail? PaymentDetail { get; set; }
  [JsonProperty("currency_decimals")]
  public int CurrencyDecimals { get; set; }
  [JsonProperty("soldto")]
  public SoldToPayment? SoldTo { get; set; }
  [JsonProperty("documents")]
  public List<PaymentInvoice>? Documents { get; set; }
  [JsonProperty("zzcustom")]
  public ZCustom? Custom { get; set; }
  [JsonProperty("log")]
  public TraceLog? Log { get; set; }

  [JsonProperty("scheduled_date")]
  public string? ScheduledDate { get; set; }
}
public class PayerData
{
    [JsonProperty("customer_number")]
    public string? CustomerNumber { get; set; }

    [JsonProperty("company_code")]
    public string? CompanyCode { get; set; }
}

public class PaymentDetail
{
  [JsonProperty("payment_method")]
  public string? PaymentMethod { get; set; }

  [JsonProperty("payment_card_type")]
  public string? PaymentCardType { get; set; }

  [JsonProperty("payment_card_token")]
  [MaxLength(256)]
  public string? PaymentCardToken { get; set; }

  [JsonProperty("last_four")]
  public string? CardLast4Digit { get; set; }

  [JsonProperty("payment_card_name")]
  public string? PaymentCardName { get; set; }

  [JsonProperty("valid_from")]
  public string? ValidFrom { get; set; }

  [JsonProperty("valid_to")]
  public string? ValidTo { get; set; }

  [JsonProperty("electronic_check_account_type")]
  public string? ElectronicCheckAccountType { get; set; }

  [JsonProperty("electronic_check_rdfi_number")]
  public string? ElectronicCheckRdfiNumber { get; set; }

  [JsonProperty("address_data")]
  public CompanyAddress? AddressData { get; set; }

  [JsonProperty("card_validation_code")]
  [MaxLength(4)]
  public string? CardValidationCode { get; set; }

  [JsonProperty("cardinal")]
  public CardinalData? Cardinal { get; set; }

}

public class SoldToPayment
{
    [JsonProperty("account_number")]
    public string? AccountNumber { get; set; }
}

public class TraceLog
{

    [JsonProperty("id")]
    public string? id { get; set; }

    [JsonProperty("login")]
    public string? login { get; set; }

    [JsonProperty("epayv")]
    public string? epayv { get; set; }

    [JsonProperty("usrag")]
    public string? usrag { get; set; }


}

public class ZCustom
{
    [JsonProperty("document_header_text")]
    public string? HeaderText { get; set; }
}
