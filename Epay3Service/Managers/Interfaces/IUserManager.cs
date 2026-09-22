using Epay3Service.Models;

namespace Epay3Service.Managers.Interfaces;

public interface IUserManager
{
    public Task<IList<User>?> GetUsers(string searchFilter = "", string language = "en");

    public Task<User?> GetUserById(string userId, string language = "en");
    public Task<User?> GetUserByLogin(string login, string language = "en");
    public Task<User?> GetUserByEmail(string email, string language = "en");

    public Task<User?> CreateUser(User user, string language = "en");
    public Task<User?> UpdateUser(User user, string language = "en");
    public Task<User?> DeleteUser(User user, string language = "en");
    public Task<Status?> RecoverUser(string key, string user, string mode, string language = "en");
    public Task<User?> GetUserByResetPassword(string requestId, string language = "en");
}
