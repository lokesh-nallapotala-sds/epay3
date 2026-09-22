using System.Security.Cryptography;

namespace Epay3Service.Helpers;

public static class AesGcmKeyHelper
{
    // Returns base64(12-byte nonce || ciphertext || 16-byte GCM tag)
    public static string Protect(byte[] plainKey, byte[] kek)
    {
        var nonce = RandomNumberGenerator.GetBytes(12);
        var ct = new byte[plainKey.Length];
        var tag = new byte[16];
        using var gcm = new AesGcm(kek, tag.Length);
        gcm.Encrypt(nonce, plainKey, ct, tag);
        return Convert.ToBase64String([.. nonce, .. ct, .. tag]);
    }

    // Decrypts a value produced by Protect. Throws CryptographicException on wrong KEK or tampered ciphertext.
    public static byte[] Unprotect(string stored, byte[] kek)
    {
        var b = Convert.FromBase64String(stored);
        var pt = new byte[b.Length - 28]; // 12 nonce + 16 tag = 28 overhead
        using var gcm = new AesGcm(kek, 16);
        gcm.Decrypt(b[..12], b[12..^16], b[^16..], pt);
        return pt;
    }

    // Throws InvalidOperationException when the env var is absent or not exactly 32 bytes.
    public static byte[] LoadKek(string varName)
    {
        var b64 = Environment.GetEnvironmentVariable(varName);
        if (string.IsNullOrEmpty(b64))
            throw new InvalidOperationException($"Environment variable '{varName}' is not set. " +
                "Supply a base64-encoded 32-byte key (openssl rand -base64 32).");
        var kek = Convert.FromBase64String(b64);
        if (kek.Length != 32)
            throw new InvalidOperationException($"'{varName}' must decode to exactly 32 bytes (got {kek.Length}).");
        return kek;
    }

    // Returns null when the env var is absent. Throws if present but wrong length.
    public static byte[]? TryLoadKek(string varName)
    {
        var b64 = Environment.GetEnvironmentVariable(varName);
        if (string.IsNullOrEmpty(b64)) return null;
        var kek = Convert.FromBase64String(b64);
        if (kek.Length != 32)
            throw new InvalidOperationException($"'{varName}' must decode to exactly 32 bytes (got {kek.Length}).");
        return kek;
    }
}
