
using System.ComponentModel.DataAnnotations;

namespace Epay3Service.Configuration;

public class ApplicationSecrets
{
    public string RegistrationKey { get; set; } = string.Empty;

    [Required(AllowEmptyStrings = false)]
    public string EncryptionKey { get; set; } = string.Empty;

    [Required(AllowEmptyStrings = false)]
    public string CvvEncryptionKey { get; set; } = string.Empty;

    [Required(AllowEmptyStrings = false)]
    public string RequestsTokenKey { get; set; } = string.Empty;
}
