using System.IdentityModel.Tokens.Jwt;

namespace Epay3Service.Managers.Interfaces;

public interface IHashTokenManager
{
    public Task< string> GetSimpleToken(string value, string key);

    public Task<JwtSecurityToken> DeserializeToken(string token, string key);


}
