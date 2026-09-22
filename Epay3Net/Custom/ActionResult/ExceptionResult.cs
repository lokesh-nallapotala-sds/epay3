using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;

namespace Epay3Net.Custom.ActionResult;

public class ExceptionResult(Exception exception) : IActionResult {
    public const string GenericErrorMessage = "An unexpected error occurred.";
    public const string TraceIdHeaderName = "X-Trace-Id";

    private readonly Exception exception = exception;

    public async Task ExecuteResultAsync(ActionContext context) {
        var traceId = context.HttpContext.TraceIdentifier;
        if (!string.IsNullOrWhiteSpace(traceId))
        {
            context.HttpContext.Response.Headers[TraceIdHeaderName] = traceId;
        }

        var logger = context.HttpContext.RequestServices?.GetService<ILogger<ExceptionResult>>();
        logger?.LogError(
            this.exception,
            "Unhandled controller exception. TraceId: {TraceId}; Path: {Path}",
            traceId,
            context.HttpContext.Request.Path.Value);

        var result = new ContentResult
        {
            StatusCode = StatusCodes.Status500InternalServerError,
            ContentType = "text/plain",
            Content = GenericErrorMessage
        };

        await result.ExecuteResultAsync(context);
    }
}
