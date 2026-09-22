using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Epay3Service.Extensions;
using Epay3Service.Models;
using Microsoft.IdentityModel.Tokens;
using Newtonsoft.Json;

namespace Epay3Service.Helpers;

public static class JwtTokenHelper {
    public static string GetAuthToken(User user, byte[] keyBytes, string kid, bool isImpersonating = false) {
        var claims = new List<Claim>(user.Claims.EmptyIfNull());

        claims.Add(new Claim("IsImpersonating", isImpersonating.ToString().ToLower()));

        var tokenHandler = new JwtSecurityTokenHandler();
        var secKey = new SymmetricSecurityKey(keyBytes) { KeyId = kid };
        var tokenDescriptor = new SecurityTokenDescriptor {
            Subject = new ClaimsIdentity(claims),
            Issuer = "epay3-api",
            Audience = "epay3-frontend",
            Expires = DateTime.UtcNow.AddHours(1),
            SigningCredentials = new SigningCredentials(secKey,
                SecurityAlgorithms.HmacSha256Signature)
        };
        SecurityToken token = tokenHandler.CreateToken(tokenDescriptor);

        return tokenHandler.WriteToken(token);
    }

    public static string GetPayloadToken<T>(T payload, string key, DateTime expirationTime) {
        var claims = new List<Claim>
        {
            new("Payload", JsonConvert.SerializeObject(payload))
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var byteKey = Encoding.UTF8.GetBytes(key);
        var tokenDescriptor = new SecurityTokenDescriptor {
            Subject = new ClaimsIdentity(claims),
            Expires = expirationTime,
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(byteKey),
                SecurityAlgorithms.HmacSha256Signature)
        };
        SecurityToken token = tokenHandler.CreateToken(tokenDescriptor);

        return tokenHandler.WriteToken(token);
    }

    public static T? GetPayloadFromToken<T>(string token, string key) {
        var tokenHandler = new JwtSecurityTokenHandler();
        var byteKey = Encoding.UTF8.GetBytes(key);
        SecurityToken validatedToken;

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

            if (validatedToken != null) {
                var jwtToken = (JwtSecurityToken)validatedToken;

                var json = jwtToken.Claims.SingleOrDefault(x => x.Type == "Payload")?.Value;

                if (string.IsNullOrEmpty(json)) {
                    return default;
                }

                T? request = JsonConvert.DeserializeObject<T>(json);

                return request;
            }
            return default;
        }
        catch {
            return default;
        }

    }

    private static bool CustomLifetimeValidator(DateTime? notBefore, DateTime? expires, SecurityToken tokenToValidate, TokenValidationParameters @param) {
        if (expires != null) {
            return expires > DateTime.UtcNow;
        }
        return false;
    }
}
