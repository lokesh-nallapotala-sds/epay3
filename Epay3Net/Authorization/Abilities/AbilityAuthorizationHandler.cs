using Epay3Service.Models;
using Microsoft.AspNetCore.Authorization;

namespace Epay3Net.Authorization.Abilities;

public sealed class AbilityAuthorizationHandler : AuthorizationHandler<AbilityAuthorizationRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        AbilityAuthorizationRequirement requirement)
    {
        bool hasRequiredAbilities = requirement.Mode switch
        {
            AbilityAuthorizationMode.Any => requirement.Abilities.Any(ability =>
                context.User.HasClaim(Ability.ClaimType, ability)),
            AbilityAuthorizationMode.All => requirement.Abilities.All(ability =>
                context.User.HasClaim(Ability.ClaimType, ability)),
            _ => false
        };

        if (hasRequiredAbilities)
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
