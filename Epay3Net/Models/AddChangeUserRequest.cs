namespace Epay3Net.Models;

//TODO: consider refactoring common properties out of the `User` class into a shared interface
public class AddChangeUserRequest : Epay3Service.Models.User
{
    public string? Password { get; set; } = null;
}
