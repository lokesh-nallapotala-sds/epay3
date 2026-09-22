using Newtonsoft.Json;
using System.ComponentModel.DataAnnotations;

namespace Epay3Service.Models;

public class TokenizationResponse
{
    [JsonProperty("paymentcard")]
    public TokenizationResponsePaymentCard PaymentCard { get; set; }

    [JsonProperty("status")]
    public Status Status { get; set; }

    [JsonProperty("cardinal")]
    public CardinalData Cardinal { get; set; }

    [JsonProperty("v_ref")]
    public string? VRef { get; set; }
}

public class Cardinal
{
    [JsonProperty("threedsversion")]
    public string ThreeDSVersion { get; set; }

    [JsonProperty("enrolled")]
    public string Enrolled { get; set; }


    [JsonProperty("eciflg")]
    public string Eciflg { get; set; }

    [JsonProperty("transactionid")]
    public string TransactionId { get; set; }
}
public class TokenizationResponsePaymentCard
{
    [JsonProperty("payment_card_type")]
    public string Type { get; set; }

    [JsonProperty("sap_card_type")]
    public string? SapCardType { get; set; }

    [JsonProperty("gateway_card_type")]
    public string? GatewayCardType { get; set; }

    [JsonProperty("payment_card_name")]
    public string Name { get; set; }

    [JsonProperty("payment_card_token")]
    [MaxLength(256)]
    public string Token { get; set; }

    [JsonProperty("valid_from")]
    public string ValidFrom { get; set; }

    [JsonProperty("valid_to")]
    public string ValidTo { get; set; }

    [JsonProperty("electronic_check_account_type")]
    public string ElectronicCheckAccountType { get; set; } = "";

    [JsonProperty("electronic_check_rdfi_number")]
    public string ElectronicCheckRdfiNumber { get; set; } = "";

    [JsonProperty("card_validation_code")]
    [MaxLength(4)]
    public string CardValidationCode { get; set; } = "";

    [JsonProperty("last_four")]
    public string? CardLast4Digit { get; set; } = "";
}

public partial class Status
{
    [JsonProperty("message_type")]
    public string MessageType { get; set; }

    [JsonProperty("message_identification")]
    public string MessageIdentification { get; set; }

    [JsonProperty("message_number")]
    public long MessageNumber { get; set; }

    [JsonProperty("message_line_string")]
    public string MessageLineString { get; set; }
}
