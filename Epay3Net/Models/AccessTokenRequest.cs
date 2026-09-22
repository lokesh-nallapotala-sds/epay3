using System.ComponentModel.DataAnnotations;

namespace Epay3Net.Models;

public class AccessTokenRequest
{
    [Required]
    public string SelectedAccount { get; set; } = null!;

    [Required]
    public string Payer { get; set; } = null!;

    [MaxLength(512)]
    public string? CardKey { get; set; }

    [Required]
    public decimal Amount { get; set; }
    
    public string Currency { get; set; } = null!;

    [Required]
    public string RedirectUri { get; set; } = null!;

    public PaymentMethod? PaymentMethod { get; set; } = new PaymentMethod();

    [MaxLength(4)]
    public string? Cvv { get; set; }

    public string? UserId { get; set; }  //for impersonation

    public string? CompanyCode { get; set; }
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

    public bool Default { get; set; }

    [MaxLength(256)]
    public string? Token { get; set; }

    public string? ValidFrom { get; set; }

    public string? ValidTo { get; set; }
}

public class PaymentAccessTokenRequest
{
    [Required]
    public string SelectedAccount { get; set; } = null!;

    [Required]
    public string Action { get; set; } = string.Empty;

    [Required]
    public string PaymentMethod { get; set; } = string.Empty;

    [Required]
    public Dictionary<string, string?> CardinalData { get; set; }
}
