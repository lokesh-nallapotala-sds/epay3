using System.Security.Claims;
using Epay3Net.Authorization;
using Epay3Net.Controllers;
using Epay3Net.Models;
using Epay3Service.Configuration;
using Epay3Service.Helpers;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace Epay3Net.Tests.Controllers;

public class PaymentTokenControllerTests
{
    private readonly Mock<IPaymentManager> _mockPaymentManager = new();
    private readonly Mock<IAccountManager> _mockAccountManager = new();
    private readonly Mock<IUserManager> _mockUserManager = new();
    private readonly Mock<ILanguageManager> _mockLanguageManager = new();
    private readonly Mock<IAuthorizationService> _mockAuthorizationService = new();
    private readonly Mock<IApplicationConfigurationManager> _mockApplicationConfigurationManager = new();
    private readonly PaymentTokenController _controller;

    public PaymentTokenControllerTests()
    {
        _mockLanguageManager
            .Setup(m => m.GetMessage(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns((string _, string _, string message) => message);

        _controller = new PaymentTokenController(
            _mockPaymentManager.Object,
            _mockAccountManager.Object,
            _mockUserManager.Object,
            _mockLanguageManager.Object,
            _mockAuthorizationService.Object,
            new ApplicationSecrets
            {
                EncryptionKey = "encryption-key-that-is-long-enough",
                CvvEncryptionKey = "cvv-encryption-key-that-is-long-enough"
            },
            _mockApplicationConfigurationManager.Object);

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                    new[]
                    {
                        new Claim("UserId", "user-1"),
                        new Claim(ClaimTypes.Name, "testuser"),
                        new Claim(ClaimTypes.Role, "user")
                    },
                    "mock"))
            }
        };
    }

    [Fact]
    public async Task CreateTransactionAccessToken_UsesLinkedAccountsForAuthorization()
    {
        var user = new User
        {
            UserId = "user-1",
            Login = "testuser",
            Email = "test@example.com",
            FirstName = "Test",
            LastName = "User",
            PrimaryAccountType = AccountType.SoldTo
        };
        var accounts = new List<Account> { new() { PrimaryAcct = "123", CompanyCode = "1000" } };
        var request = new AccessTokenRequest
        {
            SelectedAccount = "123",
            Payer = "payer-1",
            CompanyCode = "1000",
            Amount = 10,
            Currency = "USD",
            RedirectUri = "https://example.com",
            PaymentMethod = null
        };
        var token = new PaymentAccessToken { AccessToken = "abc123" };

        _mockUserManager.Setup(m => m.GetUserById("user-1", "en")).ReturnsAsync(user);
        _mockAccountManager.Setup(m => m.GetLinkedAccountsByUser(user, "en", It.IsAny<bool>())).ReturnsAsync(accounts);
        _mockAccountManager.Setup(m => m.FindLinkedAccount(accounts, request.SelectedAccount, request.CompanyCode)).Returns(accounts[0]);
        _mockAuthorizationService
            .Setup(m => m.AuthorizeAsync(It.IsAny<ClaimsPrincipal>(), request.SelectedAccount, It.IsAny<IEnumerable<IAuthorizationRequirement>>()))
            .Callback<ClaimsPrincipal, object, IEnumerable<IAuthorizationRequirement>>((principal, resource, _) =>
            {
                Assert.Equal(request.SelectedAccount, resource);
                Assert.True(principal.HasClaim("Accounts", request.SelectedAccount));
            })
            .ReturnsAsync(AuthorizationResult.Success());
        _mockApplicationConfigurationManager.Setup(m => m.GetCustomConfig(It.IsAny<string>(), It.IsAny<bool>())).ReturnsAsync(new SapCustomData());
        _mockPaymentManager
            .Setup(m => m.GetAccessToken(It.IsAny<User>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<SapCustomData>(), It.IsAny<string>(), It.IsAny<decimal>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Epay3Service.Models.PaymentMethod>(), request.CompanyCode))
            .ReturnsAsync(token);

        IActionResult result = await _controller.CreateTransactionAccessToken(request, "en");

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Same(token, okResult.Value);
        _mockAccountManager.Verify(m => m.GetLinkedAccountsByUser(user, "en", It.IsAny<bool>()), Times.Once);
        _mockAccountManager.Verify(m => m.GetAccountsByUser(It.IsAny<User>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task CreateTransactionAccessToken_ReturnsForbid_WhenUserIdDiffersWithoutImpersonate()
    {
        var request = new AccessTokenRequest
        {
            UserId = "user-2",
            SelectedAccount = "123",
            Payer = "payer-1",
            Amount = 10,
            Currency = "USD",
            RedirectUri = "https://example.com",
            PaymentMethod = null
        };

        IActionResult result = await _controller.CreateTransactionAccessToken(request, "en");

        Assert.IsType<ForbidResult>(result);
        _mockUserManager.Verify(
            m => m.GetUserById(It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task CreateTransactionAccessToken_StoresProtectedCvvInTokenVRef()
    {
        var user = new User { UserId = "user-1", Login = "testuser", Email = "test@example.com", FirstName = "Test", LastName = "User", PrimaryAccountType = AccountType.SoldTo };
        var accounts = new List<Account> { new() { PrimaryAcct = "123" } };
        var request = new AccessTokenRequest
        {
            SelectedAccount = "123",
            Payer = "payer-1",
            Amount = 10,
            Currency = "USD",
            RedirectUri = "https://example.com/return",
            Cvv = "123",
            PaymentMethod = null
        };

        _mockUserManager.Setup(m => m.GetUserById("user-1", "en")).ReturnsAsync(user);
        _mockAccountManager.Setup(m => m.GetLinkedAccountsByUser(user, "en", It.IsAny<bool>())).ReturnsAsync(accounts);
        _mockAccountManager.Setup(m => m.FindLinkedAccount(accounts, request.SelectedAccount, null)).Returns(accounts[0]);
        _mockAuthorizationService
            .Setup(m => m.AuthorizeAsync(It.IsAny<ClaimsPrincipal>(), It.IsAny<object>(), It.IsAny<IEnumerable<IAuthorizationRequirement>>()))
            .ReturnsAsync(AuthorizationResult.Success());
        _mockApplicationConfigurationManager.Setup(m => m.GetCustomConfig(It.IsAny<string>(), It.IsAny<bool>())).ReturnsAsync(new SapCustomData());
        var returnedToken = new PaymentAccessToken { AccessToken = "tok" };
        _mockPaymentManager
            .Setup(m => m.GetAccessToken(
                It.IsAny<User>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<SapCustomData>(),
                It.IsAny<string>(), It.IsAny<decimal>(), It.IsAny<string>(),
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Epay3Service.Models.PaymentMethod>(), It.IsAny<string?>()))
            .ReturnsAsync(returnedToken);

        IActionResult result = await _controller.CreateTransactionAccessToken(request, "en");

        Assert.IsType<OkObjectResult>(result);
        // VRef must be set and must not contain the plain CVV
        Assert.NotNull(returnedToken.VRef);
        Assert.DoesNotContain("123", returnedToken.VRef);
        Assert.Equal(
            "123",
            Encryption.Decrypt(returnedToken.VRef!, "cvv-encryption-key-that-is-long-enough"));
    }

    [Fact]
    public async Task CreateGuestTransactionAccessToken_StoresProtectedCvvInTokenVRef()
    {
        var customData = new SapCustomData();
        customData.PaymentProviders.Add(new PaymentProviderInfo
        {
            Provider = "PM",
            IsSecure3dsEnabled = true,
            Secure3dsVersion = "2.0"
        });
        _mockApplicationConfigurationManager.Setup(m => m.GetCustomConfig(It.IsAny<string>(), It.IsAny<bool>())).ReturnsAsync(customData);
        var returnedToken = new PaymentAccessToken { AccessToken = "tok" };
        _mockPaymentManager
            .Setup(m => m.GetPaymentAccessToken(It.IsAny<Dictionary<string, string?>>(), It.IsAny<string>()))
            .ReturnsAsync(returnedToken);

        var request = new GuestTransactionAccessTokenRequest
        {
            Payer = new PayerData { CompanyCode = "C1" },
            Payment = new PaymentDetail { CardValidationCode = "456" },
            Amount = 50,
            Currency = "USD",
            RedirectUri = "https://example.com/guest-return"
        };

        IActionResult result = await _controller.CreateGuestTransactionAccessToken(request, "en");

        Assert.IsType<OkObjectResult>(result);
        // VRef must be set and must not contain the plain CVV
        Assert.NotNull(returnedToken.VRef);
        Assert.DoesNotContain("456", returnedToken.VRef);
        Assert.Equal(
            "456",
            Encryption.Decrypt(returnedToken.VRef!, "cvv-encryption-key-that-is-long-enough"));
    }

    [Fact]
    public async Task CreateGuestTransactionAccessToken_ReturnsBadRequest_When3DSNotEnabled()
    {
        _mockApplicationConfigurationManager.Setup(m => m.GetCustomConfig(It.IsAny<string>(), It.IsAny<bool>())).ReturnsAsync(new SapCustomData());

        var request = new GuestTransactionAccessTokenRequest
        {
            Payer = new PayerData { CompanyCode = "C1" },
            Payment = new PaymentDetail(),
            Amount = 50,
            Currency = "USD",
            RedirectUri = "https://example.com/guest-return"
        };

        IActionResult result = await _controller.CreateGuestTransactionAccessToken(request, "en");

        Assert.IsType<BadRequestObjectResult>(result);
    }
}
