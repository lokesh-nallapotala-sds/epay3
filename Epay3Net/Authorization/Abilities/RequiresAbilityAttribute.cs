using Microsoft.AspNetCore.Authorization;

namespace Epay3Net.Authorization.Abilities;

public sealed class RequiresAbilityAttribute : AuthorizeAttribute
{
    public RequiresAbilityAttribute(string ability)
    {
        Policy = AbilityPolicyNames.ForAll(ability);
    }
}
