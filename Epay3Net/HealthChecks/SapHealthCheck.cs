using Epay3Service.Managers.Interfaces;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Epay3Net.HealthChecks
{
    public class SapHealthCheck : IHealthCheck
    {
        private readonly IApplicationConfigurationManager manager;

        public SapHealthCheck(IApplicationConfigurationManager manager)
        {
            this.manager = manager;
        }

        public async Task<HealthCheckResult> CheckHealthAsync(
            HealthCheckContext context, CancellationToken cancellationToken = default)
        {
            try
            {
                var response = await this.manager.GetApplicationConfig();
                return response != null
                    ? HealthCheckResult.Healthy()
                    : HealthCheckResult.Unhealthy("SAP API not reachable");
            }
            catch (Exception ex)
            {
                return HealthCheckResult.Unhealthy("Error reaching SAP", ex);
            }
        }
    }
}
