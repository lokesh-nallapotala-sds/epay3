using System.Security.Claims;
using System.Diagnostics.CodeAnalysis;
using Epay3Service.Models;

namespace Epay3Net.Authorization;

public static class ImpersonationAuthorization
{
    private const string UserIdClaimType = "UserId";

    public static bool CanAccessRequestedUserId(this ClaimsPrincipal principal, string? requestedUserId)
    {
        if (string.IsNullOrWhiteSpace(requestedUserId))
        {
            return false;
        }

        string? currentUserId = principal.FindFirst(UserIdClaimType)?.Value;
        if (!string.IsNullOrWhiteSpace(currentUserId) &&
            string.Equals(currentUserId, requestedUserId, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return principal.HasClaim(Ability.ClaimType, Ability.Impersonate);
    }

    public static string? GetCurrentUserId(this ClaimsPrincipal principal) =>
        principal.FindFirst(UserIdClaimType)?.Value;

    public static bool TryResolveRequestedUserId(
        this ClaimsPrincipal principal,
        string? requestedUserId,
        [NotNullWhen(true)] out string? resolvedUserId)
    {
        resolvedUserId = !string.IsNullOrWhiteSpace(requestedUserId)
            ? requestedUserId
            : principal.GetCurrentUserId();

        return !string.IsNullOrWhiteSpace(resolvedUserId);
    }
}
