using Microsoft.AspNetCore.Authorization;

namespace Epay3Net.Authorization.Abilities;

public sealed class RequiresAllAbilitiesAttribute : AuthorizeAttribute
{
    public RequiresAllAbilitiesAttribute(params string[] abilities)
    {
        Policy = AbilityPolicyNames.ForAll(abilities);
    }
}
