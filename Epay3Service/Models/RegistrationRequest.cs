namespace Epay3Service.Models;

public class RegistrationRequest
{
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string Email { get; set; }
    public string Company { get; set; }
    public string Message { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
