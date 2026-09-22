using Epay3Net.Controllers;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace Epay3Net.Tests.Controllers;

public class CsrfControllerTests
{
    private readonly Mock<IAntiforgery> _mockAntiforgery;
    private readonly CsrfController _controller;

    public CsrfControllerTests()
    {
        _mockAntiforgery = new Mock<IAntiforgery>();
        _controller = new CsrfController(_mockAntiforgery.Object);
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
    }

    [Fact]
    public void GetToken_ReturnsOkWithToken()
    {
        // Arrange
        var requestToken = "test-request-token";
        var tokens = new AntiforgeryTokenSet(requestToken, "cookie-token", "header-name", "cookie-name");
        
        _mockAntiforgery.Setup(a => a.GetAndStoreTokens(It.IsAny<HttpContext>()))
            .Returns(tokens);

        // Act
        var result = _controller.GetToken();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var value = okResult.Value;
        
        // Serialize to JSON to check content since anonymous types are internal
        var json = System.Text.Json.JsonSerializer.Serialize(value);
        Assert.Contains(requestToken, json);
    }
}
