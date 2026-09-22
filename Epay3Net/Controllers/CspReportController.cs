using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Text.Json;
using Epay3Net.RateLimiting;

namespace Epay3Net.Controllers;

[Route("api/[controller]")]
[ApiController]
public class CspReportController(
    ILogger<CspReportController> logger
    ) : ControllerBase
{
    private readonly ILogger<CspReportController> logger = logger;

    [HttpPost]
    [Consumes("application/csp-report", "application/json")]
    [IgnoreAntiforgeryToken]
    [EnableRateLimiting(RateLimitPolicyNames.CspReport)]
    public async Task<IActionResult> Report()
    {
        using var reader = new StreamReader(Request.Body);
        var body = await reader.ReadToEndAsync();

        if (string.IsNullOrWhiteSpace(body))
        {
            return BadRequest();
        }

        try
        {
            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;

            if (!root.TryGetProperty("csp-report", out var report))
            {
                return BadRequest();
            }

            var violatedDirective = report.TryGetProperty("violated-directive", out var vd) ? vd.GetString() : "unknown";
            var blockedUri = report.TryGetProperty("blocked-uri", out var bu) ? bu.GetString() : "unknown";
            var documentUri = report.TryGetProperty("document-uri", out var du) ? du.GetString() : "unknown";
            var sourceFile = report.TryGetProperty("source-file", out var sf) ? sf.GetString() : null;
            var lineNumber = report.TryGetProperty("line-number", out var ln) ? ln.GetInt32() : 0;

            logger.LogWarning(
                "CSP Violation: Directive={ViolatedDirective}, BlockedUri={BlockedUri}, DocumentUri={DocumentUri}, SourceFile={SourceFile}, Line={LineNumber}",
                violatedDirective, blockedUri, documentUri, sourceFile, lineNumber);
        }
        catch (JsonException)
        {
            return BadRequest();
        }

        return NoContent();
    }
}
