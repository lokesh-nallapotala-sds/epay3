using System.Security.Claims;
using System.Text.Json;
using Epay3Net.Controllers;
using Epay3Net.Maintenance;
using Epay3Service.Models;
using Epay3Service.Services;

namespace Epay3Net.Middleware;

public sealed class AuthenticatedMaintenanceMiddleware(
    RequestDelegate next,
    IMaintenanceCacheService maintenanceCache)
{
    public async Task InvokeAsync(HttpContext context)
    {
        if (!MaintenanceRequestGuards.IsApiRequest(context.Request.Path) ||
            context.User.Identity?.IsAuthenticated != true ||
            IsAdmin(context.User))
        {
            await next(context);
            return;
        }

        var state = maintenanceCache.GetState();
        MaintenanceConfigRefresher.TryRefreshInBackground(context, maintenanceCache, state);
        if (!state.IsMaintenanceActive && !state.IsSapUnavailable)
        {
            await next(context);
            return;
        }

        var payload = MaintenancePresentation.CreateStatusResponse(state);

        context.Response.Cookies.Delete(
            AuthController.AuthCookieName,
            AuthController.CreateAuthCookieOptions(DateTimeOffset.UnixEpoch));
        context.Response.StatusCode = state.IsSapUnavailable
            ? StatusCodes.Status503ServiceUnavailable
            : StatusCodes.Status401Unauthorized;
        context.Response.ContentType = "application/json; charset=utf-8";
        await context.Response.WriteAsync(JsonSerializer.Serialize(payload, MaintenancePresentation.SerializerOptions));
    }

    private static bool IsAdmin(ClaimsPrincipal user)
        => string.Equals(
            user.FindFirst(ClaimTypes.Role)?.Value,
            UserRole.Admin,
            StringComparison.OrdinalIgnoreCase);
}
