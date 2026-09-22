using Microsoft.IdentityModel.Tokens;

namespace Epay3Service.Managers.Interfaces;

public interface IJwtKeyManager
{
    // Returns the active signing key and its kid for use when issuing new tokens.
    Task<(byte[] Key, string Kid)> GetActiveKeyAsync();

    // Returns the key(s) that should be tried when validating a token with the given kid.
    // On unknown kid triggers one lazy SAP refresh (rate-limited) before returning empty.
    Task<IEnumerable<SecurityKey>> GetValidationKeysAsync(string? kid);

    // Rotates the signing key: writes current active → previous, generates new active.
    // Throws InvalidOperationException when the previous overlap window is still live.
    Task RotateKeysAsync();

    // Reads JWT_KEY_* records from SAP AppValues, decrypts, and populates IMemoryCache.
    // Also bootstraps on first run and lazily cleans up expired previous keys.
    Task RefreshFromSapAsync();

    // Returns true when the active key has been in service at least rotationDuration.
    // Used by the background rotation service to decide when to rotate.
    Task<bool> IsRotationDueAsync(TimeSpan rotationDuration);
}
