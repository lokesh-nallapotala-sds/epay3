namespace Epay3Service.Managers.Interfaces;

public interface ITokenService
{
    public Task< string> GenerateRefreshToken(int size = 32);
    public Task SaveRefreshToken(string userId, string refreshToken);
    public Task<bool> GetUserIdFromRefreshToken(string refreshToken, out string userId);
}
