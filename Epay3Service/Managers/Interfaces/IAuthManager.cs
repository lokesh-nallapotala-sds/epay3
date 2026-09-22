
using Epay3Service.Models;

public enum LoginStatusAction { Success, Failure, PasswordChanged, PasswordReset }

public interface IAuthManager
{
    public Task<User?> ValidateLogin(string username, string password, string language = "en");
    public Task<User> GetUserByConfirmationToken(string token, string language = "en");
    public Task<User> GetUserByInviteToken(string token, string language = "en");
    public Task<User> UpdateLogonStatus(User user, LoginStatusAction status, string language = "en");
}
