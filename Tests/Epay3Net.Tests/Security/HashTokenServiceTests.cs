using Epay3Net.Controllers;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Xunit;

namespace Epay3Net.Tests.Security;

public class HashTokenServiceTests
{
    private const string Key = "SuperSecretKeyForTestingTheJwtTokensGeneration!123";
    private const string OtherKey = "AnotherSecretKeyForTestingJwtValidationOnly!123";

    [Fact]
    public void GetSimpleToken_ReturnsTokenWithPayloadClaim_WhenDeserialized()
    {
        // Arrange
        const string payload = "payload-value";

        // Act
        var token = HashTokenService.GetSimpleToken(payload, Key);
        var jwt = HashTokenService.DeserializeToken(token, Key);

        // Assert
        Assert.Equal(payload, jwt.Claims.Single(claim => claim.Type == "Payload").Value);
    }

    [Fact]
    public void GetSimpleToken_UsesShortLifetime()
    {
        // Arrange
        var issuedAt = DateTime.UtcNow;

        // Act
        var token = HashTokenService.GetSimpleToken("payload", Key);
        var jwt = HashTokenService.DeserializeToken(token, Key);

        // Assert
        Assert.InRange(jwt.ValidTo, issuedAt.AddMinutes(14), issuedAt.AddMinutes(16));
    }

    [Fact]
    public void DeserializeToken_ThrowsInvalidToken_WhenTokenIsEmpty()
    {
        // Arrange
        const string token = "";

        // Act
        var exception = Assert.Throws<Exception>(() => HashTokenService.DeserializeToken(token, Key));

        // Assert
        Assert.Equal("Invalid token. Token is empty", exception.Message);
    }

    [Fact]
    public void DeserializeToken_ThrowsTokenIsVeryOldAndCannotBeValidated_WhenTokenIsExpired()
    {
        // Arrange
        var token = CreateToken("payload", Key, DateTime.UtcNow.AddMinutes(-1));

        // Act
        var exception = Assert.Throws<Exception>(() => HashTokenService.DeserializeToken(token, Key));

        // Assert
        Assert.Equal("Token is very old and cannot be validated", exception.Message);
    }

    [Fact]
    public void DeserializeToken_ThrowsTokenIsVeryOldAndCannotBeValidated_WhenSigningKeyDiffers()
    {
        // Arrange
        var token = HashTokenService.GetSimpleToken("payload", OtherKey);

        // Act
        var exception = Assert.Throws<Exception>(() => HashTokenService.DeserializeToken(token, Key));

        // Assert
        Assert.Equal("Token is very old and cannot be validated", exception.Message);
    }

    private static string CreateToken(string value, string key, DateTime expires)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var byteKey = Encoding.UTF8.GetBytes(key);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity([new Claim("Payload", value)]),
            NotBefore = expires.AddMinutes(-1),
            Expires = expires,
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(byteKey),
                SecurityAlgorithms.HmacSha256Signature)
        };

        return tokenHandler.WriteToken(tokenHandler.CreateToken(tokenDescriptor));
    }
}
