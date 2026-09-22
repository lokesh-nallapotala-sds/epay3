using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Cryptography.KeyDerivation;

namespace Epay3Service.Helpers;

public static class Hash
{
    public static string Create(string value, string salt)
    {
        var valueBytes = KeyDerivation.Pbkdf2(
                            password: value,
                            salt: Encoding.UTF8.GetBytes(salt),
                            prf: KeyDerivationPrf.HMACSHA512,
                            iterationCount: 10000,
                            numBytesRequested: 256 / 8);

        return Convert.ToBase64String(valueBytes);
    }

    public static bool Validate(string value, string salt, string hash)
        => Create(value, salt) == hash;

    public static bool IsComplex(string password)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < 8) return false;
        return Regex.IsMatch(password, @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$");
    }
}
