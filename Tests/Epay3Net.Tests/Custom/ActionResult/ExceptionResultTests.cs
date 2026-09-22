using Epay3Net.Custom.ActionResult;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace Epay3Net.Tests.Custom.ActionResult;

public class ExceptionResultTests
{
    [Fact]
    public async Task ExecuteResultAsync_ReturnsGeneric500Response()
    {
        // Arrange
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddMvcCore();

        var httpContext = new DefaultHttpContext
        {
            RequestServices = services.BuildServiceProvider(),
            TraceIdentifier = "trace-test-123"
        };
        httpContext.Response.Body = new MemoryStream();

        var actionContext = new ActionContext(httpContext, new RouteData(), new ActionDescriptor());
        var result = new ExceptionResult(new InvalidOperationException("Sensitive backend failure"));

        // Act
        await result.ExecuteResultAsync(actionContext);

        // Assert
        httpContext.Response.Body.Position = 0;
        var body = await new StreamReader(httpContext.Response.Body).ReadToEndAsync();

        Assert.Equal(StatusCodes.Status500InternalServerError, httpContext.Response.StatusCode);
        Assert.Equal(ExceptionResult.GenericErrorMessage, body);
        Assert.DoesNotContain("Sensitive backend failure", body);
        Assert.Equal("trace-test-123", httpContext.Response.Headers[ExceptionResult.TraceIdHeaderName].ToString());
    }
}
