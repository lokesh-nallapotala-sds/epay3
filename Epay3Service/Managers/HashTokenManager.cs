using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Epay3Service.Managers.Interfaces;
using Microsoft.IdentityModel.Tokens;

namespace Epay3Service.Managers;

public class HashTokenManager() : IHashTokenManager {

    public Task<JwtSecurityToken> DeserializeToken(string token, string key) {
        if (string.IsNullOrEmpty(token)) {
            throw new Exception("Invalid token. Token is empty");
        }

        SecurityToken validatedToken;

        var tokenHandler = new JwtSecurityTokenHandler();
        var byteKey = Encoding.UTF8.GetBytes(key);

        try {
            tokenHandler.ValidateToken(token, new TokenValidationParameters() {
                ValidateIssuerSigningKey = true,
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
                RequireExpirationTime = true,
                LifetimeValidator = CustomLifetimeValidator
            },
            out validatedToken
            );
        }
        catch (Exception) {
            throw new Exception("Token is very old and cannot be validated");
        }

        if (validatedToken is JwtSecurityToken jwtToken) {
            return Task.FromResult(jwtToken);
        }

        throw new Exception("Token cannot be validated");
    }

    public Task<string> GetSimpleToken(string value, string key) {
        var claims = new List<Claim>
        {
            new("Payload", value)
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var byteKey = Encoding.UTF8.GetBytes(key);

        var tokenDescriptor = new SecurityTokenDescriptor {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(15),
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(byteKey),
                SecurityAlgorithms.HmacSha256Signature)
        };

        SecurityToken token = tokenHandler.CreateToken(tokenDescriptor);

        var tokenString = tokenHandler.WriteToken(token);

        return Task.FromResult(tokenString);
    }

    private static bool CustomLifetimeValidator(DateTime? notBefore, DateTime? expires, SecurityToken tokenToValidate, TokenValidationParameters @param) {
        if (expires != null) {
            return expires > DateTime.UtcNow;
        }
        return false;
    }
}
