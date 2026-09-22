using System.Security.Cryptography;
using Epay3Service.Helpers;

namespace Epay3Service.Tests.Helpers;

public class AesGcmKeyHelperTests
{
    private static readonly byte[] Kek = new byte[32];
    private static readonly byte[] OtherKek = Enumerable.Repeat((byte)0xFF, 32).ToArray();

    [Fact]
    public void Protect_Unprotect_RoundTrip_ReturnsOriginalBytes()
    {
        var plainKey = RandomNumberGenerator.GetBytes(64);
        var cipher = AesGcmKeyHelper.Protect(plainKey, Kek);
        var recovered = AesGcmKeyHelper.Unprotect(cipher, Kek);
        Assert.Equal(plainKey, recovered);
    }

    [Fact]
    public void Protect_TwoCalls_SamePlaintext_ProduceDifferentCiphertext()
    {
        var plainKey = new byte[64];
        var c1 = AesGcmKeyHelper.Protect(plainKey, Kek);
        var c2 = AesGcmKeyHelper.Protect(plainKey, Kek);
        Assert.NotEqual(c1, c2); // fresh nonce each call
    }

    [Fact]
    public void Unprotect_WrongKek_ThrowsCryptographicException()
    {
        var cipher = AesGcmKeyHelper.Protect(new byte[64], Kek);
        // .NET 8 throws AuthenticationTagMismatchException, which is a subclass of CryptographicException
        Assert.ThrowsAny<CryptographicException>(() => AesGcmKeyHelper.Unprotect(cipher, OtherKek));
    }

    [Fact]
    public void Unprotect_TamperedCiphertext_ThrowsCryptographicException()
    {
        var cipher = AesGcmKeyHelper.Protect(new byte[64], Kek);
        var bytes = Convert.FromBase64String(cipher);
        bytes[15] ^= 0xFF; // flip a bit in the ciphertext body
        // .NET 8 throws AuthenticationTagMismatchException, which is a subclass of CryptographicException
        Assert.ThrowsAny<CryptographicException>(() =>
            AesGcmKeyHelper.Unprotect(Convert.ToBase64String(bytes), Kek));
    }

    [Theory]
    [InlineData(16)]
    [InlineData(32)]
    [InlineData(64)]
    public void Protect_Unprotect_WorksForVariousKeyLengths(int length)
    {
        var plainKey = RandomNumberGenerator.GetBytes(length);
        var cipher = AesGcmKeyHelper.Protect(plainKey, Kek);
        Assert.Equal(plainKey, AesGcmKeyHelper.Unprotect(cipher, Kek));
    }

    [Fact]
    public void LoadKek_Throws_WhenEnvVarAbsent()
    {
        const string var_ = "CP_KEK_TEST_ABSENT_XYZ";
        Environment.SetEnvironmentVariable(var_, null);
        var ex = Assert.Throws<InvalidOperationException>(() => AesGcmKeyHelper.LoadKek(var_));
        Assert.Contains(var_, ex.Message);
    }

    [Fact]
    public void LoadKek_Throws_WhenDecodesToWrongLength()
    {
        const string var_ = "CP_KEK_TEST_SHORT_XYZ";
        Environment.SetEnvironmentVariable(var_, Convert.ToBase64String(new byte[16]));
        try
        {
            var ex = Assert.Throws<InvalidOperationException>(() => AesGcmKeyHelper.LoadKek(var_));
            Assert.Contains("32 bytes", ex.Message);
        }
        finally { Environment.SetEnvironmentVariable(var_, null); }
    }

    [Fact]
    public void LoadKek_ReturnsBytes_WhenValid()
    {
        const string var_ = "CP_KEK_TEST_VALID_XYZ";
        var kek = RandomNumberGenerator.GetBytes(32);
        Environment.SetEnvironmentVariable(var_, Convert.ToBase64String(kek));
        try
        {
            Assert.Equal(kek, AesGcmKeyHelper.LoadKek(var_));
        }
        finally { Environment.SetEnvironmentVariable(var_, null); }
    }

    [Fact]
    public void TryLoadKek_ReturnsNull_WhenEnvVarAbsent()
    {
        const string var_ = "CP_KEK_TEST_TRYLOAD_ABSENT_XYZ";
        Environment.SetEnvironmentVariable(var_, null);
        Assert.Null(AesGcmKeyHelper.TryLoadKek(var_));
    }

    [Fact]
    public void TryLoadKek_Throws_WhenPresentButWrongLength()
    {
        const string var_ = "CP_KEK_TEST_TRYLOAD_SHORT_XYZ";
        Environment.SetEnvironmentVariable(var_, Convert.ToBase64String(new byte[16]));
        try
        {
            Assert.Throws<InvalidOperationException>(() => AesGcmKeyHelper.TryLoadKek(var_));
        }
        finally { Environment.SetEnvironmentVariable(var_, null); }
    }

    [Fact]
    public void TryLoadKek_ReturnsBytes_WhenValid()
    {
        const string var_ = "CP_KEK_TEST_TRYLOAD_VALID_XYZ";
        var kek = RandomNumberGenerator.GetBytes(32);
        Environment.SetEnvironmentVariable(var_, Convert.ToBase64String(kek));
        try
        {
            Assert.Equal(kek, AesGcmKeyHelper.TryLoadKek(var_));
        }
        finally { Environment.SetEnvironmentVariable(var_, null); }
    }
}
