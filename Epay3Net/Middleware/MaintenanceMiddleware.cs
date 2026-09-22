using System.Text.Json;
using Epay3Net.Maintenance;
using Epay3Service.Services;

namespace Epay3Net.Middleware;

/// <summary>
/// Enforces maintenance mode for the anonymous public flows (Create Account,
/// Forgot Password, Guest Payment). The authenticated side is handled by
/// <see cref="AuthenticatedMaintenanceMiddleware"/>; this guards the
/// unauthenticated endpoints so direct API/URL access can't bypass maintenance.
/// </summary>
public sealed class MaintenanceMiddleware(
RequestDelegate next,
    IMaintenanceCacheService maintenanceCache)
{
    public async Task InvokeAsync(HttpContext context)
    {
        if (!MaintenanceRequestGuards.IsMaintenanceProtectedAnonymousEndpoint(context.Request.Path))
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

        context.Response.StatusCode = state.IsSapUnavailable
            ? StatusCodes.Status503ServiceUnavailable
            : StatusCodes.Status403Forbidden;
        context.Response.ContentType = "application/json; charset=utf-8";
        await context.Response.WriteAsync(
            JsonSerializer.Serialize(payload, MaintenancePresentation.SerializerOptions));
    }
}
