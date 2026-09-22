using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Epay3Service.Helpers;
using Epay3Service.Models;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace Epay3Service.Tests.Helpers;

public class JwtTokenHelperTests
{
    private static readonly byte[] KeyBytes =
        Encoding.UTF8.GetBytes("SuperSecretKeyForTestingTheJwtTokensGeneration!123");

    private static User MakeUser() => new()
    {
        UserId = "1",
        Login = "user",
        Email = "user@example.com",
        PrimaryAccountType = "Payer",
        Role = "admin",
        Claims = []
    };

    [Fact]
    public void GetAuthToken_IssuesTokenWithExpectedIssuerAndAudience()
    {
        var user = MakeUser();
        user.Claims.AddRange(user.GetMetainfoClaims());
        user.Claims.AddRange(user.GetAbilityClaims());

        var token = JwtTokenHelper.GetAuthToken(user, KeyBytes, "v1");

        var handler = new JwtSecurityTokenHandler();
        handler.ValidateToken(token, new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(KeyBytes),
            ValidateIssuer = true,
            ValidIssuer = "epay3-api",
            ValidateAudience = true,
            ValidAudience = "epay3-frontend",
            ValidateLifetime = true
        }, out SecurityToken validatedToken);

        var jwt = Assert.IsType<JwtSecurityToken>(validatedToken);
        Assert.Equal("epay3-api", jwt.Issuer);
        Assert.Contains(jwt.Audiences, a => a == "epay3-frontend");
    }

    [Fact]
    public void GetAuthToken_PlacesKidInJwtHeader()
    {
        var token = JwtTokenHelper.GetAuthToken(MakeUser(), KeyBytes, "v7");

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);
        Assert.Equal("v7", jwt.Header.Kid);
    }

    [Fact]
    public void GetAuthToken_FailsValidation_WhenWrongKey()
    {
        var token = JwtTokenHelper.GetAuthToken(MakeUser(), KeyBytes, "v1");

        // KeyId must match the token's kid so the library actually tries the key;
        // without it the library throws SecurityTokenSignatureKeyNotFoundException instead.
        var wrongKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes("WrongKeyThatIsLongEnoughForHmacSha256Validation!XYZ"))
            { KeyId = "v1" };

        var handler = new JwtSecurityTokenHandler();
        Assert.Throws<SecurityTokenInvalidSignatureException>(() =>
            handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = wrongKey,
                ValidateIssuer = true,
                ValidIssuer = "epay3-api",
                ValidateAudience = true,
                ValidAudience = "epay3-frontend",
                ValidateLifetime = false
            }, out _));
    }

    [Fact]
    public void GetAuthToken_SetsIsImpersonatingClaim_WhenTrue()
    {
        var token = JwtTokenHelper.GetAuthToken(MakeUser(), KeyBytes, "v1", isImpersonating: true);

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);
        var claim = jwt.Claims.FirstOrDefault(c => c.Type == "IsImpersonating");
        Assert.NotNull(claim);
        Assert.Equal("true", claim.Value);
    }

    [Fact]
    public void GetAuthToken_SetsIsImpersonatingClaim_FalseByDefault()
    {
        var token = JwtTokenHelper.GetAuthToken(MakeUser(), KeyBytes, "v1");

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);
        var claim = jwt.Claims.FirstOrDefault(c => c.Type == "IsImpersonating");
        Assert.NotNull(claim);
        Assert.Equal("false", claim.Value);
    }
}
