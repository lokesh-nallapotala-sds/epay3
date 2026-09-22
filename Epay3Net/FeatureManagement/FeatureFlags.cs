namespace Epay3Net.FeatureManagement;

/// <summary>
/// Central registry of feature-flag names and which are safe to expose to
/// UNAUTHENTICATED clients.
///
/// Flags are defined in the "FeatureManagement" section of appsettings.json and
/// evaluated SERVER-SIDE via Microsoft.FeatureManagement (no external service, no
/// client SDK, no telemetry). ConfigController surfaces the evaluated booleans to
/// the SPA under config "featureFlags", applying the same anonymous/authenticated
/// tiering as the rest of the payload.
///
/// SECURITY RULE: a client-visible flag may only drive UI presentation. NEVER gate
/// a sensitive decision (payment enablement, authorization, the config tiering
/// itself) on a flag the browser can see — enforce those server-side.
/// </summary>
public static class FeatureFlags
{
    // --- Migrated legacy toggles ---------------------------------------------
    // Previously top-level appsettings booleans read via IConfiguration.GetValue.
    // Now evaluated via Microsoft.FeatureManagement so they gain percentage/
    // targeting/time-window rollout and runtime control. For backward compatibility
    // these are still surfaced at their ORIGINAL top-level response keys (not under
    // the nested "featureFlags" object), so existing frontend selectors keep working.
    //
    // EnablePreAuth is ALSO enforced server-side (GuestPaymentController,
    // CustomerController) — a good example of a flag that gates behavior, not just UI,
    // and therefore cannot be trusted from the client.
    public const string ShowInvoicePdfActions = "ShowInvoicePdfActions";
    public const string ShowInvoiceDaysTillDue = "ShowInvoiceDaysTillDue";
    public const string ShowInvoiceHistoryFilter = "ShowInvoiceHistoryFilter";
    public const string ShowPaymentHistoryFilter = "ShowPaymentHistoryFilter";
    public const string EnablePreAuth = "EnablePreAuth";

    // --- Client-visible flags delivered via the nested "featureFlags" object ---
    // Add NEW client-facing flags here to keep them out of the top-level appConfig
    // namespace. Public = exposed to anonymous callers; AuthenticatedOnly = only
    // authenticated. Empty until the first real client flag is introduced — when both
    // are empty, ConfigController omits the "featureFlags" object entirely.

    /// <summary>Flags exposed to anonymous (unauthenticated) clients.</summary>
    public static readonly string[] Public = [];

    /// <summary>
    /// Flags exposed only to authenticated clients (in addition to <see cref="Public"/>).
    /// </summary>
    public static readonly string[] AuthenticatedOnly = [];
}
