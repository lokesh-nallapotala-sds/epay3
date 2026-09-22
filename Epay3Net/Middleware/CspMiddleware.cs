using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace Epay3Net.Middleware;

public partial class CspMiddleware(RequestDelegate next, IOptions<CspSettings> cspSettings, IApplicationConfigurationManager appConfigmanager, IConfiguration configuration)
{
    private readonly RequestDelegate _next = next;
    private readonly CspSettings _cspSettings = cspSettings.Value;
    private readonly IApplicationConfigurationManager _appConfigmanager = appConfigmanager;
    private readonly IConfiguration _configuration = configuration;

    private string GetCspHeaderValue(string nonce, string reportUri)
    {
        StringBuilder csp = new StringBuilder()
            .Append($"default-src 'self';")
            .Append($"script-src 'self' 'nonce-{nonce}' 'strict-dynamic';")
            .Append($"script-src-elem {CombineSources(_cspSettings.ScriptSrcElemUrls, nonce, "'self'")};")
            .Append($"style-src {CombineSources(_cspSettings.StyleSrcUrls, nonce, "'self'")};")
            .Append($"style-src-elem {CombineSources(_cspSettings.StyleSrcUrls, nonce, "'self'")};")
            .Append($"style-src-attr 'unsafe-inline';")
            .Append($"font-src {CombineSources(_cspSettings.FontSrcUrls, null, "'self'")};")
            .Append($"img-src {CombineSources(_cspSettings.ImgSrcUrls, null, "'self'", "blob:")};")
            .Append($"connect-src {CombineSources(_cspSettings.ConnectSrcUrls, null, "'self'", "blob:")};")
            .Append($"frame-src {CombineSources(_cspSettings.FrameSrcUrls, null, "'self'")};")
            .Append($"form-action {CombineSources(_cspSettings.FormActionUrls, null, "'self'")};")
            .Append($"frame-ancestors 'none';")
            .Append($"worker-src 'self' blob:;")
            .Append($"base-uri 'self';");

        csp.Append("report-to csp-endpoint;");
        if (!string.IsNullOrEmpty(reportUri))
            csp.Append($"report-uri {reportUri};");

        return csp.ToString();
    }

    public async Task InvokeAsync(HttpContext context)
    {

        var nonceBytes = new byte[16];
        RandomNumberGenerator.Fill(nonceBytes);
        var nonce = Convert.ToBase64String(nonceBytes);

        context.Items["CSPNonce"] = nonce;
        var requestPath = context.Request.Path.Value;

        context.Response.OnStarting(() =>
        {
            var isApiRequest = context.Request.Path.StartsWithSegments("/api");
            var isHtmlResponse = context.Response.ContentType?.StartsWith("text/html", StringComparison.OrdinalIgnoreCase) == true;

            if (isApiRequest || isHtmlResponse)
            {
                context.Response.Headers.CacheControl = "no-store, no-cache, must-revalidate";
                context.Response.Headers.Pragma = "no-cache";
                context.Response.Headers.Expires = "0";
            }

            context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
            context.Response.Headers["X-Powered-By"] = string.Empty;
            return Task.CompletedTask;
        });

        if (requestPath != null && requestPath.StartsWith("/health"))
        {
            await _next(context);
            return;
        }

        var isStaticAsset = requestPath != null
            && Path.HasExtension(requestPath)
            && !requestPath.EndsWith(".html", StringComparison.OrdinalIgnoreCase);

        if (requestPath != null && !MyRegex1().IsMatch(requestPath) && !isStaticAsset)
        {
            var reportUrl = GetCspReportEndpoint(context);
            context.Response.Headers["Content-Security-Policy"] = GetCspHeaderValue(nonce, reportUrl);
            context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
            context.Response.Headers.Append("X-Frame-Options", "DENY");
            context.Response.Headers.Append("Referrer-Policy", "no-referrer");
            context.Response.Headers.Append("Permissions-Policy", "geolocation=(self \"https://*.cnbssoftware.com/\") ,microphone=(), camera=()");
            context.Response.Headers.Append("Reporting-Endpoints", $@"csp-endpoint=""{reportUrl}""");
        }

        if (context.Request.Headers.Accept.ToString().Contains("text/html") &&
              !context.Response.HasStarted &&
              !MyRegex().IsMatch(requestPath ?? string.Empty))
        {
            var indexPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "index.html");
            if (!File.Exists(indexPath))
            {
                await _next(context);
                return;
            }

            var indexHtml = await File.ReadAllTextAsync(indexPath);
            var nonceMeta = $"<meta name=\"csp-nonce\" content=\"{nonce}\">";
            indexHtml = indexHtml.Replace("</head>", nonceMeta + "</head>");

            // Automatically add nonce to existing script and style tags to support manual additions in index.html
            indexHtml = Regex.Replace(indexHtml, @"<script\b([^>]*)>", $"<script nonce=\"{nonce}\" $1>", RegexOptions.IgnoreCase);
            indexHtml = Regex.Replace(indexHtml, @"<style\b([^>]*)>", $"<style nonce=\"{nonce}\" $1>", RegexOptions.IgnoreCase);


            SapCustomData? config = null;
            try
            {
                config = await _appConfigmanager.GetCustomConfig("en", true);
            }
            catch
            { /* SAP unavailable — serve index.html without Worldpay scripts */
            }
            if (config != null)
            {
                var pluginBaseUrl = config.PaymentProviders.FirstOrDefault(p => p.Description == "Worldpay")?.InitializationUrl;
                if (!string.IsNullOrEmpty(pluginBaseUrl))
                {
                    string pluginPath = _configuration["WorldpayPluginPath"] ?? "/Scripts/XIPlugin/XIPlugin-1.2.0.js";
                    string xiframePath = _configuration["WorldpayXIFramePath"] ?? "/Scripts/XIFrame/XIFrame-1.2.0.js";
                    string pluginUrl = $"{pluginBaseUrl}{pluginPath}";
                    string xiframeUrl = $"{pluginBaseUrl}{xiframePath}";

                    // Remove manual Worldpay scripts if they exist to avoid duplication with injected ones
                    indexHtml = MyRegex2().Replace(indexHtml, string.Empty);

                    var xiframeScript = $"<script nonce='{nonce}' src='{xiframeUrl}'></script>";
                    var pluginScript = $"<script nonce='{nonce}' src='{pluginUrl}'></script>";
                    indexHtml = indexHtml.Replace("</body>", $"{xiframeScript}\n{pluginScript}\n</body>");
                }
            }

            context.Response.ContentType = "text/html";
            await context.Response.WriteAsync(indexHtml);
            return;
        }

        await _next(context);
    }

    private string GetCspReportEndpoint(HttpContext context)
    {
        var configuredEndpoint = _cspSettings.ReportEndpoint?.Trim();

        if (string.IsNullOrWhiteSpace(configuredEndpoint))
        {
            return $"{context.Request.Scheme}://{context.Request.Host}/api/cspreport";
        }

        if (Uri.TryCreate(configuredEndpoint, UriKind.Absolute, out var absoluteUri))
        {
            return absoluteUri.GetComponents(UriComponents.AbsoluteUri, UriFormat.UriEscaped);
        }

        var requestBaseUri = new Uri($"{context.Request.Scheme}://{context.Request.Host}");
        return new Uri(requestBaseUri, configuredEndpoint)
            .GetComponents(UriComponents.AbsoluteUri, UriFormat.UriEscaped);
    }

    private static string CombineSources(string[] urls, string? nonce = null, params string[] keywords)
    {
        var sources = new List<string>(keywords);
        if (!string.IsNullOrEmpty(nonce))
        {
            sources.Add($"'nonce-{nonce}'");
        }

        foreach (var url in urls)
        {
            if (url.StartsWith("sha256-") || url.StartsWith("sha384-") || url.StartsWith("sha512-") || url == "unsafe-hashes")
            {
                sources.Add($"'{url}'");
            }
            else
            {
                sources.Add(url);
            }
        }

        return string.Join(" ", sources);
    }

    [GeneratedRegex(@"/api/invoices/[^/]+/pdf")]
    private static partial Regex MyRegex();
    [GeneratedRegex(@"/api/invoices/[^/]+/pdf")]
    private static partial Regex MyRegex1();
    [GeneratedRegex(@"<script\b[^>]*src=[""']https?:\/\/[^""']*worldpay\.com[^""']*[""'][^>]*><\/script>", RegexOptions.IgnoreCase, "en-US")]
    private static partial Regex MyRegex2();
}
