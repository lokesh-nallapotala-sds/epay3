namespace Epay3Net.RateLimiting;

public static class RateLimitPolicyNames
{
    public const string AuthSensitive = nameof(AuthSensitive);
    public const string GuestPayment = nameof(GuestPayment);
    public const string PublicConfig = nameof(PublicConfig);
    public const string SensitiveMutation = nameof(SensitiveMutation);
    public const string AuthenticatedApi = nameof(AuthenticatedApi);
    public const string CspReport = nameof(CspReport);
}
