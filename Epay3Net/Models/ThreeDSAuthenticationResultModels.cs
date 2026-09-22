using System.ComponentModel.DataAnnotations;
using Epay3Service.Models;

namespace Epay3Net.Models;

public class ThreeDSAuthenticationResultRequest
{
    [Required]
    public string AccessToken { get; set; } = string.Empty;
}

public class ThreeDSAuthenticationResultResponse
{
    public CardinalData? CardinalData { get; set; }

    public Status? Status { get; set; }

    public string? AccessToken { get; set; }
    public string? VRef { get; set; }
}
