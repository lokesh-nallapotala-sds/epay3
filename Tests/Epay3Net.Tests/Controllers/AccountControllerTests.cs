using System.Security.Claims;
using Epay3.Test.Common.Helpers;
using Epay3Net.Controllers;
using Epay3Net.Models;
using Epay3Service.Configuration;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MimeKit;
using Moq;
using Newtonsoft.Json;
using Xunit;

namespace Epay3Net.Tests.Controllers;

public class AccountControllerTests
{
    private readonly Mock<IAccountManager> _mockAccountManager;
    private readonly Mock<IUserManager> _mockUserManager;
    private readonly Mock<IAuthManager> _mockAuthManager;
    private readonly Mock<IInvoicesManager> _mockInvoicesManager;
    private readonly Mock<ILanguageManager> _mockLanguageManager;
    private readonly Mock<IAuthorizationService> _mockAuthService;
    private readonly Mock<IHashTokenManager> _mockHashTokenManager;
    private readonly Mock<IMailer> _mockMailer;
    private readonly Mock<IConfiguration> _mockConfig;
    private readonly Mock<IAuthenticationService> _mockAuthenticationService;
    private readonly Mock<IServiceProvider> _mockServiceProvider;
    private readonly Mock<IJwtKeyManager> _mockJwtKeyManager;
    private readonly AccountController _controller;

    public AccountControllerTests()
    {
        _mockAccountManager = new Mock<IAccountManager>();
        _mockUserManager = new Mock<IUserManager>();
        _mockAuthManager = new Mock<IAuthManager>();
        _mockInvoicesManager = new Mock<IInvoicesManager>();
        _mockLanguageManager = new Mock<ILanguageManager>();
        _mockAuthService = new Mock<IAuthorizationService>();
        _mockHashTokenManager = new Mock<IHashTokenManager>();
        _mockMailer = new Mock<IMailer>();
        _mockConfig = new Mock<IConfiguration>();
        _mockAuthenticationService = new Mock<IAuthenticationService>();
        _mockServiceProvider = new Mock<IServiceProvider>();
        _mockJwtKeyManager = new Mock<IJwtKeyManager>();
        _mockJwtKeyManager.Setup(m => m.GetActiveKeyAsync()).ReturnsAsync((new byte[64], "v1"));
        var requireEmailConfirmationSection = new Mock<IConfigurationSection>();
        requireEmailConfirmationSection.Setup(s => s.Value).Returns("false");
        _mockConfig.Setup(c => c.GetSection("Registration:RequireEmailConfirmation"))
            .Returns(requireEmailConfirmationSection.Object);

        _mockLanguageManager.Setup(l => l.GetMessage(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns((string key, string lang, string defaultMsg) => defaultMsg);

        // Setup ServiceProvider for Auth
        _mockServiceProvider.Setup(x => x.GetService(typeof(IAuthenticationService)))
            .Returns(_mockAuthenticationService.Object);
        _mockServiceProvider.Setup(x => x.GetService(typeof(IAuthorizationService)))
            .Returns(_mockAuthService.Object);

        _controller = new AccountController(
            _mockAccountManager.Object,
            _mockUserManager.Object,
            _mockAuthManager.Object,
            _mockInvoicesManager.Object,
            _mockLanguageManager.Object,
            _mockAuthService.Object,
            _mockHashTokenManager.Object,
            _mockMailer.Object,
            new ApplicationSecrets { RegistrationKey = "super-secret-key-that-is-at-least-32-bytes-long" },
            _mockConfig.Object,
            _mockJwtKeyManager.Object
        );

        // Setup default Controller Context
        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim("UserId", "test-user-id"),
            new Claim(ClaimTypes.Name, "test-user"),
            new Claim(Ability.ClaimType, Ability.Impersonate)
        }, "mock"));

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user, Session = new MockSession() }
        };
    }

    [Fact]
    public async Task GetRelatedAccountsAsync_ReturnsOk_WhenAuthorizedAndFound()
    {
        // Arrange
        var accountId = "12345";
        var userId = "test-user-id";
        var user = new User
        {
            UserId = userId,
            Role = "user",
            PrimaryAccountType = "SoldTo",
            Login = "testuser",
            Email = "test@example.com",
            FirstName = "Test",
            LastName = "User"
        };
        var accounts = new List<Account> { new Account { PrimaryAcct = accountId } };
        var relatedAccounts = new List<RelatedAccount> { new RelatedAccount { PrimaryAccount = "rel1" } };

        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>()))
            .ReturnsAsync(user);

        _mockAccountManager.Setup(m => m.GetLinkedAccountsByUser(user, It.IsAny<string>(), It.IsAny<bool>()))
            .ReturnsAsync(accounts);
        _mockAccountManager.Setup(m => m.FindLinkedAccount(accounts, accountId, null))
            .Returns(accounts[0]);

        _mockAuthService.Setup(s => s.AuthorizeAsync(It.IsAny<ClaimsPrincipal>(), accountId, It.IsAny<IEnumerable<IAuthorizationRequirement>>()))
             .ReturnsAsync(AuthorizationResult.Success());

        _mockAccountManager.Setup(m => m.GetRelatedAccounts(user, accounts[0], It.IsAny<string>()))
            .ReturnsAsync(relatedAccounts);

        // Act
        var result = await _controller.GetRelatedAccountsAsync(accountId, userId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var returnList = Assert.IsType<List<RelatedAccount>>(okResult.Value);
        Assert.Single(returnList);
    }

    [Fact]
    public async Task GetRelatedAccountsAsync_ReturnsForbid_WhenUserIdDiffersWithoutImpersonate()
    {
        _controller.ControllerContext.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim("UserId", "test-user-id"),
            new Claim(ClaimTypes.Name, "test-user")
        }, "mock"));

        var result = await _controller.GetRelatedAccountsAsync("acc1", "other-user-id");

        Assert.IsType<ForbidResult>(result);
        _mockUserManager.Verify(
            m => m.GetUserById("other-user-id", It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task GetRelatedAccountsAsync_ReturnsUnauthorized_WhenUserNotFound()
    {
        // Arrange
        _mockUserManager.Setup(m => m.GetUserById(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        _mockLanguageManager.Setup(m => m.GetMessage(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns("User not found");

        // Act
        var result = await _controller.GetRelatedAccountsAsync("acc1");

        // Assert
        var unauthResult = Assert.IsType<UnauthorizedObjectResult>(result);
        Assert.Equal("User not found", unauthResult.Value);
    }

    [Fact]
    public async Task GetRelatedAccountsAsync_ReturnsUnauthorized_WhenUserHasNoAccounts()
    {
        // Arrange
        var userId = "u1";
        var user = new User { UserId = userId };
        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>()))
            .ReturnsAsync(user);
        _mockAccountManager.Setup(m => m.GetLinkedAccountsByUser(user, It.IsAny<string>(), It.IsAny<bool>()))
            .ReturnsAsync(new List<Account>()); // Empty

        _mockLanguageManager.Setup(m => m.GetMessage(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns("Account not allowed");

        // Act
        var result = await _controller.GetRelatedAccountsAsync("acc1", userId);

        // Assert
        var unauthResult = Assert.IsType<UnauthorizedObjectResult>(result);
        Assert.Equal("Account not allowed", unauthResult.Value);
    }

    [Fact]
    public async Task GetRelatedAccountsAsync_ReturnsUnauthorized_WhenAccountNotAllowed()
    {
        // Arrange
        var userId = "u1";
        var user = new User { UserId = userId };
        var accounts = new List<Account> { new Account { PrimaryAcct = "other-acc" } };
        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>()))
            .ReturnsAsync(user);
        _mockAccountManager.Setup(m => m.GetLinkedAccountsByUser(user, It.IsAny<string>(), It.IsAny<bool>()))
            .ReturnsAsync(accounts);

        _mockLanguageManager.Setup(m => m.GetMessage(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns("Account not allowed");

        // Act
        var result = await _controller.GetRelatedAccountsAsync("acc1", userId);

        // Assert
        var unauthResult = Assert.IsType<UnauthorizedObjectResult>(result);
        Assert.Equal("Account not allowed", unauthResult.Value);
    }

    [Fact]
    public async Task GetRelatedAccountsAsync_ReturnsUnauthorized_WhenAuthorizationFails_AndRoleIsUser()
    {
        // Arrange
        var userId = "u1";
        var accountId = "acc1";
        var user = new User
        {
            UserId = userId,
            Role = "user",
            Login = "l",
            Email = "e@e.com",
            FirstName = "F",
            LastName = "L",
            PrimaryAccountType = "S",
            Accounts = new List<Account>()
        };
        var accounts = new List<Account> { new Account { PrimaryAcct = accountId } };

        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>()))
            .ReturnsAsync(user);
        _mockAccountManager.Setup(m => m.GetLinkedAccountsByUser(user, It.IsAny<string>(), It.IsAny<bool>()))
            .ReturnsAsync(accounts);

        // Authorization fails
        _mockAuthService.Setup(s => s.AuthorizeAsync(It.IsAny<ClaimsPrincipal>(), accountId, It.IsAny<IEnumerable<IAuthorizationRequirement>>()))
             .ReturnsAsync(AuthorizationResult.Failed());

        _mockLanguageManager.Setup(m => m.GetMessage(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns("Account not allowed");

        // Act
        var result = await _controller.GetRelatedAccountsAsync(accountId, userId);

        // Assert
        var unauthResult = Assert.IsType<UnauthorizedObjectResult>(result);
        Assert.Equal("Account not allowed", unauthResult.Value);
    }

    [Fact]
    public async Task GetRelatedAccountsAsync_ReturnsOk_WhenAuthorizationFails_AndRoleIsNotUser()
    {
        // Arrange
        var userId = "u1";
        var accountId = "acc1";
        var user = new User
        {
            UserId = userId,
            Role = "admin",
            Login = "l",
            Email = "e@e.com",
            FirstName = "F",
            LastName = "L",
            PrimaryAccountType = "S",
            Accounts = new List<Account>()
        };
        var accounts = new List<Account> { new Account { PrimaryAcct = accountId } };
        var relatedAccounts = new List<RelatedAccount> { new RelatedAccount { PrimaryAccount = "rel1" } };

        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>()))
            .ReturnsAsync(user);
        _mockAccountManager.Setup(m => m.GetLinkedAccountsByUser(user, It.IsAny<string>(), It.IsAny<bool>()))
            .ReturnsAsync(accounts);
        _mockAccountManager.Setup(m => m.FindLinkedAccount(accounts, accountId, null))
            .Returns(accounts[0]);

        // Authorization fails but ignored for admin
        _mockAuthService.Setup(s => s.AuthorizeAsync(It.IsAny<ClaimsPrincipal>(), accountId, It.IsAny<IEnumerable<IAuthorizationRequirement>>()))
             .ReturnsAsync(AuthorizationResult.Failed());

        _mockAccountManager.Setup(m => m.GetRelatedAccounts(user, accounts[0], It.IsAny<string>()))
            .ReturnsAsync(relatedAccounts);

        // Act
        var result = await _controller.GetRelatedAccountsAsync(accountId, userId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var returnList = Assert.IsType<List<RelatedAccount>>(okResult.Value);
        Assert.Single(returnList);
    }

    [Fact]
    public async Task GetRelatedAccountsAsync_ReturnsException_WhenNoRelatedAccountsFound()
    {
        // Arrange
        var userId = "u1";
        var accountId = "acc1";
        var user = new User
        {
            UserId = userId,
            Role = "admin",
            Login = "l",
            Email = "e@e.com",
            FirstName = "F",
            LastName = "L",
            PrimaryAccountType = "S",
            Accounts = new List<Account>()
        };
        var accounts = new List<Account> { new Account { PrimaryAcct = accountId } };

        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>()))
            .ReturnsAsync(user);
        _mockAccountManager.Setup(m => m.GetLinkedAccountsByUser(user, It.IsAny<string>(), It.IsAny<bool>()))
            .ReturnsAsync(accounts);
        _mockAccountManager.Setup(m => m.FindLinkedAccount(accounts, accountId, null))
            .Returns(accounts[0]);

        // Authorization skipped effectively or successful
        _mockAuthService.Setup(s => s.AuthorizeAsync(It.IsAny<ClaimsPrincipal>(), accountId, It.IsAny<IEnumerable<IAuthorizationRequirement>>()))
             .ReturnsAsync(AuthorizationResult.Success());

        // No related accounts
        _mockAccountManager.Setup(m => m.GetRelatedAccounts(user, accounts[0], It.IsAny<string>()))
            .ReturnsAsync(new List<RelatedAccount>()); // Empty

        _mockLanguageManager.Setup(m => m.GetMessage(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns("No Related Accounts");

        // Act
        var result = await _controller.GetRelatedAccountsAsync(accountId, userId);

        // Assert
        // Check for ExceptionResult through reflection or simple type check if possible
        // Since ExceptionResult is in Epay3Net.Custom.ActionResult, and we reference the project, we should be able to assert the type.
        Assert.Equal("ExceptionResult", result.GetType().Name);
    }
    [Fact]
    public async Task ValidateAccount_ReturnsBadRequest_WhenVerifyFails()
    {
        // Arrange
        var validate = new ValidateInvoiceAccount { AccountNumber = "123", InvoiceNumber = "Inv1" };
        var docDetail = new DocumentDetail { CustomerNumber = "123", DocumentNumber = "Inv1", DocumentType = "01" };

        // Mock InvoiceManager to return "not found" implicitly or explicitly via logic
        // VerifyAccountMatches returns error if invoice.Detail is null
        var invoiceResponse = new InvoiceDetailResponse { Detail = null };

        _mockInvoicesManager.Setup(m => m.GetInvoiceDetails(It.IsAny<DocumentDetail>(), It.IsAny<string>()))
            .ReturnsAsync(invoiceResponse);

        // Act
        var result = await _controller.ValidateAccount(validate);

        // Assert
        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task ValidateAccount_ReturnsGenericBadRequest_WhenInvoiceLookupThrows()
    {
        // Arrange
        var validate = new ValidateInvoiceAccount { AccountNumber = "123", InvoiceNumber = "Inv1" };
        _mockInvoicesManager.Setup(m => m.GetInvoiceDetails(It.IsAny<DocumentDetail>(), It.IsAny<string>()))
            .ThrowsAsync(new Exception("Sensitive SAP failure"));

        // Act
        var result = await _controller.ValidateAccount(validate);

        // Assert
        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var message = badRequest.Value?.GetType().GetProperty("Message")?.GetValue(badRequest.Value)?.ToString();
        Assert.Equal("Unable to validate account at this time.", message);
        Assert.DoesNotContain("Sensitive SAP failure", message);
    }

    [Fact]
    public async Task ValidateAccount_ReturnsOk_WhenMatchSuccess()
    {
        // Arrange
        var validate = new ValidateInvoiceAccount
        {
            AccountNumber = "123",
            InvoiceNumber = "Inv1",
            InvoiceAmount = 100m
        };

        var invoiceDetail = new InvoiceDetail
        {
            HeaderData = new InvoiceHeaderData
            {
                TotalAmount = 100m,
                SoldtoNumber = "000123", // zero padding simulation
                CompanyCode = "3000",
                Division = "00",
                SalesOrganization = "3000",
                DistributionChannel = "10"
            },
            PartnerData = new List<InvoicePartnerData>
            {
                new InvoicePartnerData { PartnerFunction = "RG", PartnerNumber = "000123" }
            }
        };
        var invoiceResponse = new InvoiceDetailResponse { Detail = invoiceDetail };

        _mockInvoicesManager.Setup(m => m.GetInvoiceDetails(It.Is<DocumentDetail>(d => d.DocumentNumber == "Inv1"), It.IsAny<string>()))
            .ReturnsAsync(invoiceResponse);

        // Config setup for MatchSoldTo (default is true)
        _mockConfig.Setup(c => c.GetSection("Registration:MatchSoldTo").Value).Returns("true");

        // Act
        var result = await _controller.ValidateAccount(validate);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        dynamic val = okResult.Value;
        Assert.True((bool)val.GetType().GetProperty("Success").GetValue(val, null));
        var returnedAccount = Assert.IsType<ValidateInvoiceAccount>(
            val.GetType().GetProperty("Account").GetValue(val, null));
        Assert.Equal("Inv1", returnedAccount.InvoiceNumber);
        Assert.NotNull(returnedAccount.InvoiceDetail);
    }

    [Fact]
    public async Task ValidateAccount_ReturnsNotFound_WhenAmountMismatch()
    {
        // Arrange
        var validate = new ValidateInvoiceAccount { AccountNumber = "123", InvoiceNumber = "Inv1", InvoiceAmount = 50m };
        var invoiceDetail = new InvoiceDetail
        {
            HeaderData = new InvoiceHeaderData { TotalAmount = 100m, SoldtoNumber = "123", CompanyCode = "3000" }
        };
        var invoiceResponse = new InvoiceDetailResponse { Detail = invoiceDetail };

        _mockInvoicesManager.Setup(m => m.GetInvoiceDetails(It.IsAny<DocumentDetail>(), It.IsAny<string>()))
            .ReturnsAsync(invoiceResponse);

        // Act
        var result = await _controller.ValidateAccount(validate);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task ValidateAccount_MatchesPartner_WhenSoldToMismatch()
    {
        // Arrange
        var validate = new ValidateInvoiceAccount
        {
            AccountNumber = "123",
            InvoiceNumber = "Inv1",
            InvoiceAmount = 100m
        };

        var invoiceDetail = new InvoiceDetail
        {
            HeaderData = new InvoiceHeaderData
            {
                TotalAmount = 100m,
                SoldtoNumber = "999", // Mismatch
                CompanyCode = "3000",
                Division = "00",
                SalesOrganization = "3000",
                DistributionChannel = "10"
            },
            PartnerData = new List<InvoicePartnerData>
            {
                new InvoicePartnerData { PartnerFunction = "RG", PartnerNumber = "000123" } // Match!
            }
        };
        var invoiceResponse = new InvoiceDetailResponse { Detail = invoiceDetail };

        _mockInvoicesManager.Setup(m => m.GetInvoiceDetails(It.Is<DocumentDetail>(d => d.DocumentNumber == "Inv1"), It.IsAny<string>()))
            .ReturnsAsync(invoiceResponse);

        // Config setup for MatchSoldTo (default is true, so we can explicit set it or rely on default, best to be explicit for this test)
        _mockConfig.Setup(c => c.GetSection("Registration:MatchSoldTo").Value).Returns("true");

        // Act
        var result = await _controller.ValidateAccount(validate);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        dynamic val = okResult.Value;
        Assert.True((bool)val.GetType().GetProperty("Success").GetValue(val, null));
    }

    [Fact]
    public async Task AutoRegisterCreateUser_CreatesAccounts_WhenRequestHasValidatedAccounts()
    {
        // Arrange
        var userForm = new User
        {
            Email = "test@example.com",
            FirstName = "Test",
            LastName = "User",
            Company = "Test Co",
            PrimaryAccountType = "SoldTo",
            Password = "Password1!"
        };

        // 1. Check user exists -> returns null
        _mockUserManager.SetupSequence(m => m.GetUserByEmail(userForm.Email, It.IsAny<string>()))
            .ReturnsAsync((User?)null) // First check
            .ReturnsAsync(new User { UserId = "new-id", Email = userForm.Email, Login = userForm.Email, PrimaryAccountType = "SoldTo", Accounts = new List<Account>() });

        // 2. Create user returns user
        _mockUserManager.Setup(m => m.CreateUser(It.IsAny<User>(), It.IsAny<string>()))
            .ReturnsAsync(new User { UserId = "new-id", Email = userForm.Email, Login = userForm.Email, PrimaryAccountType = "SoldTo", Accounts = new List<Account>() });

        // 3. Config for email confirmation
        // Use real configuration for this test to avoid Moq issues
        var inMemorySettings = new Dictionary<string, string?> {
            {"Registration:AllowAutoRegister", "true"},
            {"Registration:RequireEmailConfirmation", "false"}, // Simpler path
            {"Registration:SAPAccountType", "master"}
        };
        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        // 4. Request with verified accounts
        var invoiceDetail = new InvoiceDetail
        {
            HeaderData = new InvoiceHeaderData
            {
                Division = "00",
                SalesOrganization = "3000",
                DistributionChannel = "10",
                CompanyCode = "1000"
            },
            PartnerData = new List<InvoicePartnerData>
            {
                new InvoicePartnerData { PartnerFunction = "RG", PartnerNumber = "0012345" }
            }
        };
        var validAccount = new ValidateInvoiceAccount { AccountNumber = "12345", InvoiceNumber = "Inv1", InvoiceDetail = invoiceDetail };
        var accounts = new List<ValidateInvoiceAccount> { validAccount };
        var request = new AutoRegisterRequest
        {
            User = userForm,
            Accounts = accounts
        };

        // Re-create controller with real config
        var controller = new AccountController(
            _mockAccountManager.Object,
            _mockUserManager.Object,
            _mockAuthManager.Object,
            _mockInvoicesManager.Object,
            _mockLanguageManager.Object,
            _mockAuthService.Object,
            _mockHashTokenManager.Object,
            _mockMailer.Object,
            new ApplicationSecrets { RegistrationKey = "super-secret-key-that-is-at-least-32-bytes-long" },
            configuration,
            _mockJwtKeyManager.Object
        );
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                Session = new MockSession(),
                User = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] {
                    new Claim(ClaimTypes.Name, "testuser"),
                    new Claim(ClaimTypes.Role, "Admin")
                }, "mock"))
            }
        };

        // Act
        var result = await controller.AutoRegisterCreateUser(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);

        // Verify CreateAccount was called
        // Verify CreateAccount was called
        _mockAccountManager.Verify(m => m.CreateAccount(It.Is<Account>(a =>
            a.UserId == "new-id" &&
            a.PrimaryAcct == "12345" &&
            a.CompanyCode == "1000"
        ), It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task AutoRegisterCreateUser_ReturnsBadRequest_WhenUserExists()
    {
        // Arrange
        var userForm = new User { Email = "existing@example.com" };
        var request = new AutoRegisterRequest { User = userForm, Accounts = [] };
        _mockUserManager.Setup(m => m.GetUserByEmail(userForm.Email, It.IsAny<string>()))
            .ReturnsAsync(new User { UserId = "existing" });

        // Use real configuration for this test to avoid Moq issues
        var inMemorySettings = new Dictionary<string, string?> {
            {"Registration:AllowAutoRegister", "true"}
        };
        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        // Re-create controller with real config
        var controller = new AccountController(
            _mockAccountManager.Object,
            _mockUserManager.Object,
            _mockAuthManager.Object,
            _mockInvoicesManager.Object,
            _mockLanguageManager.Object,
            _mockAuthService.Object,
            _mockHashTokenManager.Object,
            _mockMailer.Object,
            new ApplicationSecrets { RegistrationKey = "super-secret-key-that-is-at-least-32-bytes-long" },
            configuration,
            _mockJwtKeyManager.Object
        );
        controller.ControllerContext = _controller.ControllerContext; // Reuse context

        // Act
        var result = await controller.AutoRegisterCreateUser(request);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task AutoRegisterCreateUser_ReturnsLocalizedError_WhenCreateUserFails()
    {
        // Arrange
        var userForm = new User
        {
            Email = "new@example.com",
            FirstName = "New",
            LastName = "User",
            Password = "Password1!"
        };
        var request = new AutoRegisterRequest { User = userForm, Accounts = [] };

        const string language = "fr";
        const string localizedMessage = "Echec de la creation du compte";

        _controller.ControllerContext.HttpContext.Request.Headers["Accept-Language"] = language;

        _mockUserManager.Setup(m => m.GetUserByEmail(userForm.Email, It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        _mockUserManager.Setup(m => m.CreateUser(It.IsAny<User>(), It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        _mockLanguageManager.Setup(m => m.GetMessage("user.register.create_error", language, "Account Creation Failed"))
            .Returns(localizedMessage);

        // Act
        var result = await _controller.AutoRegisterCreateUser(request);

        // Assert
        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status500InternalServerError, objectResult.StatusCode);
        var message = objectResult.Value?.GetType().GetProperty("Message")?.GetValue(objectResult.Value)?.ToString();
        Assert.Equal(localizedMessage, message);
    }

    [Fact]
    public async Task AutoRegisterCreateUser_ReturnsLocalizedPasswordError_WhenPasswordInvalid()
    {
        // Arrange
        var userForm = new User
        {
            Email = "new@example.com",
            FirstName = "New",
            LastName = "User",
            Password = "weak"
        };
        var request = new AutoRegisterRequest { User = userForm, Accounts = [] };

        const string language = "de";
        const string localizedMessage = "Passwort ist ungueltig";

        _controller.ControllerContext.HttpContext.Request.Headers["Accept-Language"] = language;

        _mockUserManager.Setup(m => m.GetUserByEmail(userForm.Email, It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        _mockLanguageManager.Setup(m => m.GetMessage("user.password.invalid.message", language, "Not a valid password"))
            .Returns(localizedMessage);

        // Act
        var result = await _controller.AutoRegisterCreateUser(request);

        // Assert
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(localizedMessage, badRequest.Value);
    }

    [Fact]
    public async Task AutoRegisterCreateUser_ReturnsOk_WhenUserCreated()
    {
        // Arrange
        var userForm = new User
        {
            Email = "new@example.com",
            FirstName = "New",
            LastName = "User",
            Password = "Password1!"
        };
        var request = new AutoRegisterRequest { User = userForm, Accounts = [] };

        // 1. Check user exists -> returns null
        _mockUserManager.SetupSequence(m => m.GetUserByEmail(userForm.Email, It.IsAny<string>()))
            .ReturnsAsync((User?)null) // First check
            .ReturnsAsync(new User { UserId = "new-id", Email = userForm.Email, Login = userForm.Email, PrimaryAccountType = "SoldTo", Accounts = new List<Account>() });

        // 2. Create user returns user
        _mockUserManager.Setup(m => m.CreateUser(It.IsAny<User>(), It.IsAny<string>()))
            .ReturnsAsync(new User { UserId = "new-id", Email = userForm.Email, Login = userForm.Email, PrimaryAccountType = "SoldTo", Accounts = new List<Account>() });

        // 3. Config for email confirmation
        var mockSectionAuto = new Mock<IConfigurationSection>();
        mockSectionAuto.Setup(s => s.Value).Returns("true");
        _mockConfig.Setup(c => c.GetSection("Registration:AllowAutoRegister")).Returns(mockSectionAuto.Object);

        var mockSectionConfirm = new Mock<IConfigurationSection>();
        mockSectionConfirm.Setup(s => s.Value).Returns("true");
        _mockConfig.Setup(c => c.GetSection("Registration:RequireEmailConfirmation")).Returns(mockSectionConfirm.Object);

        // 4. Token mocks
        _mockHashTokenManager.Setup(m => m.GetSimpleToken(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync("simple-token");

        // Act
        var result = await _controller.AutoRegisterCreateUser(request);

        // Assert
        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task ResendConfirmation_ReturnsOk_WhenUserFound()
    {
        // Arrange
        var email = "test@example.com";
        var user = new User { Email = email, Login = email, PrimaryAccountType = "SoldTo", FirstName = "Test", Accounts = new List<Account>() };

        _mockUserManager.Setup(m => m.GetUserByEmail(email, It.IsAny<string>()))
            .ReturnsAsync(user);

        _mockHashTokenManager.Setup(m => m.GetSimpleToken(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync("token");

        // Act
        var result = await _controller.ResendConfirmation(email);

        // Assert
        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task AdminRecoveryUser_ReturnsOk_WhenRecovered()
    {
        // Arrange
        var request = new AdminRecoveryRequest
        {
            Mode = "R",
            User = "testuser",
            Password = "newpassword",
            Key = "key"
        };

        _mockUserManager.Setup(m => m.RecoverUser(request.Key, request.User, request.Mode, It.IsAny<string>()))
            .ReturnsAsync(new Status { MessageType = "S" });

        var user = new User { UserId = "u1", Login = "testuser", PasswordSalt = "salt" };
        _mockUserManager.Setup(m => m.GetUserByLogin(request.User, It.IsAny<string>()))
            .ReturnsAsync(user);

        // Act
        var result = await _controller.AdminRecoveryUser(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Recovery mode must use the recovery start endpoint.", badRequestResult.Value);
    }

    [Fact]
    public async Task AdminRecoveryUser_ReturnsError_WhenMissingFields_InCreateMode()
    {
        // Arrange
        var request = new AdminRecoveryRequest { Mode = "C", User = "test", Password = "pwd" };
        // Missing Firstname, Lastname, Email, Company

        // Act
        var result = await _controller.AdminRecoveryUser(request);

        // Assert
        Assert.IsType<Epay3Net.Custom.ActionResult.ExceptionResult>(result);
    }

    [Fact]
    public async Task AdminRecoveryUser_ReturnsError_WhenMissingPassword()
    {
        // Arrange
        var request = new AdminRecoveryRequest { Mode = "R", User = "test" };

        // Act
        var result = await _controller.AdminRecoveryUser(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Recovery mode must use the recovery start endpoint.", badRequestResult.Value);
    }

    [Fact]
    public async Task AdminRecoveryUser_ReturnsError_WhenRecoverUserFails()
    {
        // Arrange
        var request = new AdminRecoveryRequest { Mode = "R", User = "test", Password = "pwd", Key = "key" };
        _mockUserManager.Setup(m => m.RecoverUser(request.Key, request.User, request.Mode, It.IsAny<string>()))
            .ReturnsAsync(new Status { MessageType = "E", MessageLineString = "Invalid key" });

        // Act
        var result = await _controller.AdminRecoveryUser(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Recovery mode must use the recovery start endpoint.", badRequestResult.Value);
    }

    [Fact]
    public async Task AdminRecoveryUser_ReturnsError_WhenUserExists_ByLogin()
    {
        // Arrange
        var request = new AdminRecoveryRequest
        {
            Mode = "C",
            User = "test",
            Password = "Password1!",
            Key = "key",
            Firstname = "F",
            Lastname = "L",
            Email = "e@e.com",
            Company = "C"
        };
        _mockUserManager.Setup(m => m.RecoverUser(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(new Status { MessageType = "S" });
        _mockUserManager.Setup(m => m.GetUserByLogin(request.User, It.IsAny<string>()))
            .ReturnsAsync(new User());

        // Act
        var result = await _controller.AdminRecoveryUser(request);

        // Assert
        Assert.IsType<Epay3Net.Custom.ActionResult.ExceptionResult>(result);
    }

    [Fact]
    public async Task AdminRecoveryUser_ReturnsError_WhenUserExists_ByEmail()
    {
        // Arrange
        var request = new AdminRecoveryRequest
        {
            Mode = "C",
            User = "test",
            Password = "Password1!",
            Key = "key",
            Firstname = "F",
            Lastname = "L",
            Email = "e@e.com",
            Company = "C"
        };
        _mockUserManager.Setup(m => m.RecoverUser(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(new Status { MessageType = "S" });
        _mockUserManager.Setup(m => m.GetUserByLogin(request.User, It.IsAny<string>()))
            .ReturnsAsync((User?)null);
        _mockUserManager.Setup(m => m.GetUserByEmail(request.Email, It.IsAny<string>()))
            .ReturnsAsync(new User());

        // Act
        var result = await _controller.AdminRecoveryUser(request);

        // Assert
        Assert.IsType<Epay3Net.Custom.ActionResult.ExceptionResult>(result);
    }

    [Fact]
    public async Task AdminRecoveryUser_ReturnsOk_WhenUserCreated()
    {
        // Arrange
        var request = new AdminRecoveryRequest
        {
            Mode = "C",
            User = "test",
            Password = "Password1!",
            Key = "key",
            Firstname = "F",
            Lastname = "L",
            Email = "e@e.com",
            Company = "C",
            AccountType = "SoldTo",
            Role = "User"
        };
        _mockUserManager.Setup(m => m.RecoverUser(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(new Status { MessageType = "S" });
        _mockUserManager.Setup(m => m.GetUserByLogin(request.User, It.IsAny<string>()))
            .ReturnsAsync((User?)null);
        _mockUserManager.Setup(m => m.GetUserByEmail(request.Email, It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        // Act
        var result = await _controller.AdminRecoveryUser(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal("User recoverd successfully", okResult.Value);

        _mockUserManager.Verify(m => m.CreateUser(It.Is<User>(u =>
            u.Login == request.User && u.Email == request.Email && u.FirstName == request.Firstname
        ), It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task AdminRecoveryUser_ReturnsError_WhenUserNotFound_InRecoveryMode()
    {
        // Arrange
        var request = new AdminRecoveryRequest { Mode = "R", User = "test", Password = "pwd", Key = "key" };
        _mockUserManager.Setup(m => m.RecoverUser(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(new Status { MessageType = "S" });
        _mockUserManager.Setup(m => m.GetUserByLogin(request.User, It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        // Act
        var result = await _controller.AdminRecoveryUser(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Recovery mode must use the recovery start endpoint.", badRequestResult.Value);
    }

    [Fact]
    public async Task StartAdminRecovery_ReturnsResetToken_WhenUpdateUserClearsSensitiveData()
    {
        // Arrange
        var request = new AdminRecoveryStartRequest { Key = "key", User = "testuser" };
        var user = new User { UserId = "u1", Login = request.User, Email = "test@example.com" };

        _mockUserManager.Setup(m => m.RecoverUser(request.Key, request.User, "R", It.IsAny<string>()))
            .ReturnsAsync(new Status { MessageType = "S" });
        _mockUserManager.Setup(m => m.GetUserByLogin(request.User, It.IsAny<string>()))
            .ReturnsAsync(user);
        _mockUserManager.Setup(m => m.UpdateUser(It.IsAny<User>(), It.IsAny<string>()))
            .Callback<User, string>((u, _) => u.PasswordResetToken = string.Empty)
            .ReturnsAsync(user);
        _mockAuthManager.Setup(m => m.UpdateLogonStatus(user, LoginStatusAction.PasswordReset, It.IsAny<string>()))
            .ReturnsAsync(user);

        // Act
        var result = await _controller.StartAdminRecovery(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var payload = JsonConvert.DeserializeObject<Dictionary<string, string>>(
            JsonConvert.SerializeObject(okResult.Value));

        Assert.False(string.IsNullOrWhiteSpace(payload?["resetToken"]));
    }

    // Simple Mock Session for testing
    public class MockSession : ISession
    {
        private readonly Dictionary<string, byte[]> _store = new Dictionary<string, byte[]>();
        public bool IsAvailable => true;
        public string Id => "mock-session-id";
        public IEnumerable<string> Keys => _store.Keys;

        public void Clear() => _store.Clear();
        public Task CommitAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task LoadAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
        public void Remove(string key) => _store.Remove(key);
        public void Set(string key, byte[] value) => _store[key] = value;
        public bool TryGetValue(string key, out byte[] value) => _store.TryGetValue(key, out value!);
    }
}

