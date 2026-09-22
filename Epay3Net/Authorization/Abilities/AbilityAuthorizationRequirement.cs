using Microsoft.AspNetCore.Authorization;

namespace Epay3Net.Authorization.Abilities;

public sealed class AbilityAuthorizationRequirement : IAuthorizationRequirement
{
    public AbilityAuthorizationRequirement(AbilityAuthorizationMode mode, IReadOnlyCollection<string> abilities)
    {
        if (abilities.Count == 0)
        {
            throw new ArgumentException("At least one ability is required.", nameof(abilities));
        }

        Mode = mode;
        Abilities = abilities;
    }

    public AbilityAuthorizationMode Mode { get; }

    public IReadOnlyCollection<string> Abilities { get; }
}
