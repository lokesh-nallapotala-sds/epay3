using Epay3Service.Models;

namespace Epay3Service.Services;

public sealed class MaintenanceStateSnapshot
{
    public MaintenanceConfigRequest? Config { get; init; }
    public bool HasConfig { get; init; }
    public bool IsMaintenanceActive { get; init; }
    public bool IsSapUnavailable { get; init; }
    public DateTimeOffset? LastSuccessfulRefreshUtc { get; init; }
}
