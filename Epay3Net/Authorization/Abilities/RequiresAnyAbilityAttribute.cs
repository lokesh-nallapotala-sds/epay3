using Microsoft.AspNetCore.Authorization;

namespace Epay3Net.Authorization.Abilities;

public sealed class RequiresAnyAbilityAttribute : AuthorizeAttribute
{
    public RequiresAnyAbilityAttribute(params string[] abilities)
    {
        Policy = AbilityPolicyNames.ForAny(abilities);
    }
}
