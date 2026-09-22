using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Epay3Net.Controllers;

public static class HashTokenService
{
    public static string GetSimpleToken(string value, string key)
    {
        var claims = new List<Claim>
        {
            new("Payload", value)
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var byteKey = Encoding.UTF8.GetBytes(key);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(15),
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(byteKey),
                SecurityAlgorithms.HmacSha256Signature)
        };

        SecurityToken token = tokenHandler.CreateToken(tokenDescriptor);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }


    public static JwtSecurityToken DeserializeToken(string token, string key)
    {
        if (string.IsNullOrEmpty(token))
        {
            throw new Exception("Invalid token. Token is empty");
        }

        SecurityToken validatedToken;

        var tokenHandler = new JwtSecurityTokenHandler();
        var byteKey = Encoding.UTF8.GetBytes(key);

        try
        {
            tokenHandler.ValidateToken(token, new TokenValidationParameters()
            {
                ValidateIssuerSigningKey = true,
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                IssuerSigningKey = new SymmetricSecurityKey(byteKey),
                RequireExpirationTime = true,
                LifetimeValidator = CustomLifetimeValidator
            },
            out validatedToken
            );
        }
        catch (Exception ex)
        {
            throw new Exception("Token is very old and cannot be validated");
        }

        if (validatedToken != null)
        {
            return (JwtSecurityToken)validatedToken;
        }

        throw new Exception("Token cannot be validated");
    }

    private static bool CustomLifetimeValidator(DateTime? notBefore, DateTime? expires, SecurityToken tokenToValidate, TokenValidationParameters @param)
    {
        if (expires != null)
        {
            return expires > DateTime.UtcNow;
        }
        return false;
    }
}
