using Newtonsoft.Json;
using System.ComponentModel.DataAnnotations;

namespace Epay3Service.Models;

public partial class DepositRequest
{
    [Required]
    public string SelectedAccount { get; set; } = null!;
    [Required]
    public string Payer { get; set; } = null!;

    public CardinalData? CardinalData { get; set; }

    [Required]
    public DepositDetail depositDetails { get; set; } = null!;

    [Required]
    public PaymentMethod? PaymentMethod { get; set; }
    [MaxLength(4)]
    public string? Cvv { get; set; }

    [MaxLength(2048)]
    public string? ThreeDSAccessToken { get; set; }

    public string? UserId { get; set; }  //for impersonation
    public string? CompanyCode { get; set; }

    [MaxLength(256)]
    public string? VRef { get; set; }
}

public partial class DepositRequest
{
    public static DepositRequest FromJson(string json) => JsonConvert.DeserializeObject<DepositRequest>(json, Converter.Settings);
}
