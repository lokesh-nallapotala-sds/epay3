using Epay3Service.Models;
using Microsoft.Extensions.Caching.Memory;

namespace Epay3Service.Services;

public sealed class MaintenanceCacheService(IMemoryCache cache) : IMaintenanceCacheService
{
    private const string CacheKey = "epay3:maintenance_config";
    private static readonly MemoryCacheEntryOptions CacheOptions =
        new() { AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(48) };
    // Default of 2 so a single transient blip (one slow or dropped call)
    // cannot flip the whole site to unavailable; a real outage trips it on
    // the next call within moments.
    private static readonly int UnavailableThreshold =
        int.TryParse(Environment.GetEnvironmentVariable("MAINTENANCE_SAP_FAILURE_THRESHOLD"), out var t) && t > 0
            ? t : 2;

    // How old the cached config may get before traffic triggers a background
    // refresh. Bounds admin-edit propagation across containers — each container
    // caches its own copy, so without this an edit made on one container is
    // invisible to the others until their 48h cache expiry.
    private static readonly TimeSpan ConfigTtl = TimeSpan.FromMinutes(
        int.TryParse(Environment.GetEnvironmentVariable("MAINTENANCE_CONFIG_TTL_MINUTES"), out var ttl) && ttl > 0
            ? ttl : 5);

    // Floor between refresh attempts so persistent failures (SAP returning
    // empty values) don't turn every request into a SAP call.
    private static readonly TimeSpan RefreshAttemptFloor = TimeSpan.FromSeconds(60);

    private readonly object sync = new();
    private DateTimeOffset? lastSuccessfulRefreshUtc;
    private DateTimeOffset? lastRefreshAttemptUtc;
    private bool configRefreshInProgress;
    private bool lastRefreshFailed;
    private int consecutiveFailures;

    public MaintenanceConfigRequest? GetCachedConfig()
        => cache.TryGetValue<MaintenanceConfigRequest>(CacheKey, out var config) ? config : null;

    public void SetCache(MaintenanceConfigRequest config)
    {
        cache.Set(CacheKey, config, CacheOptions);

        lock (sync)
        {
            lastSuccessfulRefreshUtc = DateTimeOffset.UtcNow;
            lastRefreshFailed = false;
            consecutiveFailures = 0;
        }
    }

    public void MarkSapFailure()
    {
        lock (sync)
        {
            lastRefreshFailed = true;
            consecutiveFailures++;
        }
    }

    public void MarkSapSuccess()
    {
        lock (sync)
        {
            lastRefreshFailed = false;
            consecutiveFailures = 0;
        }
    }

    public bool IsConfigStale()
    {
        lock (sync)
        {
            return lastSuccessfulRefreshUtc is null
                || DateTimeOffset.UtcNow - lastSuccessfulRefreshUtc > ConfigTtl;
        }
    }

    public bool TryBeginConfigRefresh()
    {
        lock (sync)
        {
            var now = DateTimeOffset.UtcNow;
            if (configRefreshInProgress ||
                (lastRefreshAttemptUtc is not null && now - lastRefreshAttemptUtc < RefreshAttemptFloor))
            {
                return false;
            }

            configRefreshInProgress = true;
            lastRefreshAttemptUtc = now;
            return true;
        }
    }

    public void EndConfigRefresh()
    {
        lock (sync)
        {
            configRefreshInProgress = false;
        }
    }

    public bool IsMaintenanceActive()
        => GetState().IsMaintenanceActive;

    public MaintenanceStateSnapshot GetState()
    {
        var config = GetCachedConfig();
        var isActive = false;
        if (config is not null && config.IsSignInDisable)
        {
            var now = DateTimeOffset.UtcNow;
            isActive = config.FromDateLocal <= now && now <= config.ToDateLocal;
        }

        lock (sync)
        {
            return new MaintenanceStateSnapshot
            {
                Config = config,
                HasConfig = config is not null,
                IsMaintenanceActive = isActive,
                IsSapUnavailable = (config is null && lastRefreshFailed) || consecutiveFailures >= UnavailableThreshold,
                LastSuccessfulRefreshUtc = lastSuccessfulRefreshUtc
            };
        }
    }
}
