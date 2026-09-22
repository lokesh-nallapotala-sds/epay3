using System.Security.Cryptography;
using Epay3Service.Managers.Interfaces;
using Microsoft.Extensions.Caching.Memory;

namespace Epay3Service.Managers;

public class TokenService : ITokenService {
    private const int DEFAULT_TOKEN_TIMEOUT_SECONDS = 60 * 30 * 24;

    private static readonly TimeSpan DEFAULT_TOKEN_TIMEOUT_SPAN =
        TimeSpan.FromSeconds(DEFAULT_TOKEN_TIMEOUT_SECONDS);

    public Task<string> GenerateRefreshToken(int size = 32) {
        var randomNumber = new byte[size];
        using (var rng = RandomNumberGenerator.Create()) {
            rng.GetBytes(randomNumber);
            var token = Convert.ToBase64String(randomNumber);
            return Task.FromResult(token);
        }
    }

    public Task SaveRefreshToken(string userId, string refreshToken) {
        MemoryCacheEntryOptions cacheEntryOptions = new MemoryCacheEntryOptions()
            // Keep in cache for this time, reset time if accessed.
            .SetSlidingExpiration(DEFAULT_TOKEN_TIMEOUT_SPAN);

        // Save data in cache.
        this.TokenCache.Set(refreshToken, userId, cacheEntryOptions);

        return Task.CompletedTask;
    }

    public Task<bool> GetUserIdFromRefreshToken(string refreshToken, out string userId) {
        var result = this.TokenCache.TryGetValue(refreshToken, out userId);
        return Task.FromResult(result);
    }

    #region TokenCache

    private readonly object _tokenCacheSync = new();
    private IMemoryCache _tokenCache;

    private IMemoryCache TokenCache {
        get {
            if (this._tokenCache == null) {
                lock (this._tokenCacheSync) {
                    if (this._tokenCache == null) {
                        this._tokenCache = new MemoryCache(new MemoryCacheOptions());
                    }
                }
            }

            return this._tokenCache;
        }
    }

    #endregion
}
