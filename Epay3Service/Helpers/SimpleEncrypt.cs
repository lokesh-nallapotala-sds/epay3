using System.Security.Cryptography;
using System.Text;

namespace Epay3Service.Helpers;

public class SimpleEncrypt
{
    public static string EncryptString(string plainText, string key)
    {
        using var aes = Aes.Create();
        aes.Key = Encoding.UTF8.GetBytes(key);
        aes.GenerateIV();

        using var ms = new MemoryStream();
        ms.Write(aes.IV, 0, aes.IV.Length);

        using (var cs = new CryptoStream(ms, aes.CreateEncryptor(), CryptoStreamMode.Write))
        using (var sw = new StreamWriter(cs))
            sw.Write(plainText);

        return "v2:" + Convert.ToBase64String(ms.ToArray());
    }

    public static string DecryptString(string cipherText, string keyString)
    {
        if (cipherText.StartsWith("v2:", StringComparison.Ordinal))
        {
            byte[] data = Convert.FromBase64String(cipherText[3..]);
            byte[] iv = data[..16];
            byte[] cipher = data[16..];

            using var aes = Aes.Create();
            aes.Key = Encoding.UTF8.GetBytes(keyString);
            aes.IV = iv;

            using var ms = new MemoryStream(cipher);
            using var cs = new CryptoStream(ms, aes.CreateDecryptor(), CryptoStreamMode.Read);
            using var sr = new StreamReader(cs);
            return sr.ReadToEnd();
        }

        // Legacy: zero-IV path for existing encrypted values
        byte[] legacyIv = new byte[16];
        byte[] legacyCipher = Convert.FromBase64String(cipherText);

        using var aesLegacy = Aes.Create();
        aesLegacy.Key = Encoding.UTF8.GetBytes(keyString);
        aesLegacy.IV = legacyIv;

        using var legacyMs = new MemoryStream(legacyCipher);
        using var legacyCs = new CryptoStream(legacyMs, aesLegacy.CreateDecryptor(), CryptoStreamMode.Read);
        using var legacySr = new StreamReader(legacyCs);
        return legacySr.ReadToEnd();
    }
}
