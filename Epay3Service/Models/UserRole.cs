namespace Epay3Service.Models;

public static class UserRole
{
    public const string Admin = "admin";
    public const string Manager = "manager";
    public const string Internal = "internal";
    public const string User = "user";

    public static bool IsEqual(string? roleA, string? roleB)
        => string.Equals(roleA?.Trim(), roleB?.Trim(), StringComparison.OrdinalIgnoreCase);

    public static bool IsAdmin(string? role)
        => string.Equals(role?.Trim(), Admin, StringComparison.OrdinalIgnoreCase);

    public static bool IsManager(string? role)
        => string.Equals(role?.Trim(), Manager, StringComparison.OrdinalIgnoreCase);

    public static bool IsInternal(string? role)
        => string.Equals(role?.Trim(), Internal, StringComparison.OrdinalIgnoreCase);

    public static bool IsUser(string? role)
        => string.Equals(role?.Trim(), User, StringComparison.OrdinalIgnoreCase);

    public static string GetResourceStringId(string? rolename)
    {
        switch (rolename?.Trim().ToLowerInvariant())
        {
            case Admin:
                return "user.role.admin";
            case Manager:
                return "user.role.manager";
            case Internal:
                return "user.role.internal";
            case User:
                return "user.role.user";
            default:
                //should not get here
                return string.Empty;
        }
    }
}
