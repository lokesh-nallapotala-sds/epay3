using System.Security.Claims;
using Epay3Net.Authorization;
using Epay3Service.Models;

namespace Epay3Net.Tests.Authorization;

public class ImpersonationAuthorizationTests
{
    [Fact]
    public void CanAccessRequestedUserId_ReturnsTrue_ForCurrentUser()
    {
        ClaimsPrincipal principal = CreatePrincipal("user-1");

        Assert.True(principal.CanAccessRequestedUserId("user-1"));
    }

    [Fact]
    public void CanAccessRequestedUserId_ReturnsFalse_ForDifferentUserWithoutImpersonateAbility()
    {
        ClaimsPrincipal principal = CreatePrincipal("user-1");

        Assert.False(principal.CanAccessRequestedUserId("user-2"));
    }

    [Fact]
    public void CanAccessRequestedUserId_ReturnsTrue_ForDifferentUserWithImpersonateAbility()
    {
        ClaimsPrincipal principal = CreatePrincipal("user-1", Ability.Impersonate);

        Assert.True(principal.CanAccessRequestedUserId("user-2"));
    }

    private static ClaimsPrincipal CreatePrincipal(string userId, params string[] abilities)
    {
        IEnumerable<Claim> claims = new[] { new Claim("UserId", userId) }
            .Concat(abilities.Select(ability => new Claim(Ability.ClaimType, ability)));

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "test"));
    }
}
