using AutoMapper;
using Epay3Net.Controllers;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.FeatureManagement;
using Moq;
using Xunit;

namespace Epay3Net.Tests.Controllers;

public class ConfigControllerUploadTests
{
    private static ConfigController CreateController()
    {
        var controller = new ConfigController(
            Mock.Of<IApplicationConfigurationManager>(),
            Mock.Of<IMapper>(),
            new ConfigurationBuilder().Build(),
            Mock.Of<IMaintenanceCacheService>(),
            Mock.Of<IFeatureManager>());
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
        return controller;
    }

    [Theory]
    [InlineData("shell.aspx")]
    [InlineData("page.html")]
    [InlineData("script.js")]
    [InlineData("extensionless")]
    public async Task UploadFile_RejectsDisallowedExtensions(string fileName)
    {
        // Arrange
        var controller = CreateController();
        var file = CreateFormFile(fileName);

        // Act
        var result = await controller.UploadFile(file);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Theory]
    [InlineData("logo.png")]
    [InlineData("photo.JPG")]
    [InlineData("favicon.ico")]
    public async Task UploadFile_AcceptsAllowedImageExtensions(string fileName)
    {
        // Arrange
        var originalDirectory = Directory.GetCurrentDirectory();
        var tempDirectory = Path.Combine(Path.GetTempPath(), $"epay3-upload-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDirectory);

        try
        {
            Directory.SetCurrentDirectory(tempDirectory);
            var controller = CreateController();
            controller.ControllerContext.HttpContext.Request.Scheme = "https";
            controller.ControllerContext.HttpContext.Request.Host = new HostString("example.test");

            // Act
            var result = await controller.UploadFile(CreateFormFile(fileName));

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var json = System.Text.Json.JsonSerializer.Serialize(okResult.Value);
            Assert.Contains("/upload/", json);
        }
        finally
        {
            Directory.SetCurrentDirectory(originalDirectory);
            Directory.Delete(tempDirectory, recursive: true);
        }
    }

    private static IFormFile CreateFormFile(string fileName)
    {
        var bytes = "test image content"u8.ToArray();
        return new FormFile(new MemoryStream(bytes), 0, bytes.Length, "file", fileName);
    }
}
