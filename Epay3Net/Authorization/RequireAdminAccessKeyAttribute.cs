using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Epay3Net.Authorization;

/// <summary>
/// Requires a matching <c>?key=&lt;AdminAccess:Key&gt;</c> on the decorated action.
///
/// On a missing or mismatched key the request is short-circuited with <b>404</b>
/// (not 403) so the endpoint's existence is not revealed. The key is a SERVER-SIDE
/// shared secret (config <c>AdminAccess:Key</c>, overridable via the
/// <c>AdminAccess__Key</c> environment variable) and is never shipped to the client.
/// Comparison is constant-time. Fail-closed: if the key is not configured, the action
/// 404s for everyone.
///
/// This is the action-level counterpart to the <c>?key=</c> middleware that gates the
/// <c>/health</c> endpoint and the <c>/admin/recovery</c> page document. Apply it to
/// the break-glass recovery API actions, which are the real boundary.
///
/// NOTE: a query-string secret is recorded in server/proxy/access logs and can leak
/// via the Referer header — acceptable for rarely-used break-glass endpoints, but
/// rotate the key if it may have been exposed.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false)]
public sealed class RequireAdminAccessKeyAttribute : Attribute, IAuthorizationFilter
{
    private const string ConfigKeyName = "AdminAccess:Key";
    private const string QueryParamName = "key";

    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var configuration =
            context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();

        var expectedKey = configuration[ConfigKeyName];
        var providedKey = context.HttpContext.Request.Query[QueryParamName].ToString();

        bool keyMatches =
            !string.IsNullOrEmpty(expectedKey) &&
            !string.IsNullOrEmpty(providedKey) &&
            CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(providedKey),
                Encoding.UTF8.GetBytes(expectedKey));

        if (!keyMatches)
        {
            context.Result = new NotFoundResult();
        }
    }
}
