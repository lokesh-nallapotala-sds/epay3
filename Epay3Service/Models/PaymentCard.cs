using Newtonsoft.Json;
using System.ComponentModel.DataAnnotations;

namespace Epay3Service.Models;

public class PaymentCard
{
    [JsonProperty("payment_card_type")]
    public string? PaymentCardType { get; set; }

    public string? SapCardType { get; set; }

    [JsonProperty("payment_card_token")]
    [MaxLength(256)]
    public string? PaymentCardToken { get; set; }

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

    [JsonProperty("default")]
    public string? Default { get; set; }

    [JsonProperty("last_four")]
    public string? CardLast4Digit { get; set; }

    [JsonProperty("card_validation_code")]
    [MaxLength(4)]
    public string? CardValidationCode { get; set; }

    public bool IsValid => !string.IsNullOrEmpty(this.ValidTo) && DateTime.Parse(this.ValidTo) > DateTime.Now;
}

public class PaymentMethod
{
    [Required]
    public string Name { get; set; } = string.Empty;

    [Required(AllowEmptyStrings = true)]
    public string? Key { get; set; } // Nullable and allows empty strings

    [Required]
    public string CardType { get; set; } = string.Empty;

    public string? SapCardType { get; set; }

    public string? GatewayCardType { get; set; }

    public bool Default { get; set; } // No `[Required]` needed for bool

    [MaxLength(256)]
    public string? Token { get; set; } // Nullable field (optional)
    public string? ValidFrom { get; set; } // Nullable field (optional)
    public string? ValidTo { get; set; } // Nullable field (optional)
}
