using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Epay3Net.Controllers;
using Epay3Net.Custom.ActionResult;
using Epay3Net.Models;
using Epay3Service.Configuration;
using Epay3Service.Helpers;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Services;
using Epay3Service.Models;
using Epay3Net.Authorization.Abilities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace Epay3Net.Tests.Controllers;

public class AuthControllerTests
{
    private readonly Mock<IUserManager> _mockUserManager;
    private readonly Mock<IAuthManager> _mockAuthManager;
    private readonly Mock<ISystemConfigService> _mockConfigService;
    private readonly ApplicationSecrets _appSecrets;
    private readonly Mock<ILanguageManager> _mockLanguageManager;
    private readonly Mock<IJwtKeyManager> _mockJwtKeyManager;
    private readonly Mock<IMaintenanceCacheService> _mockMaintenanceCacheService;
    private readonly AuthController _controller;

    public AuthControllerTests()
    {
        _mockUserManager = new Mock<IUserManager>();
        _mockAuthManager = new Mock<IAuthManager>();
        _mockConfigService = new Mock<ISystemConfigService>();
        _appSecrets = new ApplicationSecrets { RegistrationKey = "SuperSecretKeyForTestingTheJwtTokensGeneration!123" };
        _mockLanguageManager = new Mock<ILanguageManager>();
        _mockJwtKeyManager = new Mock<IJwtKeyManager>();
        _mockMaintenanceCacheService = new Mock<IMaintenanceCacheService>();

        // Setup Language Manager defaults
        _mockLanguageManager.Setup(m => m.GetMessage(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns((string key, string lang, string def) => def);

        // Default key for login success path
        _mockJwtKeyManager.Setup(m => m.GetActiveKeyAsync())
            .ReturnsAsync((new byte[64], "v1"));

        _mockMaintenanceCacheService.Setup(m => m.GetState())
            .Returns(new MaintenanceStateSnapshot());

        _controller = new AuthController(
            _mockUserManager.Object,
            _mockAuthManager.Object,
            _mockConfigService.Object,
            _appSecrets,
            _mockLanguageManager.Object,
            _mockJwtKeyManager.Object,
            _mockMaintenanceCacheService.Object
        );
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
    }

    [Fact]
    public async Task Login_ReturnsBadRequest_WhenMissingCredentials()
    {
        // Act
        var result = await _controller.Login(new LoginRequest());

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Login_ReturnsUnauthorized_WhenUserNotFound()
    {
        // Arrange
        _mockAuthManager.Setup(m => m.ValidateLogin(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        // Act
        var result = await _controller.Login(new LoginRequest { UserName = "u", Password = "p" });

        // Assert
        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(401, objectResult.StatusCode);
    }

    [Fact]
    public async Task Login_ReturnsUnauthorized_WhenUserNotActive()
    {
        // Arrange
        _mockAuthManager.Setup(m => m.ValidateLogin(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(new User { Status = "deactive" });

        // Act
        var result = await _controller.Login(new LoginRequest { UserName = "u", Password = "p" });

        // Assert
        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(401, objectResult.StatusCode);
        Assert.Equal("User ID and password doesn't match any records.  Please try again or click Forgot Password.", objectResult.Value);
    }

    [Fact]
    public async Task Login_ReturnsToken_WhenLoginSuccess()
    {
        // Arrange
        var user = new User
        {
            UserId = "1",
            Login = "u",
            Email = "u@example.com",
            PrimaryAccountType = "Payer",
            Status = "Active",
            Company = "C",
            Role = "Admin",
            Claims =
            [
                new Claim(ClaimTypes.Name, "u"),
                new Claim("UserId", "1"),
                new Claim(ClaimTypes.Email, "u@example.com"),
                new Claim("AccountType", "Payer"),
                new Claim(ClaimTypes.Role, "Admin"),
                new Claim("Accounts", "payer-1"),
                new Claim(Ability.ClaimType, Ability.IsAdmin)
            ]
        };
        _mockAuthManager.Setup(m => m.ValidateLogin(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(user);

        // Act
        var result = await _controller.Login(new LoginRequest { UserName = "u", Password = "p" });

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(okResult.Value);
        Assert.DoesNotContain("token", json, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("u@example.com", json);
        Assert.True(_controller.Response.Headers.SetCookie.Any(value => value?.Contains(AuthController.AuthCookieName) == true));
    }

    [Fact]
    public void Session_ReturnsUserProjection_WhenAuthenticated()
    {
        // Arrange
        _controller.ControllerContext.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.Name, "u"),
            new Claim("UserId", "1"),
            new Claim(ClaimTypes.Email, "u@example.com"),
            new Claim("AccountType", "Payer"),
            new Claim(ClaimTypes.Role, "Admin"),
            new Claim("Accounts", "payer-1"),
            new Claim(Ability.ClaimType, Ability.IsAdmin),
            new Claim("IsImpersonating", "false")
        ], "test"));

        // Act
        var result = _controller.Session();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(okResult.Value);
        Assert.Contains("u@example.com", json);
        Assert.Contains("payer-1", json);
        Assert.DoesNotContain("token", json, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Logout_ExpiresAuthCookie()
    {
        // Act
        var result = _controller.Logout();

        // Assert
        Assert.IsType<NoContentResult>(result);
        Assert.True(_controller.Response.Headers.SetCookie.Any(value => value?.Contains(AuthController.AuthCookieName) == true));
    }

    [Fact]
    public async Task Login_ReturnsUnauthorized_WhenUserLocked()
    {
        // Arrange
        _mockAuthManager.Setup(m => m.ValidateLogin(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(new User { Status = "locked" });

        // Act
        var result = await _controller.Login(new LoginRequest { UserName = "u", Password = "p" });

        // Assert
        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(401, objectResult.StatusCode);
        Assert.Equal("User ID and password doesn't match any records.  Please try again or click Forgot Password.", objectResult.Value);
    }

    [Fact]
    public async Task Login_ReturnsOk_WhenUserWaitingConfirmation()
    {
        // Arrange
        _mockAuthManager.Setup(m => m.ValidateLogin(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(new User { Status = "waiting-confirmation" });

        // Act
        var result = await _controller.Login(new LoginRequest { UserName = "u", Password = "p" });

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        dynamic val = okResult.Value;
        Assert.False((bool)val.GetType().GetProperty("isLoggedIn").GetValue(val, null));
        Assert.Equal("waiting-confirmation", val.GetType().GetProperty("Status").GetValue(val, null));
    }

    [Fact]
    public async Task Login_ReturnsUnauthorized_WhenUserHasNoAccounts()
    {
        // Arrange
        var user = new User { UserId = "1", Login = "u", Status = "Active", Role = "user", Accounts = new List<Account>() };
        _mockAuthManager.Setup(m => m.ValidateLogin(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(user);

        // Act
        var result = await _controller.Login(new LoginRequest { UserName = "u", Password = "p" });

        // Assert
        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(401, objectResult.StatusCode);
        Assert.Equal(401, objectResult.StatusCode);
        Assert.Equal("No Accounts", objectResult.Value);
    }

    [Fact]
    public async Task Login_ReturnsUnauthorized_WhenUserHasNoAccounts_AndAccountsIsNull()
    {
        // Arrange
        var user = new User { UserId = "1", Login = "u", Status = "Active", Role = "user", Accounts = null };
        _mockAuthManager.Setup(m => m.ValidateLogin(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(user);

        // Act
        var result = await _controller.Login(new LoginRequest { UserName = "u", Password = "p" });

        // Assert
        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(401, objectResult.StatusCode);
        Assert.Equal("No Accounts", objectResult.Value);
    }

    [Fact]
    public async Task Login_ReturnsExceptionResult_WhenExceptionOccurs()
    {
        // Arrange
        _mockAuthManager.Setup(m => m.ValidateLogin(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ThrowsAsync(new Exception("Fail"));

        // Act
        var result = await _controller.Login(new LoginRequest { UserName = "u", Password = "p" });

        // Assert
        Assert.IsType<ExceptionResult>(result);
    }

    [Fact]
    public async Task AutoRegisterConfirmUser_ReturnsNotFound_WhenTokenExpired()
    {
        // Arrange
        var token = HashTokenService.GetSimpleToken("user_token", _appSecrets.RegistrationKey);

        _mockConfigService.Setup(c => c.GetConfig(false)).ReturnsAsync(new SystemConfiguration { RegistrationEmailExpiration = "-1" }); // Expired immediately

        // Act
        var result = await _controller.AutoRegisterConfirmUser(token);

        // Assert
        var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Contains("expired", notFoundResult.Value.ToString() ?? "", StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task AutoRegisterConfirmUser_ReturnsOk_WhenSuccess()
    {
        // Arrange
        var token = HashTokenService.GetSimpleToken("user_token", _appSecrets.RegistrationKey);
        _mockConfigService.Setup(c => c.GetConfig(false)).ReturnsAsync(new SystemConfiguration { RegistrationEmailExpiration = "24" });

        var user = new User { Login = "u", ConfirmationToken = "user_token" };
        _mockAuthManager.Setup(m => m.GetUserByConfirmationToken(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(user);

        _mockUserManager.Setup(m => m.UpdateUser(It.IsAny<User>(), It.IsAny<string>()))
            .ReturnsAsync((User u, string l) => u);

        // Act
        var result = await _controller.AutoRegisterConfirmUser(token);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        // Verify status update
        _mockUserManager.Verify(m => m.UpdateUser(It.Is<User>(u => u.Status == "active"), It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task CompleteRegistration_ReturnsBadRequest_WhenPasswordsMismatch()
    {
        // Arrange
        var user = new User { Login = "u", InviteToken = "id" };
        _mockAuthManager.Setup(m => m.GetUserByInviteToken("id", "en")).ReturnsAsync(user);

        // Act
        var result = await _controller.CompleteRegistration(new CompletePasswordResetForm { Password = "a", ConfirmPassword = "b", Id = "id" });

        // Assert
        var statusCodeResult = Assert.IsType<StatusCodeResult>(result);
        Assert.Equal(400, statusCodeResult.StatusCode);
    }

    [Fact]
    public async Task CompleteRegistration_ReturnsOk_WhenSuccess()
    {
        // Arrange
        var user = new User { Login = "u", InviteToken = "abc" };
        _mockAuthManager.Setup(m => m.GetUserByInviteToken("abc", "en")).ReturnsAsync(user);

        // Act
        var result = await _controller.CompleteRegistration(new CompletePasswordResetForm { Password = "Password1!", ConfirmPassword = "Password1!", Id = "abc" });

        // Assert
        Assert.IsType<OkObjectResult>(result);
        _mockUserManager.Verify(m => m.UpdateUser(It.Is<User>(u => u.PasswordHash != null && u.InviteToken == null), It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task CompleteRegistration_ReturnsBadRequest_WhenUserIsNull()
    {
        // Arrange
        _mockAuthManager.Setup(m => m.GetUserByInviteToken(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        // Act
        var result = await _controller.CompleteRegistration(new CompletePasswordResetForm { Id = "invalid" });

        // Assert
        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(400, objectResult.StatusCode);
        Assert.Equal("Invalid invite id.", objectResult.Value);
    }

    [Fact]
    public async Task CompleteRegistration_UpdatesStatusToActive_WhenWaitingConfirmation()
    {
        // Arrange
        var user = new User { Login = "u", InviteToken = "abc", Status = TextConstant.WaitingConfirmation };
        _mockAuthManager.Setup(m => m.GetUserByInviteToken("abc", "en")).ReturnsAsync(user);

        // Act
        var result = await _controller.CompleteRegistration(new CompletePasswordResetForm { Password = "Password1!", ConfirmPassword = "Password1!", Id = "abc" });

        // Assert
        Assert.IsType<OkObjectResult>(result);
        _mockUserManager.Verify(m => m.UpdateUser(It.Is<User>(u => u.Status == "active"), It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task AutoRegisterConfirmUser_ReturnsNotFound_WhenUserIsNull()
    {
        // Arrange
        var token = HashTokenService.GetSimpleToken("user_token", _appSecrets.RegistrationKey);
        _mockConfigService.Setup(c => c.GetConfig(false)).ReturnsAsync(new SystemConfiguration { RegistrationEmailExpiration = "24" });

        _mockAuthManager.Setup(m => m.GetUserByConfirmationToken(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        // Act
        var result = await _controller.AutoRegisterConfirmUser(token);

        // Assert
        var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal("Could not find activation token.", notFoundResult.Value);
    }

    [Fact]
    public async Task AutoRegisterConfirmUser_ReturnsNotFound_WhenTokenIsEmpty()
    {
        // Act
        var result = await _controller.AutoRegisterConfirmUser("");

        // Assert
        var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal("Could not find activation token.", notFoundResult.Value);
    }

    [Fact]
    public async Task AutoRegisterConfirmUser_ReturnsNotFound_WithDefaultMessage_WhenTokenExpired()
    {
        // Arrange
        var token = HashTokenService.GetSimpleToken("user_token", _appSecrets.RegistrationKey);
        _mockConfigService.Setup(c => c.GetConfig(false)).ReturnsAsync(new SystemConfiguration { RegistrationEmailExpiration = "-1" }); // Expired

        // Act
        var result = await _controller.AutoRegisterConfirmUser(token);

        // Assert
        var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal("Activation link has expired", notFoundResult.Value);
    }

    [Fact]
    public async Task AutoRegisterConfirmUser_ReturnsNotFound_WithCustomMessage_WhenTokenExpired()
    {
        // Arrange
        var token = HashTokenService.GetSimpleToken("user_token", _appSecrets.RegistrationKey);
        _mockConfigService.Setup(c => c.GetConfig(false)).ReturnsAsync(new SystemConfiguration { RegistrationEmailExpiration = "-1", RegistrationEmailExpirationMessage = "Custom Expired" });

        // Act
        var result = await _controller.AutoRegisterConfirmUser(token);

        // Assert
        var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal("Custom Expired", notFoundResult.Value);
    }

    [Fact]
    public async Task AutoRegisterConfirmUser_ReturnsExceptionResult_WhenExceptionOccurs()
    {
        // Arrange
        _mockConfigService.Setup(c => c.GetConfig(false)).ThrowsAsync(new Exception("Error"));

        // Act
        var result = await _controller.AutoRegisterConfirmUser("token");

        // Assert
        Assert.IsType<ExceptionResult>(result);
    }
}

