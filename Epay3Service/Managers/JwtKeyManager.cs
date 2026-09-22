using System.Globalization;
using System.Security.Cryptography;
using Epay3Service.Configuration;
using Epay3Service.Helpers;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace Epay3Service.Managers;

public sealed class JwtKeyManager : IJwtKeyManager
{
    private const string CacheKey = "jwt_key_state";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(30);
    private static readonly TimeSpan OverlapWindow = TimeSpan.FromMinutes(65); // token TTL + 5 min
    private static readonly TimeSpan ForcedRefreshInterval = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan ClockSkewBuffer = TimeSpan.FromSeconds(30);

    private readonly IApplicationConfigurationManager _configManager;
    private readonly IMemoryCache _cache;
    private readonly ApplicationSecrets _appSecrets;
    private readonly ILogger<JwtKeyManager> _logger;
    private readonly byte[] _activeKek;
    private readonly byte[]? _previousKek;
    private readonly string _prefix;
    private readonly SemaphoreSlim _refreshLock = new(1, 1);

    private DateTime _lastForcedRefresh = DateTime.MinValue;
    private readonly object _forceLock = new();

    private sealed record JwtKeyState(
        byte[] ActiveKey,
        string ActiveKid,
        byte[]? PreviousKey,
        string? PreviousKid,
        DateTime? PreviousExpiry,
        DateTime? ActiveCreated
    );

    public JwtKeyManager(
        IApplicationConfigurationManager configManager,
        IMemoryCache cache,
        ApplicationSecrets appSecrets,
        ILogger<JwtKeyManager> logger)
    {
        _configManager = configManager;
        _cache = cache;
        _appSecrets = appSecrets;
        _logger = logger;

        // Fail closed at startup if KEK is missing or wrong length
        _activeKek = AesGcmKeyHelper.LoadKek("CP_KEK");
        _previousKek = AesGcmKeyHelper.TryLoadKek("CP_KEK_PREVIOUS");

        _prefix = Environment.GetEnvironmentVariable("JWT_KEY_PREFIX") ?? string.Empty;
        if (string.IsNullOrEmpty(_prefix))
            _logger.LogWarning(
                "JWT_KEY_PREFIX is not set. All environments sharing the same SAP instance will " +
                "overwrite each other's JWT signing keys. Set a unique prefix per environment (e.g. 'DEV_', 'DEMO_').");
    }

    // Namespaces every SAP AppValues key so environments sharing a SAP instance don't collide.
    private string K(string name) => _prefix + name;

    public async Task<(byte[] Key, string Kid)> GetActiveKeyAsync()
    {
        if (_cache.TryGetValue<JwtKeyState>(CacheKey, out var state) && state != null)
            return (state.ActiveKey, state.ActiveKid);

        await RefreshFromSapAsync();

        state = _cache.Get<JwtKeyState>(CacheKey)
            ?? throw new InvalidOperationException("JWT signing key unavailable after SAP refresh.");
        return (state.ActiveKey, state.ActiveKid);
    }

    public async Task<IEnumerable<SecurityKey>> GetValidationKeysAsync(string? kid)
    {
        var state = _cache.Get<JwtKeyState>(CacheKey);
        var key = ResolveKey(state, kid);
        if (key != null) return [key];

        // On unknown kid — force one SAP refresh (rate-limited) before failing
        if (IsWellFormedKid(kid) && ShouldForceRefresh())
        {
            try
            {
                await RefreshFromSapAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "SAP unavailable during JWT key refresh — returning empty key set.");
                return [];
            }
            state = _cache.Get<JwtKeyState>(CacheKey);
            key = ResolveKey(state, kid);
            if (key != null) return [key];
        }

        return [];
    }

    public async Task RotateKeysAsync()
    {
        var values = await _configManager.GetValues(refresh: true);
        var activeRaw = GetValue(values, K("JWT_KEY_ACTIVE"));
        var previousExpiry = ParseExpiry(GetValue(values, K("JWT_KEY_PREVIOUS_EXPIRY")));

        // Guard: refuse rotation while the previous key's overlap window is still live
        if (previousExpiry.HasValue && previousExpiry.Value > DateTime.UtcNow)
            throw new InvalidOperationException(
                $"Previous key overlap window is still active until {previousExpiry.Value:u}. " +
                "Retry after the window expires.");

        if (string.IsNullOrEmpty(activeRaw))
        {
            await BootstrapAsync();
        }
        else
        {
            var (activeKid, activeCipher) = ParseKidCipher(activeRaw, GetValue(values, K("JWT_KEY_ACTIVE_KID")));
            var newKid = IncrementKid(activeKid);
            var newSigningKey = RandomNumberGenerator.GetBytes(64);
            var newCipher = AesGcmKeyHelper.Protect(newSigningKey, _activeKek);

            // Write order: previous records first, new active LAST (partial-write safety).
            // JWT_KEY_PREVIOUS stores combined "{kid}:{cipher}" so a mid-write reader always
            // gets a matched pair from a single field.
            await _configManager.UpdateAppValue(K("JWT_KEY_PREVIOUS"), FormatKidCipher(activeKid, activeCipher));
            await _configManager.UpdateAppValue(K("JWT_KEY_PREVIOUS_KID"), activeKid); // observability only
            await _configManager.UpdateAppValue(K("JWT_KEY_PREVIOUS_EXPIRY"),
                DateTime.UtcNow.Add(OverlapWindow).ToString("O"));
            // JWT_KEY_ACTIVE_KID written before the combined field (observability; logic reads from combined field)
            await _configManager.UpdateAppValue(K("JWT_KEY_ACTIVE_KID"), newKid);
            await _configManager.UpdateAppValue(K("JWT_KEY_ACTIVE_CREATED"), DateTime.UtcNow.ToString("O"));
            // JWT_KEY_ACTIVE written LAST: combined "{kid}:{cipher}" ensures kid and key bytes
            // are always read as a matched pair — eliminates the mid-write reader race.
            await _configManager.UpdateAppValue(K("JWT_KEY_ACTIVE"), FormatKidCipher(newKid, newCipher));

            _logger.LogInformation("JWT signing key rotated. New kid: {NewKid}. Previous kid: {PreviousKid} expires at {Expiry:u}.",
                newKid, activeKid, DateTime.UtcNow.Add(OverlapWindow));
        }

        _cache.Remove(CacheKey);
    }

    public async Task RefreshFromSapAsync()
    {
        await _refreshLock.WaitAsync();
        try
        {
            var values = await _configManager.GetValues(refresh: true);
            var activeRaw = GetValue(values, K("JWT_KEY_ACTIVE"));

            if (string.IsNullOrEmpty(activeRaw))
            {
                // First run in this environment — bootstrap
                await BootstrapAsync();
                values = await _configManager.GetValues(refresh: true);
                activeRaw = GetValue(values, K("JWT_KEY_ACTIVE"));
            }

            // Parse combined "{kid}:{cipher}" or fall back to legacy separate fields.
            var (activeKid, activeCipher) = ParseKidCipher(activeRaw!, GetValue(values, K("JWT_KEY_ACTIVE_KID")));

            // Fail closed: store is non-empty but no KEK can decrypt it
            var activeKey = DecryptWithAnyKek(activeCipher)
                ?? throw new InvalidOperationException(
                    $"CP_KEK cannot decrypt {K("JWT_KEY_ACTIVE")}. " +
                    "Possible causes: wrong KEK, tampered record, or out-of-order KEK rotation. " +
                    "The application will not start until the KEK matches the stored key.");

            var activeCreated = ParseExpiry(GetValue(values, K("JWT_KEY_ACTIVE_CREATED")));
            var previousRaw = GetValue(values, K("JWT_KEY_PREVIOUS"));
            var previousExpiry = ParseExpiry(GetValue(values, K("JWT_KEY_PREVIOUS_EXPIRY")));

            string? previousKid = null;
            byte[]? previousKey = null;

            if (!string.IsNullOrEmpty(previousRaw) && previousExpiry.HasValue)
            {
                if (previousExpiry.Value > DateTime.UtcNow.Subtract(ClockSkewBuffer))
                {
                    var (parsedPrevKid, parsedPrevCipher) =
                        ParseKidCipher(previousRaw, GetValue(values, K("JWT_KEY_PREVIOUS_KID")));
                    previousKid = parsedPrevKid;
                    previousKey = DecryptWithAnyKek(parsedPrevCipher);
                }
                else
                {
                    // Overlap window expired — clean up from the store (lazy cleanup, no background job)
                    _logger.LogInformation("JWT_KEY_PREVIOUS overlap window expired. Removing from SAP AppValues.");
                    await _configManager.UpdateAppValue(K("JWT_KEY_PREVIOUS"), null);
                    await _configManager.UpdateAppValue(K("JWT_KEY_PREVIOUS_KID"), null);
                    await _configManager.UpdateAppValue(K("JWT_KEY_PREVIOUS_EXPIRY"), null);
                }
            }

            var state = new JwtKeyState(activeKey, activeKid, previousKey, previousKid, previousExpiry, activeCreated);
            _cache.Set(CacheKey, state, CacheTtl);

            _logger.LogDebug("JWT key state refreshed from SAP. ActiveKid: {ActiveKid}. PreviousKid: {PreviousKid}.",
                activeKid, previousKid);
        }
        finally
        {
            _refreshLock.Release();
        }
    }

    public async Task<bool> IsRotationDueAsync(TimeSpan rotationDuration)
    {
        if (_cache.TryGetValue<JwtKeyState>(CacheKey, out var state) && state?.ActiveCreated.HasValue == true)
            return DateTime.UtcNow - state.ActiveCreated.Value >= rotationDuration;

        await RefreshFromSapAsync();
        state = _cache.Get<JwtKeyState>(CacheKey);
        return state?.ActiveCreated.HasValue == true &&
               DateTime.UtcNow - state.ActiveCreated!.Value >= rotationDuration;
    }

    private async Task BootstrapAsync()
    {
        // Bootstrap from KEK via HKDF so all replicas sharing the same KEK produce identical
        // key bytes. The bootstrap race becomes harmless because last-writer-wins still produces
        // a ciphertext that decrypts to the same signing key.
        byte[] signingKey = HKDF.DeriveKey(HashAlgorithmName.SHA512, _activeKek, 64, salt: null,
            info: "jwt-bootstrap"u8.ToArray());

        var cipher = AesGcmKeyHelper.Protect(signingKey, _activeKek);
        // Store kid and cipher in a single field so readers always get a matched pair.
        await _configManager.UpdateAppValue(K("JWT_KEY_ACTIVE"), FormatKidCipher("v1", cipher));
        await _configManager.UpdateAppValue(K("JWT_KEY_ACTIVE_KID"), "v1"); // observability only
        await _configManager.UpdateAppValue(K("JWT_KEY_ACTIVE_CREATED"), DateTime.UtcNow.ToString("O"));
        await _configManager.UpdateAppValue(K("JWT_KEY_PREVIOUS"), null);
        await _configManager.UpdateAppValue(K("JWT_KEY_PREVIOUS_KID"), null);
        await _configManager.UpdateAppValue(K("JWT_KEY_PREVIOUS_EXPIRY"), null);

        _logger.LogInformation("JWT signing key bootstrapped into SAP AppValues (kid: v1).");
    }

    private byte[]? DecryptWithAnyKek(string cipher)
    {
        try { return AesGcmKeyHelper.Unprotect(cipher, _activeKek); }
        catch { /* fall through to previous KEK */ }

        if (_previousKek != null)
        {
            try { return AesGcmKeyHelper.Unprotect(cipher, _previousKek); }
            catch { /* both KEKs failed */ }
        }

        return null;
    }

    private static SymmetricSecurityKey? ResolveKey(JwtKeyState? state, string? kid)
    {
        if (state == null || string.IsNullOrEmpty(kid)) return null;

        if (string.Equals(kid, state.ActiveKid, StringComparison.Ordinal))
            return new SymmetricSecurityKey(state.ActiveKey) { KeyId = kid };

        if (string.Equals(kid, state.PreviousKid, StringComparison.Ordinal)
            && state.PreviousKey != null
            && state.PreviousExpiry.HasValue
            && state.PreviousExpiry.Value > DateTime.UtcNow.Subtract(ClockSkewBuffer))
            return new SymmetricSecurityKey(state.PreviousKey) { KeyId = kid };

        return null;
    }

    private bool ShouldForceRefresh()
    {
        lock (_forceLock)
        {
            if (DateTime.UtcNow - _lastForcedRefresh < ForcedRefreshInterval) return false;
            _lastForcedRefresh = DateTime.UtcNow;
            return true;
        }
    }

    private static bool IsWellFormedKid(string? kid) =>
        kid != null && System.Text.RegularExpressions.Regex.IsMatch(kid, @"^v\d+$");

    private static string IncrementKid(string kid) =>
        int.TryParse(kid.TrimStart('v'), out int n) ? $"v{n + 1}" : "v1";

    private static string? GetValue(List<AppValue> values, string key) =>
        values.FirstOrDefault(v => string.Equals(v.Key, key, StringComparison.OrdinalIgnoreCase))?.Value;

    private static DateTime? ParseExpiry(string? value)
    {
        if (string.IsNullOrEmpty(value)) return null;
        return DateTime.TryParse(value, null, DateTimeStyles.RoundtripKind, out var dt) ? dt : null;
    }

    // Stores kid and cipher as a single SAP field: "{kid}:{cipher}"
    // A single-field write is effectively atomic — eliminates the mid-write race where a reader
    // could see kid=v2 but the old cipher because the two writes straddle a cache refresh.
    private static string FormatKidCipher(string kid, string cipher) => $"{kid}:{cipher}";

    // Parses "{kid}:{cipher}" or falls back to legacy format (bare base64 cipher, kid in a separate field).
    // The regex guards against base64 strings that happen to contain ':' being mis-parsed as a kid prefix.
    private static (string Kid, string Cipher) ParseKidCipher(string raw, string? legacyKid)
    {
        var idx = raw.IndexOf(':');
        if (idx > 0 && System.Text.RegularExpressions.Regex.IsMatch(raw[..idx], @"^v\d+$"))
            return (raw[..idx], raw[(idx + 1)..]);
        // Legacy format: bare base64 cipher with kid stored in a separate SAP field
        return (legacyKid ?? "v1", raw);
    }
}
