using System.Text.Json;
using Epay3Service.Models;
using Epay3Service.Services;

namespace Epay3Net.Maintenance;

public static class MaintenanceModes
{
    public const string None = "none";
    public const string Active = "maintenance_active";
    public const string Unavailable = "maintenance_unavailable";
}

public sealed class MaintenanceStatusResponse
{
    public string Mode { get; init; } = MaintenanceModes.None;
    public string Code { get; init; } = MaintenanceModes.None;
    public MaintenanceConfigRequest? MaintenanceConfig { get; init; }
    public string? Message { get; init; }
    public string? FallbackUrl { get; init; }
}

public static class MaintenancePresentation
{
    public const string FallbackPath = "/maintenance/unavailable";

    // Shared options so middleware-written payloads match the camelCase shape
    // the client expects (mode/code/maintenanceConfig/fallbackUrl).
    public static readonly JsonSerializerOptions SerializerOptions =
        new(JsonSerializerDefaults.Web);

    public static MaintenanceStatusResponse CreateStatusResponse(MaintenanceStateSnapshot state)
    {
        if (state.IsSapUnavailable)
        {
            return new MaintenanceStatusResponse
            {
                Mode = MaintenanceModes.Unavailable,
                Code = MaintenanceModes.Unavailable,
                MaintenanceConfig = state.Config,
                Message = GetUnavailableMessage(state.Config),
                FallbackUrl = FallbackPath
            };
        }

        if (state.IsMaintenanceActive)
        {
            return new MaintenanceStatusResponse
            {
                Mode = MaintenanceModes.Active,
                Code = MaintenanceModes.Active,
                MaintenanceConfig = state.Config,
                Message = GetConfiguredMaintenanceMessage(state.Config),
                FallbackUrl = FallbackPath
            };
        }

        return new MaintenanceStatusResponse
        {
            Mode = MaintenanceModes.None,
            Code = MaintenanceModes.None,
            MaintenanceConfig = state.Config,
            FallbackUrl = FallbackPath
        };
    }

    public static string GetConfiguredMaintenanceMessage(MaintenanceConfigRequest? config)
    {
        if (config is null)
            return "The system is currently undergoing scheduled maintenance. Please try again after the maintenance window.";

        return ReplacePlaceholders(GetNotificationTemplate(config), config);
    }

    public static string GetUnavailableMessage(MaintenanceConfigRequest? config)
    {
        if (config is null)
            return "ChronarPay is temporarily unavailable because system configuration could not be loaded. Please try again shortly.";

        return ReplacePlaceholders(GetNotificationTemplate(config), config);
    }

    private static string GetNotificationTemplate(MaintenanceConfigRequest config)
    {
        if (config.NotificationText is { Count: > 0 })
        {
            if (!string.IsNullOrWhiteSpace(config.NotificationLanguage) &&
                config.NotificationText.TryGetValue(config.NotificationLanguage, out var selected) &&
                !string.IsNullOrWhiteSpace(selected))
            {
                return selected;
            }

            if (config.NotificationText.TryGetValue("en", out var en) && !string.IsNullOrWhiteSpace(en))
                return en;

            var first = config.NotificationText.Values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));
            if (first is not null)
                return first;
        }

        return "The system is currently undergoing scheduled maintenance. Please try again after the maintenance window.";
    }

    private static string ReplacePlaceholders(string message, MaintenanceConfigRequest config)
        => message
         .Replace("<%datefrom%>", config.FromDateLocal.ToString("MMM d, yyyy"))
         .Replace("<%timefrom%>", config.FromDateLocal.ToString("h:mm tt"))
         .Replace("<%dateto%>", config.ToDateLocal.ToString("MMM d, yyyy"))
         .Replace("<%timeto%>", config.ToDateLocal.ToString("h:mm tt"));

}

public static class MaintenanceRequestGuards
{
    private static readonly HashSet<string> BypassPrefixes =
    [
        "/api/",
        "/health",
        "/images/",
        "/assets/",
        "/upload/"
    ];

    private static readonly HashSet<string> BypassExtensions =
    [
        ".js", ".css", ".ico", ".png", ".jpg", ".jpeg", ".svg",
        ".woff", ".woff2", ".ttf", ".eot", ".map", ".webp", ".gif", ".json"
    ];

    public static bool IsHtmlDocumentRequest(HttpContext context)
    {
        if (!HttpMethods.IsGet(context.Request.Method))
            return false;

        var accept = context.Request.Headers.Accept.ToString();
        return accept.Contains("text/html", StringComparison.OrdinalIgnoreCase);
    }

    public static bool ShouldBypass(string path)
    {
        foreach (var prefix in BypassPrefixes)
        {
            if (path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                return true;
        }

        var ext = Path.GetExtension(path);
        return !string.IsNullOrEmpty(ext) &&
               BypassExtensions.Contains(ext.ToLowerInvariant());
    }

    public static bool IsApiRequest(PathString path)
        => path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase);

    // Anonymous (unauthenticated) public endpoints that power the Create
    // Account, Forgot Password and Guest Payment flows. These must be blocked
    // while maintenance is active/unavailable so direct API access can't bypass
    // maintenance mode (the client route guard alone is not sufficient).
    private static readonly string[] MaintenanceProtectedAnonymousPaths =
    [
        "/api/account/autoregister",
        "/api/account/validate",
        "/api/account/auto-register/resend-confirmation",
        "/api/user/password-reset-request",
        "/api/user/complete-password-reset",
        "/api/guestpayment"
    ];

    public static bool IsMaintenanceProtectedAnonymousEndpoint(PathString path)
    {
        foreach (var blocked in MaintenanceProtectedAnonymousPaths)
        {
            if (path.StartsWithSegments(blocked, StringComparison.OrdinalIgnoreCase))
                return true;
        }

        return false;
    }
}
