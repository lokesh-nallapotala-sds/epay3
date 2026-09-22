using Epay3Service.Managers.Interfaces;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Epay3Net.BackgroundServices;

public sealed class JwtKeyRotationService : BackgroundService
{
    private readonly IJwtKeyManager _jwtKeyManager;
    private readonly ILogger<JwtKeyRotationService> _logger;

    public JwtKeyRotationService(IJwtKeyManager jwtKeyManager, ILogger<JwtKeyRotationService> logger)
    {
        _jwtKeyManager = jwtKeyManager;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var durationStr = Environment.GetEnvironmentVariable("KEY_ROTATION_DURATION");
        if (string.IsNullOrWhiteSpace(durationStr))
        {
            _logger.LogInformation("Auto-rotation disabled (KEY_ROTATION_DURATION not set).");
            return;
        }

        TimeSpan duration;
        try
        {
            duration = ParseDuration(durationStr);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Invalid KEY_ROTATION_DURATION value \"{Value}\". Auto-rotation disabled.", durationStr);
            return;
        }

        var checkInterval = TimeSpan.FromTicks(Math.Min(TimeSpan.FromHours(1).Ticks, duration.Ticks / 10));
        _logger.LogInformation(
            "JWT auto-rotation enabled. Duration: {Duration}. Check interval: {CheckInterval}.",
            duration, checkInterval);

        using var timer = new PeriodicTimer(checkInterval);
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    if (!await _jwtKeyManager.IsRotationDueAsync(duration))
                        continue;

                    await _jwtKeyManager.RotateKeysAsync();
                    _logger.LogInformation("JWT signing key auto-rotated.");
                }
                catch (InvalidOperationException ex) when (ex.Message.Contains("overlap"))
                {
                    _logger.LogInformation("JWT auto-rotation skipped — overlap window still active (another replica already rotated).");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "JWT auto-rotation failed. Will retry on next check interval.");
                }
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            _logger.LogDebug("JWT key rotation service is stopping.");
        }
    }

    public static TimeSpan ParseDuration(string value)
    {
        if (value.EndsWith('d') && int.TryParse(value[..^1], out int days))
            return TimeSpan.FromDays(days);

        if (value.EndsWith('h') && int.TryParse(value[..^1], out int hours))
            return TimeSpan.FromHours(hours);

        if (value.EndsWith('s') && int.TryParse(value[..^1], out int seconds))
            return TimeSpan.FromSeconds(seconds);

        return TimeSpan.Parse(value);
    }
}
