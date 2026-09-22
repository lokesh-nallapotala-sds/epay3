using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Epay3Service.Models;

namespace Epay3Net.Custom;

/// <remarks>adapted from <see cref="Microsoft.AspNetCore.Identity.UserClaimsPrincipalFactory"/></remarks>
internal class EpayClaimsPrincipalFactory : IUserClaimsPrincipalFactory<User>
{
    public EpayClaimsPrincipalFactory()
    {
    }

    public async Task<ClaimsPrincipal> CreateAsync(User user)
    {
        if (user == null)
        {
            throw new ArgumentNullException(nameof(user));
        }

        ClaimsIdentity claimsIdentity = await this.GenerateClaimsAsync(user);

        return new ClaimsPrincipal(claimsIdentity);
    }

    protected async Task<ClaimsIdentity> GenerateClaimsAsync(User user)
    {
        user.EnsureIdentityData();

        var id = new ClaimsIdentity();

        id.AddClaim(new Claim("UserId", user.UserId));
        id.AddClaim(new Claim(ClaimTypes.Name, user.Login));
        id.AddClaim(new Claim(ClaimTypes.Email, user.Email ?? string.Empty));
        id.AddClaim(new Claim(ClaimTypes.GivenName, user.FirstName ?? string.Empty));
        id.AddClaim(new Claim(ClaimTypes.Surname, user.LastName ?? string.Empty));

        id.AddClaim(new Claim("AccountType", user.PrimaryAccountType));

        List<Account> userAccounts = user.Accounts ?? new List<Account>();
        foreach (Account account in userAccounts)
        {
            if (!string.IsNullOrWhiteSpace(account.PrimaryAcct))
            {
                id.AddClaim(new Claim("Accounts", account.PrimaryAcct));
            }
        }

        return id;
    }
}
