using Epay3Service.Models;

namespace Epay3Service.Services;

public interface IMaintenanceCacheService
{
    MaintenanceConfigRequest? GetCachedConfig();
    void SetCache(MaintenanceConfigRequest config);
    bool IsMaintenanceActive();
    MaintenanceStateSnapshot GetState();
    void MarkSapFailure();
    void MarkSapSuccess();
    bool IsConfigStale();
    bool TryBeginConfigRefresh();
    void EndConfigRefresh();
}
