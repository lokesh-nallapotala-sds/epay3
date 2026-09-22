using Epay3Service.Managers.Interfaces;
using Epay3Service.Services;

namespace Epay3Net.Maintenance;

/// <summary>
/// Stale-while-revalidate for the per-container maintenance config: when the
/// cached copy is older than the TTL, any request passing an enforcement point
/// kicks off a non-blocking SAP refresh. This bounds how long an admin edit
/// made on one container stays invisible to the others, without reintroducing
/// a background timer.
/// </summary>
public static class MaintenanceConfigRefresher
{
    public static void TryRefreshInBackground(
        HttpContext context,
        IMaintenanceCacheService maintenanceCache,
        MaintenanceStateSnapshot state)
    {
        // During an outage the refresh would only add failing SAP calls;
        // recovery is owned by the unavailable-page probe and organic traffic.
        if (state.IsSapUnavailable || !maintenanceCache.IsConfigStale() || !maintenanceCache.TryBeginConfigRefresh())
        {
            return;
        }

        // Singleton — safe to use after this request completes.
        var manager = context.RequestServices.GetRequiredService<IApplicationConfigurationManager>();

        _ = Task.Run(async () =>
        {
            try
            {
                // SetCache on success; failures are logged and marked internally.
                await manager.GetMaintenanceConfig();
            }
            catch
            {
                // GetMaintenanceConfig swallows its own exceptions; never let a
                // background refresh throw.
            }
            finally
            {
                maintenanceCache.EndConfigRefresh();
            }
        });
    }
}
