using Epay3Service.Models;

namespace Epay3Service.Extensions;

public static class AppValueExtensions
{
    public static string? GetValueOrDefault(this IEnumerable<AppValue> appValues, string key)
    {
        ArgumentNullException.ThrowIfNull(appValues);
        ArgumentException.ThrowIfNullOrWhiteSpace(key);

        return appValues.FirstOrDefault(x => string.Equals(x.Key, key, StringComparison.Ordinal))?.Value;
    }
}
