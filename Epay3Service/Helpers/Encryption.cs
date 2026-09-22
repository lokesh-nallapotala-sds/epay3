using System.Security.Cryptography;
using System.Text;


namespace Epay3Service.Helpers;

public static class Encryption
{

    public static string Encrypt(string plainText, string key)
    {
        byte[] bytes = Encoding.UTF8.GetBytes(plainText);

        using (SymmetricAlgorithm crypt = Aes.Create())
        using (HashAlgorithm hash = SHA256.Create())
        using (MemoryStream memoryStream = new MemoryStream())
        {
            crypt.Key = hash.ComputeHash(Encoding.UTF8.GetBytes(key));
            crypt.GenerateIV();

            using (CryptoStream cryptoStream = new CryptoStream(
                memoryStream, crypt.CreateEncryptor(), CryptoStreamMode.Write))
            {
                cryptoStream.Write(bytes, 0, bytes.Length);
            }

            string base64Ciphertext = Convert.ToBase64String(memoryStream.ToArray());
            string base64IV = Convert.ToBase64String(crypt.IV);
            return "v2:" + $"{base64IV}!{base64Ciphertext}";
        }

    }

    public static string Decrypt(string cipherText, string key)
    {
        string payload = cipherText;
        bool isV2 = cipherText.StartsWith("v2:", StringComparison.Ordinal);

        if (isV2)
            payload = cipherText[3..];

        var cipherSplit = payload.Split('!');

        byte[] iv = Convert.FromBase64String(cipherSplit[0]);
        byte[] encryptedBytes = Convert.FromBase64String(cipherSplit[1]);

        using (SymmetricAlgorithm crypt = Aes.Create())
        using (HashAlgorithm hash = isV2 ? SHA256.Create() : MD5.Create())
        using (MemoryStream memoryStream = new MemoryStream(encryptedBytes))
        {
            crypt.Key = hash.ComputeHash(Encoding.UTF8.GetBytes(key));
            crypt.IV = iv;

            using (CryptoStream cryptoStream = new CryptoStream(
                memoryStream, crypt.CreateDecryptor(), CryptoStreamMode.Read))
            {
                using (var reader = new StreamReader(cryptoStream))
                {
                    return reader.ReadToEnd();
                }
            }
        }

    }

}
