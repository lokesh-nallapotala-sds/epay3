using Epay3Service.Configuration;
using Epay3Service.Helpers;
using Epay3Service.Managers;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.IdentityModel.Tokens;
using Moq;

namespace Epay3Service.Tests.Managers;

public class JwtKeyManagerTests : IDisposable
{
    private static readonly byte[] TestKek = new byte[32];
    private static readonly string TestKekBase64 = Convert.ToBase64String(TestKek);

    private readonly IMemoryCache _cache;
    private readonly Mock<IApplicationConfigurationManager> _mockConfig;
    private readonly ApplicationSecrets _appSecrets;

    public JwtKeyManagerTests()
    {
        Environment.SetEnvironmentVariable("CP_KEK", TestKekBase64);
        Environment.SetEnvironmentVariable("CP_KEK_PREVIOUS", null);
        _cache = new MemoryCache(new MemoryCacheOptions());
        _mockConfig = new Mock<IApplicationConfigurationManager>();
        _appSecrets = new ApplicationSecrets
        {
            RegistrationKey = "",
            EncryptionKey = "x",
            CvvEncryptionKey = "x",
            RequestsTokenKey = "x"
        };
    }

    public void Dispose()
    {
        Environment.SetEnvironmentVariable("CP_KEK", null);
        _cache.Dispose();
    }

    private JwtKeyManager CreateManager() =>
        new(_mockConfig.Object, _cache, _appSecrets, NullLogger<JwtKeyManager>.Instance);

    private static string Wrap(byte[] key) => AesGcmKeyHelper.Protect(key, TestKek);

    // Produces combined "{kid}:{cipher}" format that matches the production write path.
    private static List<AppValue> MakeValues(
        string activeCipher, string activeKid,
        string? prevCipher = null, string? prevKid = null, DateTime? prevExpiry = null)
    {
        var list = new List<AppValue>
        {
            new() { Key = "JWT_KEY_ACTIVE", Value = $"{activeKid}:{activeCipher}" },
            new() { Key = "JWT_KEY_ACTIVE_KID", Value = activeKid }
        };
        if (prevCipher != null && prevKid != null)
            list.Add(new() { Key = "JWT_KEY_PREVIOUS", Value = $"{prevKid}:{prevCipher}" });
        if (prevKid != null) list.Add(new() { Key = "JWT_KEY_PREVIOUS_KID", Value = prevKid });
        if (prevExpiry.HasValue)
            list.Add(new() { Key = "JWT_KEY_PREVIOUS_EXPIRY", Value = prevExpiry.Value.ToString("O") });
        return list;
    }

    // ── GetActiveKeyAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task GetActiveKeyAsync_ReturnsCachedState_WithoutSapCall()
    {
        var key = new byte[64]; key[0] = 0xAA;
        _mockConfig.Setup(m => m.GetValues(It.IsAny<bool>())).ReturnsAsync(MakeValues(Wrap(key), "v1"));

        var manager = CreateManager();
        await manager.RefreshFromSapAsync(); // warm the cache

        _mockConfig.Reset(); // SAP must NOT be hit again on a cache hit

        var (k, kid) = await manager.GetActiveKeyAsync();
        Assert.Equal(key, k);
        Assert.Equal("v1", kid);
        _mockConfig.Verify(m => m.GetValues(It.IsAny<bool>()), Times.Never);
    }

    [Fact]
    public async Task GetActiveKeyAsync_RefreshesFromSap_OnCacheMiss()
    {
        var key = new byte[64]; key[0] = 0xBB;
        _mockConfig.Setup(m => m.GetValues(It.IsAny<bool>())).ReturnsAsync(MakeValues(Wrap(key), "v2"));

        var manager = CreateManager();
        var (k, kid) = await manager.GetActiveKeyAsync(); // no prior warm-up

        Assert.Equal(key, k);
        Assert.Equal("v2", kid);
    }

    // ── GetValidationKeysAsync ───────────────────────────────────────────────

    [Fact]
    public async Task GetValidationKeysAsync_ReturnsActiveKey_ForActiveKid()
    {
        var key = new byte[64]; key[0] = 0xCC;
        _mockConfig.Setup(m => m.GetValues(It.IsAny<bool>())).ReturnsAsync(MakeValues(Wrap(key), "v1"));

        var manager = CreateManager();
        await manager.RefreshFromSapAsync();

        var keys = (await manager.GetValidationKeysAsync("v1")).ToList();

        Assert.Single(keys);
        var secKey = Assert.IsType<SymmetricSecurityKey>(keys[0]);
        Assert.Equal(key, secKey.Key);
        Assert.Equal("v1", secKey.KeyId);
    }

    [Fact]
    public async Task GetValidationKeysAsync_ReturnsPreviousKey_WhenWithinOverlapWindow()
    {
        var activeKey = new byte[64]; activeKey[0] = 0x01;
        var prevKey = new byte[64]; prevKey[0] = 0x02;

        _mockConfig.Setup(m => m.GetValues(It.IsAny<bool>())).ReturnsAsync(
            MakeValues(Wrap(activeKey), "v2", Wrap(prevKey), "v1", DateTime.UtcNow.AddMinutes(60)));

        var manager = CreateManager();
        await manager.RefreshFromSapAsync();

        var keys = (await manager.GetValidationKeysAsync("v1")).ToList();

        Assert.Single(keys);
        var secKey = Assert.IsType<SymmetricSecurityKey>(keys[0]);
        Assert.Equal(prevKey, secKey.Key);
        Assert.Equal("v1", secKey.KeyId);
    }

    [Fact]
    public async Task GetValidationKeysAsync_ReturnsEmpty_WhenPreviousWindowExpired()
    {
        var activeKey = new byte[64];
        var prevKey = new byte[64]; prevKey[0] = 0x02;

        _mockConfig.Setup(m => m.GetValues(It.IsAny<bool>())).ReturnsAsync(
            MakeValues(Wrap(activeKey), "v2", Wrap(prevKey), "v1", DateTime.UtcNow.AddMinutes(-10)));
        _mockConfig.Setup(m => m.UpdateAppValue(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        var manager = CreateManager();
        await manager.RefreshFromSapAsync(); // expired key cleaned up here

        var keys = (await manager.GetValidationKeysAsync("v1")).ToList();
        Assert.Empty(keys);
    }

    [Fact]
    public async Task GetValidationKeysAsync_ReturnsEmpty_ForCompletelyUnknownKid()
    {
        var key = new byte[64];
        _mockConfig.Setup(m => m.GetValues(It.IsAny<bool>())).ReturnsAsync(MakeValues(Wrap(key), "v5"));

        var manager = CreateManager();
        await manager.RefreshFromSapAsync();

        // "v99" is not active or previous — returns empty
        var keys = (await manager.GetValidationKeysAsync("v99")).ToList();
        Assert.Empty(keys);
    }

    // ── RotateKeysAsync ──────────────────────────────────────────────────────

    [Fact]
    public async Task RotateKeysAsync_Throws_WhenPreviousOverlapWindowStillActive()
    {
        var activeKey = new byte[64];
        var prevKey = new byte[64];

        _mockConfig.Setup(m => m.GetValues(It.IsAny<bool>())).ReturnsAsync(
            MakeValues(Wrap(activeKey), "v1", Wrap(prevKey), "v0", DateTime.UtcNow.AddMinutes(60)));

        var manager = CreateManager();
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => manager.RotateKeysAsync());
        Assert.Contains("overlap", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RotateKeysAsync_WritesNewActiveKeyLast()
    {
        var activeKey = new byte[64];
        _mockConfig.Setup(m => m.GetValues(It.IsAny<bool>())).ReturnsAsync(MakeValues(Wrap(activeKey), "v1"));

        var writeOrder = new List<string>();
        _mockConfig.Setup(m => m.UpdateAppValue(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string>()))
            .Callback<string, string?, string>((key, _, _) => writeOrder.Add(key))
            .Returns(Task.CompletedTask);

        var manager = CreateManager();
        await manager.RotateKeysAsync();

        Assert.Equal("JWT_KEY_ACTIVE", writeOrder.Last());
    }

    [Fact]
    public async Task RotateKeysAsync_IncrementsKid()
    {
        var activeKey = new byte[64];
        _mockConfig.Setup(m => m.GetValues(It.IsAny<bool>())).ReturnsAsync(MakeValues(Wrap(activeKey), "v1"));

        string? writtenKid = null;
        _mockConfig.Setup(m => m.UpdateAppValue(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string>()))
            .Callback<string, string?, string>((key, value, _) =>
            {
                if (key == "JWT_KEY_ACTIVE_KID") writtenKid = value;
            })
            .Returns(Task.CompletedTask);

        var manager = CreateManager();
        await manager.RotateKeysAsync();

        Assert.Equal("v2", writtenKid);
    }

    [Fact]
    public async Task RotateKeysAsync_WritesPreviousBeforeActive()
    {
        var activeKey = new byte[64];
        _mockConfig.Setup(m => m.GetValues(It.IsAny<bool>())).ReturnsAsync(MakeValues(Wrap(activeKey), "v3"));

        var writeOrder = new List<string>();
        _mockConfig.Setup(m => m.UpdateAppValue(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string>()))
            .Callback<string, string?, string>((key, _, _) => writeOrder.Add(key))
            .Returns(Task.CompletedTask);

        var manager = CreateManager();
        await manager.RotateKeysAsync();

        var activeIdx = writeOrder.IndexOf("JWT_KEY_ACTIVE");
        var prevIdx = writeOrder.IndexOf("JWT_KEY_PREVIOUS");
        Assert.True(prevIdx < activeIdx, "JWT_KEY_PREVIOUS must be written before JWT_KEY_ACTIVE");
    }

    // ── RefreshFromSapAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task RefreshFromSapAsync_ThrowsInvalidOperationException_WhenKekCannotDecrypt()
    {
        var wrongKek = Enumerable.Repeat((byte)0xFF, 32).ToArray();
        var cipher = AesGcmKeyHelper.Protect(new byte[64], wrongKek); // different KEK

        _mockConfig.Setup(m => m.GetValues(It.IsAny<bool>())).ReturnsAsync(MakeValues(cipher, "v1"));

        var manager = CreateManager();
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => manager.RefreshFromSapAsync());
        Assert.Contains("CP_KEK", ex.Message);
    }

    [Fact]
    public async Task RefreshFromSapAsync_CleansUpExpiredPreviousKey_InSap()
    {
        var activeKey = new byte[64];
        var prevKey = new byte[64];

        _mockConfig.Setup(m => m.GetValues(It.IsAny<bool>())).ReturnsAsync(
            MakeValues(Wrap(activeKey), "v2", Wrap(prevKey), "v1", DateTime.UtcNow.AddMinutes(-10)));
        _mockConfig.Setup(m => m.UpdateAppValue(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        var manager = CreateManager();
        await manager.RefreshFromSapAsync();

        _mockConfig.Verify(m => m.UpdateAppValue("JWT_KEY_PREVIOUS", null, It.IsAny<string>()), Times.Once);
        _mockConfig.Verify(m => m.UpdateAppValue("JWT_KEY_PREVIOUS_KID", null, It.IsAny<string>()), Times.Once);
        _mockConfig.Verify(m => m.UpdateAppValue("JWT_KEY_PREVIOUS_EXPIRY", null, It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task RefreshFromSapAsync_Bootstraps_WhenStoreIsEmpty()
    {
        string? capturedCipher = null;

        bool firstCall = true;
        _mockConfig.Setup(m => m.GetValues(It.IsAny<bool>()))
            .Returns(() =>
            {
                if (firstCall)
                {
                    firstCall = false;
                    return Task.FromResult(new List<AppValue>());
                }
                return Task.FromResult(new List<AppValue>
                {
                    new() { Key = "JWT_KEY_ACTIVE", Value = capturedCipher! },
                    new() { Key = "JWT_KEY_ACTIVE_KID", Value = "v1" }
                });
            });

        _mockConfig.Setup(m => m.UpdateAppValue(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string>()))
            .Callback<string, string?, string>((key, value, _) =>
            {
                if (key == "JWT_KEY_ACTIVE") capturedCipher = value;
            })
            .Returns(Task.CompletedTask);

        var manager = CreateManager();
        await manager.RefreshFromSapAsync();

        _mockConfig.Verify(m => m.UpdateAppValue("JWT_KEY_ACTIVE_KID", "v1", It.IsAny<string>()), Times.Once);
        Assert.NotNull(capturedCipher);
    }

    [Fact]
    public async Task RefreshFromSapAsync_CachesState_SoSubsequentGetDoesNotCallSap()
    {
        var key = new byte[64]; key[3] = 0xDE;
        _mockConfig.Setup(m => m.GetValues(It.IsAny<bool>())).ReturnsAsync(MakeValues(Wrap(key), "v1"));

        var manager = CreateManager();
        await manager.RefreshFromSapAsync();

        _mockConfig.Invocations.Clear();

        await manager.GetActiveKeyAsync();
        _mockConfig.Verify(m => m.GetValues(It.IsAny<bool>()), Times.Never);
    }

    // ── IsRotationDueAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task IsRotationDueAsync_ReturnsTrue_WhenDurationExceeded()
    {
        var key = new byte[64];
        var activeCreated = DateTime.UtcNow.AddDays(-8);
        var values = MakeValues(Wrap(key), "v1");
        values.Add(new() { Key = "JWT_KEY_ACTIVE_CREATED", Value = activeCreated.ToString("O") });
        _mockConfig.Setup(m => m.GetValues(It.IsAny<bool>())).ReturnsAsync(values);

        var manager = CreateManager();
        await manager.RefreshFromSapAsync();

        var due = await manager.IsRotationDueAsync(TimeSpan.FromDays(7));
        Assert.True(due);
    }

    [Fact]
    public async Task IsRotationDueAsync_ReturnsFalse_WhenDurationNotYetExceeded()
    {
        var key = new byte[64];
        var activeCreated = DateTime.UtcNow.AddDays(-1);
        var values = MakeValues(Wrap(key), "v1");
        values.Add(new() { Key = "JWT_KEY_ACTIVE_CREATED", Value = activeCreated.ToString("O") });
        _mockConfig.Setup(m => m.GetValues(It.IsAny<bool>())).ReturnsAsync(values);

        var manager = CreateManager();
        await manager.RefreshFromSapAsync();

        var due = await manager.IsRotationDueAsync(TimeSpan.FromDays(7));
        Assert.False(due);
    }

    [Fact]
    public async Task BootstrapAsync_WritesActiveCreated()
    {
        bool bootstrapCall = true;
        string? capturedCreated = null;

        _mockConfig.Setup(m => m.GetValues(It.IsAny<bool>()))
            .Returns(() =>
            {
                if (bootstrapCall)
                {
                    bootstrapCall = false;
                    return Task.FromResult(new List<AppValue>());
                }
                return Task.FromResult(new List<AppValue>
                {
                    new() { Key = "JWT_KEY_ACTIVE", Value = Wrap(new byte[64]) },
                    new() { Key = "JWT_KEY_ACTIVE_KID", Value = "v1" },
                    new() { Key = "JWT_KEY_ACTIVE_CREATED", Value = capturedCreated ?? DateTime.UtcNow.ToString("O") }
                });
            });

        _mockConfig.Setup(m => m.UpdateAppValue(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string>()))
            .Callback<string, string?, string>((key, value, _) =>
            {
                if (key == "JWT_KEY_ACTIVE_CREATED") capturedCreated = value;
            })
            .Returns(Task.CompletedTask);

        var manager = CreateManager();
        await manager.RefreshFromSapAsync();

        _mockConfig.Verify(m => m.UpdateAppValue("JWT_KEY_ACTIVE_CREATED", It.IsNotNull<string>(), It.IsAny<string>()), Times.Once);
        Assert.NotNull(capturedCreated);
    }

    [Fact]
    public async Task RotateKeysAsync_WritesActiveCreated()
    {
        var activeKey = new byte[64];
        _mockConfig.Setup(m => m.GetValues(It.IsAny<bool>())).ReturnsAsync(MakeValues(Wrap(activeKey), "v1"));

        string? capturedCreated = null;
        _mockConfig.Setup(m => m.UpdateAppValue(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string>()))
            .Callback<string, string?, string>((key, value, _) =>
            {
                if (key == "JWT_KEY_ACTIVE_CREATED") capturedCreated = value;
            })
            .Returns(Task.CompletedTask);

        var manager = CreateManager();
        await manager.RotateKeysAsync();

        Assert.NotNull(capturedCreated);
        Assert.True(DateTime.TryParse(capturedCreated, out var parsed));
        Assert.True((DateTime.UtcNow - parsed.ToUniversalTime()).TotalSeconds < 5);
    }

    // ── Concurrency race fixes ───────────────────────────────────────────────

    [Fact]
    public async Task BootstrapAsync_IsDeterministic_TwoReplicasProduceSameSigningKey()
    {
        // Both replicas see an empty SAP store and bootstrap independently.
        // BootstrapAsync derives the signing key from KEK via HKDF,
        // so last-writer-wins is harmless: both ciphertexts decrypt to the same 64-byte key.
        var secrets = new ApplicationSecrets { RegistrationKey = "", EncryptionKey = "x", CvvEncryptionKey = "x", RequestsTokenKey = "x" };

        async Task<byte[]> RunReplica()
        {
            var mock = new Mock<IApplicationConfigurationManager>();
            var callCount = 0;
            string? writtenActive = null;

            mock.Setup(m => m.GetValues(It.IsAny<bool>()))
                .Returns(() =>
                {
                    callCount++;
                    if (callCount == 1)
                        return Task.FromResult(new List<AppValue>());
                    return Task.FromResult(new List<AppValue>
                    {
                        new() { Key = "JWT_KEY_ACTIVE", Value = writtenActive! },
                        new() { Key = "JWT_KEY_ACTIVE_KID", Value = "v1" }
                    });
                });

            mock.Setup(m => m.UpdateAppValue(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string>()))
                .Callback<string, string?, string>((k, v, _) => { if (k == "JWT_KEY_ACTIVE") writtenActive = v; })
                .Returns(Task.CompletedTask);

            var mgr = new JwtKeyManager(mock.Object, new MemoryCache(new MemoryCacheOptions()), secrets, NullLogger<JwtKeyManager>.Instance);
            var (key, _) = await mgr.GetActiveKeyAsync();
            return key;
        }

        var key1 = await RunReplica();
        var key2 = await RunReplica();

        Assert.Equal(key1, key2);
    }

    [Fact]
    public async Task RefreshFromSapAsync_ReadsLegacyFormat_WhenJwtKeyActiveHasNoCombinedPrefix()
    {
        // Legacy: JWT_KEY_ACTIVE is bare base64 cipher; kid is in the separate JWT_KEY_ACTIVE_KID field.
        // ParseKidCipher must fall back gracefully so existing deployments aren't broken on upgrade.
        var signingKey = new byte[64]; signingKey[5] = 0xEE;
        var barecipher = Wrap(signingKey);  // no "v2:" prefix

        _mockConfig.Setup(m => m.GetValues(It.IsAny<bool>())).ReturnsAsync(new List<AppValue>
        {
            new() { Key = "JWT_KEY_ACTIVE", Value = barecipher },   // legacy format
            new() { Key = "JWT_KEY_ACTIVE_KID", Value = "v2" }      // kid stored separately
        });

        var manager = CreateManager();
        var (key, kid) = await manager.GetActiveKeyAsync();

        Assert.Equal(signingKey, key);
        Assert.Equal("v2", kid);
    }

    [Fact]
    public async Task RotateKeysAsync_WritesAndReadsBackCombinedField_Correctly()
    {
        // Simulate rotate then refresh: the combined field written by RotateKeysAsync
        // must be parseable back by RefreshFromSapAsync to give the correct new kid and key.
        var activeKey = new byte[64]; activeKey[0] = 0x11;
        _mockConfig.Setup(m => m.GetValues(It.IsAny<bool>())).ReturnsAsync(MakeValues(Wrap(activeKey), "v1"));

        string? writtenActiveField = null;
        _mockConfig.Setup(m => m.UpdateAppValue(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string>()))
            .Callback<string, string?, string>((k, v, _) => { if (k == "JWT_KEY_ACTIVE") writtenActiveField = v; })
            .Returns(Task.CompletedTask);

        var manager = CreateManager();
        await manager.RotateKeysAsync();

        // The written combined field should start with "v2:"
        Assert.NotNull(writtenActiveField);
        Assert.StartsWith("v2:", writtenActiveField);

        // Simulate a fresh replica reading back that combined field from SAP
        var cache2 = new MemoryCache(new MemoryCacheOptions());
        var mock2 = new Mock<IApplicationConfigurationManager>();
        mock2.Setup(m => m.GetValues(It.IsAny<bool>())).ReturnsAsync(new List<AppValue>
        {
            new() { Key = "JWT_KEY_ACTIVE", Value = writtenActiveField! },
            new() { Key = "JWT_KEY_ACTIVE_KID", Value = "v2" }
        });

        var mgr2 = new JwtKeyManager(mock2.Object, cache2, _appSecrets, NullLogger<JwtKeyManager>.Instance);
        var (_, kid) = await mgr2.GetActiveKeyAsync();

        Assert.Equal("v2", kid);
    }
}
