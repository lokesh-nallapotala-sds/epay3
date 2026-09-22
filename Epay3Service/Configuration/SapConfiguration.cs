using System.ComponentModel.DataAnnotations;

namespace Epay3Service.Configuration;

public class SapConfiguration
{
    [Required(AllowEmptyStrings = false)]
    public string User { get; set; } = string.Empty;

    [Required(AllowEmptyStrings = false)]
    public string Password { get; set; } = string.Empty;

    [Required(AllowEmptyStrings = false)]
    public string ApiId { get; set; } = string.Empty;

    [Required(AllowEmptyStrings = false)]
    public string ClientId { get; set; } = string.Empty;

    [Required(AllowEmptyStrings = false)]
    public string DefaultLanguage { get; set; } = string.Empty;

    public string? DefaultDepositReasonCode { get; set; }

    [Required(AllowEmptyStrings = false)]
    public string Url { get; set; } = string.Empty;

    public SapHeaders? Headers { get; set; }

}

public class SapHeaders
{
    public string? CnbsSysId { get; set; }
}
