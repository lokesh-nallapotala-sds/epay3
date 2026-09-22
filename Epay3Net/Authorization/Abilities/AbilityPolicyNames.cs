namespace Epay3Net.Authorization.Abilities;

public static class AbilityPolicyNames
{
    public const string Prefix = "Ability";

    private const string Separator = ":";

    public static string ForAll(params string[] abilities) =>
        Build(AbilityAuthorizationMode.All, abilities);

    public static string ForAny(params string[] abilities) =>
        Build(AbilityAuthorizationMode.Any, abilities);

    public static bool TryParse(
        string? policyName,
        out AbilityAuthorizationMode mode,
        out IReadOnlyCollection<string> abilities)
    {
        mode = AbilityAuthorizationMode.All;
        abilities = Array.Empty<string>();

        if (string.IsNullOrWhiteSpace(policyName))
        {
            return false;
        }

        string[] parts = policyName.Split(Separator, StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 3 || !string.Equals(parts[0], Prefix, StringComparison.Ordinal))
        {
            return false;
        }

        if (!Enum.TryParse(parts[1], ignoreCase: false, out mode))
        {
            return false;
        }

        abilities = parts[2]
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToArray();

        return abilities.Count > 0;
    }

    private static string Build(AbilityAuthorizationMode mode, IReadOnlyCollection<string> abilities)
    {
        if (abilities.Count == 0)
        {
            throw new ArgumentException("At least one ability is required.", nameof(abilities));
        }

        return $"{Prefix}{Separator}{mode}{Separator}{string.Join(",", abilities)}";
    }
}
