using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;

namespace Epay3Net.Authorization.Abilities;

public sealed class AbilityAuthorizationPolicyProvider : DefaultAuthorizationPolicyProvider
{
    public AbilityAuthorizationPolicyProvider(IOptions<AuthorizationOptions> options)
        : base(options)
    {
    }

    public override Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        if (!AbilityPolicyNames.TryParse(policyName, out AbilityAuthorizationMode mode, out IReadOnlyCollection<string> abilities))
        {
            return base.GetPolicyAsync(policyName);
        }

        AuthorizationPolicy policy = new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .AddRequirements(new AbilityAuthorizationRequirement(mode, abilities))
            .Build();

        return Task.FromResult<AuthorizationPolicy?>(policy);
    }
}
