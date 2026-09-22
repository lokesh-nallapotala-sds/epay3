using Epay3Net.BackgroundServices;
using Epay3Service.Managers.Interfaces;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace Epay3Net.Tests.BackgroundServices;

public class JwtKeyRotationServiceTests : IDisposable
{
    private readonly Mock<IJwtKeyManager> _mockKeyManager;

    public JwtKeyRotationServiceTests()
    {
        _mockKeyManager = new Mock<IJwtKeyManager>();
        Environment.SetEnvironmentVariable("KEY_ROTATION_DURATION", null);
    }

    public void Dispose()
    {
        Environment.SetEnvironmentVariable("KEY_ROTATION_DURATION", null);
    }

    private JwtKeyRotationService CreateService() =>
        new(_mockKeyManager.Object, NullLogger<JwtKeyRotationService>.Instance);

    // ── ParseDuration ────────────────────────────────────────────────────────

    [Theory]
    [InlineData("7d", 7)]
    [InlineData("30d", 30)]
    [InlineData("1d", 1)]
    public void ParseDuration_ParsesDaySuffix(string input, int expectedDays)
    {
        var result = JwtKeyRotationService.ParseDuration(input);
        Assert.Equal(TimeSpan.FromDays(expectedDays), result);
    }

    [Theory]
    [InlineData("1h", 1)]
    [InlineData("24h", 24)]
    public void ParseDuration_ParsesHourSuffix(string input, int expectedHours)
    {
        var result = JwtKeyRotationService.ParseDuration(input);
        Assert.Equal(TimeSpan.FromHours(expectedHours), result);
    }

    [Fact]
    public void ParseDuration_ParsesSecondSuffix_ForTesting()
    {
        var result = JwtKeyRotationService.ParseDuration("30s");
        Assert.Equal(TimeSpan.FromSeconds(30), result);
    }

    [Fact]
    public void ParseDuration_FallsBackToTimeSpanParse()
    {
        var result = JwtKeyRotationService.ParseDuration("7.00:00:00");
        Assert.Equal(TimeSpan.FromDays(7), result);
    }

    [Fact]
    public void ParseDuration_Throws_OnInvalidValue()
    {
        Assert.ThrowsAny<Exception>(() => JwtKeyRotationService.ParseDuration("invalid"));
    }

    // ── ExecuteAsync ─────────────────────────────────────────────────────────

    [Fact]
    public async Task ExecuteAsync_DoesNothing_WhenEnvVarAbsent()
    {
        // KEY_ROTATION_DURATION is not set (cleared in constructor)
        var service = CreateService();

        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(200));
        await service.StartAsync(cts.Token);
        await service.StopAsync(CancellationToken.None);

        _mockKeyManager.Verify(m => m.IsRotationDueAsync(It.IsAny<TimeSpan>()), Times.Never);
        _mockKeyManager.Verify(m => m.RotateKeysAsync(), Times.Never);
    }

    [Fact]
    public async Task ExecuteAsync_CallsRotateKeysAsync_WhenDue()
    {
        // 10s duration → timer interval = 1s
        Environment.SetEnvironmentVariable("KEY_ROTATION_DURATION", "10s");

        var rotated = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);

        _mockKeyManager.Setup(m => m.IsRotationDueAsync(It.IsAny<TimeSpan>())).ReturnsAsync(true);
        _mockKeyManager.Setup(m => m.RotateKeysAsync())
            .Callback(() => rotated.TrySetResult(true))
            .Returns(Task.CompletedTask);

        var service = CreateService();

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        await service.StartAsync(cts.Token);

        var completed = await Task.WhenAny(rotated.Task, Task.Delay(TimeSpan.FromSeconds(5)));
        await service.StopAsync(CancellationToken.None);

        Assert.True(rotated.Task.IsCompletedSuccessfully, "RotateKeysAsync was not called within 5 seconds.");
    }

    [Fact]
    public async Task ExecuteAsync_SkipsRotation_WhenOverlapWindowActive()
    {
        Environment.SetEnvironmentVariable("KEY_ROTATION_DURATION", "10s");

        var skipSignal = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);

        _mockKeyManager.Setup(m => m.IsRotationDueAsync(It.IsAny<TimeSpan>())).ReturnsAsync(true);
        _mockKeyManager.Setup(m => m.RotateKeysAsync())
            .Callback(() => skipSignal.TrySetResult(true))
            .ThrowsAsync(new InvalidOperationException("Previous key overlap window is still active."));

        var service = CreateService();

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        await service.StartAsync(cts.Token);

        // Wait for the overlap exception to be hit (proves it doesn't crash the host)
        await Task.WhenAny(skipSignal.Task, Task.Delay(TimeSpan.FromSeconds(5)));
        await service.StopAsync(CancellationToken.None);

        // The service survived — no exception propagated
        Assert.True(skipSignal.Task.IsCompletedSuccessfully);
    }

    [Fact]
    public async Task ExecuteAsync_ContinuesRunning_WhenExceptionOccurs()
    {
        Environment.SetEnvironmentVariable("KEY_ROTATION_DURATION", "10s");

        var callCount = 0;
        var secondCallSignal = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);

        _mockKeyManager.Setup(m => m.IsRotationDueAsync(It.IsAny<TimeSpan>())).ReturnsAsync(true);
        _mockKeyManager.Setup(m => m.RotateKeysAsync())
            .Callback(() =>
            {
                callCount++;
                if (callCount >= 2) secondCallSignal.TrySetResult(true);
            })
            .Returns(() => callCount == 1
                ? Task.FromException(new Exception("Unexpected SAP error"))
                : Task.CompletedTask);

        var service = CreateService();

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(15));
        await service.StartAsync(cts.Token);

        // Service must survive the first failure and attempt rotation again
        await Task.WhenAny(secondCallSignal.Task, Task.Delay(TimeSpan.FromSeconds(8)));
        await service.StopAsync(CancellationToken.None);

        Assert.True(secondCallSignal.Task.IsCompletedSuccessfully,
            "Service did not continue running after an exception.");
    }
}
