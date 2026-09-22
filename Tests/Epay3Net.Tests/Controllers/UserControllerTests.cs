using Epay3Net.Controllers;
using Epay3Net.Custom.ActionResult;
using Epay3Net.Models;
using Epay3Net.Tests.TestData;
using Epay3Service.Clients.Models;
using Epay3Service.Configuration;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;
using Moq;
using Newtonsoft.Json.Linq;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;

namespace Epay3Net.Tests.Controllers;

public class UserControllerTests
{
    private readonly Mock<IConfiguration> _mockConfiguration;
    private readonly Mock<IUserManager> _mockUserManager;
    private readonly Mock<IAuthManager> _mockAuthManager;
    private readonly Mock<IAccountManager> _mockAccountManager;
    private readonly Mock<IInvoicesManager> _mockInvoiceManager;
    private readonly Mock<ILanguageManager> _mockLanguageManager;
    private readonly Mock<ILogger<UserController>> _mockLogger;
    private readonly Mock<IMailer> _mockMailer;
    private readonly ApplicationSecrets _secrets;
    private readonly Mock<IJwtKeyManager> _mockJwtKeyManager;
    private readonly UserController _controller;

    public UserControllerTests()
    {
        _mockConfiguration = new Mock<IConfiguration>();
        _mockUserManager = new Mock<IUserManager>();
        _mockAuthManager = new Mock<IAuthManager>();
        _mockAccountManager = new Mock<IAccountManager>();
        _mockInvoiceManager = new Mock<IInvoicesManager>();
        _mockLanguageManager = new Mock<ILanguageManager>();
        _mockLogger = new Mock<ILogger<UserController>>();
        _mockMailer = new Mock<IMailer>();
        _secrets = new ApplicationSecrets
        {
            RegistrationKey = "secret_key_must_be_long_enough_for_hmac_sha256",
            EncryptionKey = "encryption-key-that-is-long-enough"
        };
        _mockJwtKeyManager = new Mock<IJwtKeyManager>();
        _mockJwtKeyManager.Setup(m => m.GetActiveKeyAsync()).ReturnsAsync((new byte[64], "v1"));

        _controller = new UserController(
            _mockConfiguration.Object,
            _mockUserManager.Object,
            _mockAuthManager.Object,
            _mockAccountManager.Object,
            _mockInvoiceManager.Object,
            _mockLanguageManager.Object,
            _mockLogger.Object,
            _mockMailer.Object,
            _secrets,
            _mockJwtKeyManager.Object
        );

        // Setup common mocking behavior if needed
        _mockLanguageManager.Setup(l => l.GetMessage(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns((string key, string lang, string defaultMsg) => defaultMsg);

        // Setup Controller Context for User Claims
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
        {
            new Claim(ClaimTypes.Name, "testuser"),
            new Claim("UserId", "123")
        }, "mock"));

        _controller.ControllerContext = new ControllerContext()
        {
            HttpContext = new DefaultHttpContext() { User = user }
        };
    }

    [Fact]
    public async Task GetUsers_ReturnsOkWithUsers()
    {
        // Arrange
        // Using MockDataLoader via Epay3.Test.Common if needed, or manual list
        // Let's use MockDataLoader for consistency
        var allUsersData = Epay3.Test.Common.Helpers.MockDataLoader.Load<SapHttpData<List<User>>>("users.json");
        var users = allUsersData.Data ?? new List<User>();

        _mockUserManager.Setup(m => m.GetUsers(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(users);

        // Act
        var result = await _controller.GetUsers();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var returnUsers = Assert.IsAssignableFrom<IList<UserView>>(okResult.Value);
        Assert.Equal(users.Count, returnUsers.Count);
    }

    [Fact]
    public async Task GetUsers_Returns500_WhenExceptionOccurs()
    {
        // Arrange
        _mockUserManager.Setup(m => m.GetUsers(It.IsAny<string>(), It.IsAny<string>()))
            .ThrowsAsync(new Exception("SAP error"));

        // Act
        var result = await _controller.GetUsers();

        // Assert
        var statusCodeResult = Assert.IsType<StatusCodeResult>(result);
        Assert.Equal(500, statusCodeResult.StatusCode);
    }

    [Fact]
    public async Task GetById_ReturnsOk_WhenUserFound()
    {
        // Arrange
        var userId = "123";
        var user = new User
        {
            UserId = userId,
            Login = "testuser",
            PasswordHash = "hash",
            PasswordSalt = "salt",
            PasswordResetToken = "reset-token",
            ConfirmationToken = "confirmation-token",
            InviteToken = "invite-token",
            Accounts = Epay3.Test.Common.Helpers.MockDataLoader.Load<List<Account>>("accounts.json")
        };

        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>()))
            .ReturnsAsync(user);

        _mockAccountManager.Setup(m => m.GetAccountsByUser(user, It.IsAny<string>()))
            .ReturnsAsync(Epay3.Test.Common.Helpers.MockDataLoader.Load<List<Account>>("accounts.json"));

        // Act
        var result = await _controller.GetById(userId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var returnedUser = Assert.IsType<UserView>(okResult.Value);
        Assert.Equal(userId, returnedUser.UserId);
        Assert.Equal(userId, returnedUser.UserId);
        Assert.DoesNotContain("Password", returnedUser.GetType().GetProperties().Select(p => p.Name));
        Assert.DoesNotContain("PasswordHash", returnedUser.GetType().GetProperties().Select(p => p.Name));
        Assert.DoesNotContain("PasswordSalt", returnedUser.GetType().GetProperties().Select(p => p.Name));
        Assert.DoesNotContain("PasswordResetToken", returnedUser.GetType().GetProperties().Select(p => p.Name));
        Assert.DoesNotContain("ConfirmationToken", returnedUser.GetType().GetProperties().Select(p => p.Name));
        Assert.DoesNotContain("InviteToken", returnedUser.GetType().GetProperties().Select(p => p.Name));
        Assert.DoesNotContain("Accounts", returnedUser.GetType().GetProperties().Select(p => p.Name));
    }

    [Fact]
    public async Task GetById_ReturnsUserViewWithoutAccounts()
    {
        // Arrange
        var userId = "123";
        var user = new User { UserId = userId, Login = "testuser" };

        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>()))
            .ReturnsAsync(user);

        _mockAccountManager.Setup(m => m.GetAccountsByUser(user, It.IsAny<string>()))
            .ReturnsAsync((List<Account>?)null);

        // Act
        var result = await _controller.GetById(userId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var returnedUser = Assert.IsType<UserView>(okResult.Value);
        Assert.DoesNotContain("Accounts", returnedUser.GetType().GetProperties().Select(p => p.Name));
    }

    [Fact]
    public async Task GetById_ReturnsNotFound_WhenUserIsNull()
    {
        // Arrange
        var userId = "123";
        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        // Act
        var result = await _controller.GetById(userId);

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task GetById_ReturnsExceptionResult_WhenExceptionOccurs()
    {
        // Arrange
        var userId = "123";
        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>()))
            .ThrowsAsync(new Exception("SAP error"));

        // Act
        var result = await _controller.GetById(userId);

        // Assert
        var exceptionResult = Assert.IsType<ExceptionResult>(result);
    }

    [Fact]
    public async Task GetById_ReturnsBadRequest_WhenUserIdNull()
    {
        // Act
        var result = await _controller.GetById(null);

        // Assert
        Assert.IsType<BadRequestResult>(result);
    }

    [Fact]
    public async Task GetById_ReturnsForbid_WhenUserIdDiffersWithoutImpersonate()
    {
        var result = await _controller.GetById("456");

        Assert.IsType<ForbidResult>(result);
        _mockUserManager.Verify(
            m => m.GetUserById("456", It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task Create_ReturnsOk_WhenValidRequest()
    {
        // Arrange
        var requests = Epay3.Test.Common.Helpers.MockDataLoader.Load<JObject>("userrequests.json");
        var request = requests["CreateUser_Valid"].ToObject<AddChangeUserRequest>();

        _mockUserManager.Setup(m => m.GetUserByLogin(request.Login, It.IsAny<string>())).ReturnsAsync((User?)null);
        _mockUserManager.Setup(m => m.GetUserByEmail(request.Email, It.IsAny<string>())).ReturnsAsync((User?)null);
        _mockUserManager.Setup(m => m.CreateUser(It.IsAny<User>(), It.IsAny<string>()))
            .ReturnsAsync(new User { Login = request.Login });

        // Act
        var result = await _controller.Create(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        object? createdUserValue = okResult.Value?.GetType().GetProperty("user")?.GetValue(okResult.Value);
        Assert.NotNull(createdUserValue);
        var createdUser = Assert.IsType<User>(createdUserValue);
        Assert.Equal(request.Login, createdUser.Login);
    }

    [Fact]
    public async Task Create_SendsInviteEmail_WhenStatusWaitingConfirmationAndPasswordEmpty()
    {
        // Arrange
        var request = new AddChangeUserRequest
        {
            Login = "inviteuser",
            Email = "invite@test.com",
            FirstName = "Invite",
            LastName = "User",
            Company = "Company",
            Status = "waiting-confirmation",
            PrimaryAccountType = "Payer",
            Role = "user",
            Password = null // Missing password triggers invite
        };

        _mockUserManager.Setup(m => m.GetUserByLogin(request.Login, It.IsAny<string>())).ReturnsAsync((User?)null);
        _mockUserManager.Setup(m => m.GetUserByEmail(request.Email, It.IsAny<string>())).ReturnsAsync((User?)null);
        _mockUserManager.Setup(m => m.CreateUser(It.IsAny<User>(), It.IsAny<string>()))
            .ReturnsAsync(new User { Login = request.Login, Status = "waiting-confirmation" });

        // Act
        var result = await _controller.Create(request);

        // Assert
        Assert.IsType<OkObjectResult>(result);
        _mockMailer.Verify(m => m.SendInviteEmail(
            It.IsAny<string>(),
            It.Is<string>(fn => fn == request.FirstName),
            It.Is<MailboxAddress>(ma => ma.Address == request.Email),
            It.IsAny<string>(),
            It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task Create_SendsRegistrationConfirmation_WhenStatusWaitingConfirmationAndPasswordProvided()
    {
        // Arrange
        var request = new AddChangeUserRequest
        {
            Login = "confuser",
            Email = "conf@test.com",
            FirstName = "Conf",
            LastName = "User",
            Company = "Company",
            Status = "waiting-confirmation",
            PrimaryAccountType = "Payer",
            Role = "user",
            Password = "Password1!" // Provided password triggers confirmation
        };

        _mockUserManager.Setup(m => m.GetUserByLogin(request.Login, It.IsAny<string>())).ReturnsAsync((User?)null);
        _mockUserManager.Setup(m => m.GetUserByEmail(request.Email, It.IsAny<string>())).ReturnsAsync((User?)null);
        _mockUserManager.Setup(m => m.CreateUser(It.IsAny<User>(), It.IsAny<string>()))
            .ReturnsAsync(new User { Login = request.Login, Status = "waiting-confirmation" });

        // Act
        var result = await _controller.Create(request);

        // Assert
        Assert.IsType<OkObjectResult>(result);
        _mockMailer.Verify(m => m.SendRegistrationConfirmation(
            It.IsAny<string>(),
            It.Is<string>(fn => fn == request.FirstName),
            It.Is<MailboxAddress>(ma => ma.Address == request.Email),
            It.IsAny<string>(),
            It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task Create_Returns500_WhenInternalErrorOccurs()
    {
        // Arrange
        var requests = Epay3.Test.Common.Helpers.MockDataLoader.Load<JObject>("userrequests.json");
        var validRequest = requests["CreateUser_Valid"].ToObject<AddChangeUserRequest>();

        _mockUserManager.Setup(m => m.GetUserByLogin(validRequest.Login, It.IsAny<string>())).ReturnsAsync((User?)null);
        _mockUserManager.Setup(m => m.GetUserByEmail(validRequest.Email, It.IsAny<string>())).ReturnsAsync((User?)null);

        // Force exception in CreateUser
        _mockUserManager.Setup(m => m.CreateUser(It.IsAny<User>(), It.IsAny<string>()))
            .ThrowsAsync(new Exception("SAP error"));

        // Act
        var result = await _controller.Create(validRequest);

        // Assert
        Assert.IsType<ExceptionResult>(result);
    }

    [Fact]
    public async Task Create_ReturnsBadRequest_WhenRequestNull()
    {
        // Act
        var result = await _controller.Create(null!);

        // Assert
        Assert.IsType<BadRequestResult>(result);
    }

    [Fact]
    public async Task Create_ReturnsBadRequest_WhenValidationFails()
    {
        // Arrange
        var request = new AddChangeUserRequest(); // Empty request triggers validation errors

        // Mock language manager to return error messages
        _mockLanguageManager.Setup(m => m.GetMessage(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns("Validation Error");

        // Act
        var result = await _controller.Create(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.IsType<string>(badRequestResult.Value);
    }

    [Theory]
    [MemberData(nameof(UserControllerTestData.InvalidCreateRequests), MemberType = typeof(UserControllerTestData))]
    public async Task Create_ReturnsBadRequest_WhenValidationFails_Theory(AddChangeUserRequest request, string expectedError)
    {
        // Arrange
        // For scenarios that require unique checks (like "WhenLoginExists"), we might need specific mocks.
        // But the InvalidCreateRequests currently only covers format/required checks which don't hit the DB if the check fails early?
        // Wait, CheckRequired returns false if failed. 
        // For "Exists" checks, the code *Does* hit the DB.
        // My current InvalidCreateRequests only includes Required/Format checks.
        // Those checks rely on CheckRequired/CheckValue.
        // If those fail, the code adds error and (sometimes) continues?
        // CheckRequired returns false if invalid.
        // If Create's logic is:
        // if (CheckRequired(...)) { check unique }
        // Then if required fails, unique check is skipped.
        // So for "Required" tests, we don't need to mock uniqueness.
        // For "Invalid Format" tests (Email), logic is:
        // if (CheckRequired(..., email...)) { if (!regex...) error; else check unique }
        // So if regex fails, unique check is skipped?
        // Let's check ValidateCreateUserRequest...
        // if (CheckRequired(..., email...)) { if (!regex) error; else if (unique) error; }
        // So if regex fails, unique is skipped.
        // So we don't need to mock uniqueness for these invalid cases either.

        // However, we DO need to ensure other things don't blow up.
        // The controller uses _languageManager.
        _mockLanguageManager.Setup(m => m.GetMessage(It.IsAny<string>(), It.IsAny<string>(), expectedError))
            .Returns(expectedError);

        // For "Login Required", CheckRequired returns false, avoiding DB call.
        // For "Email Required", same.
        // For "Email Invalid", CheckRequired returns true, Regex fails, Unique check skipped.
        // So typically no DB calls for these.

        // Act
        var result = await _controller.Create(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        var error = Assert.IsType<string>(badRequestResult.Value);
        Assert.Contains(expectedError, error);
    }



    [Fact]
    public async Task Create_ReturnsBadRequest_WhenLoginExists()
    {
        // Arrange
        var request = new AddChangeUserRequest { Login = "existing" };
        _mockUserManager.Setup(m => m.GetUserByLogin("existing", It.IsAny<string>())).ReturnsAsync(new User());
        _mockLanguageManager.Setup(m => m.GetMessage(It.IsAny<string>(), It.IsAny<string>(), "A user with the specified ID already exists"))
            .Returns("A user with the specified ID already exists");

        // Act
        var result = await _controller.Create(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        var error = Assert.IsType<string>(badRequestResult.Value);
        Assert.Contains("A user with the specified ID already exists", error);
    }

    [Fact]
    public async Task Create_ReturnsBadRequest_WhenEmailExists()
    {
        // Arrange
        var request = new AddChangeUserRequest { Login = "new", Email = "existing@test.com" };
        _mockUserManager.Setup(m => m.GetUserByLogin("new", It.IsAny<string>())).ReturnsAsync((User?)null);
        _mockUserManager.Setup(m => m.GetUserByEmail("existing@test.com", It.IsAny<string>())).ReturnsAsync(new User());
        _mockLanguageManager.Setup(m => m.GetMessage(It.IsAny<string>(), It.IsAny<string>(), "A user with the specified email already exists"))
            .Returns("A user with the specified email already exists");

        // Act
        var result = await _controller.Create(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        var error = Assert.IsType<string>(badRequestResult.Value);
        Assert.Contains("A user with the specified email already exists", error);
    }


    [Fact]
    public async Task Create_ReturnsBadRequest_WhenAdminRoleRestricted()
    {
        // Arrange
        var request = new AddChangeUserRequest { Login = "valid", Email = "valid@test.com", FirstName = "First", LastName = "Last", Company = "Co", Status = "active", PrimaryAccountType = "payer", Role = "admin" };
        _mockUserManager.Setup(m => m.GetUserByLogin("valid", It.IsAny<string>())).ReturnsAsync((User?)null);
        _mockUserManager.Setup(m => m.GetUserByEmail("valid@test.com", It.IsAny<string>())).ReturnsAsync((User?)null);

        // Mock language manager for admin check messages
        _mockLanguageManager.Setup(m => m.GetMessage(It.IsAny<string>(), It.IsAny<string>(), "Admin"))
            .Returns("Admin");
        _mockLanguageManager.Setup(m => m.GetMessage(It.IsAny<string>(), It.IsAny<string>(), "Only '{admin}' users can assign '{admin}' role"))
            .Returns("Only 'Admin' users can assign 'Admin' role");

        // Ensure current user (setup in constructor) does NOT have admin role. 
        // Providing specific context here to be safe and explicit, although constructor default should work.
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { new Claim(ClaimTypes.Name, "testuser") }, "mock"));
        _controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = user } };


        // Act
        var result = await _controller.Create(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        var error = Assert.IsType<string>(badRequestResult.Value);
        Assert.Contains("Only 'Admin' users can assign 'Admin' role", error);
    }



    [Fact]
    public async Task Update_ReturnsNotFound_WhenUserNotFound()
    {
        // Arrange
        var request = new AddChangeUserRequest { UserId = "123" };
        _mockUserManager.Setup(m => m.GetUserById("123", It.IsAny<string>())).ReturnsAsync((User?)null);
        _mockLanguageManager.Setup(m => m.GetMessage(It.IsAny<string>(), It.IsAny<string>(), "Specified user was not found"))
            .Returns("Specified user was not found");

        // Act
        var result = await _controller.Update(request);

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }

    [Theory]
    [MemberData(nameof(UserControllerTestData.InvalidUpdateRequests), MemberType = typeof(UserControllerTestData))]
    public async Task Update_ReturnsBadRequest_WhenValidationFails_Theory(AddChangeUserRequest request, string expectedError)
    {
        // Arrange
        var userId = request.UserId;
        // Ensure user exists so validation proceeds
        var user = new User { UserId = userId, Login = "old", Email = "old@test.com", Role = "user" };

        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>())).ReturnsAsync(user);

        _mockLanguageManager.Setup(m => m.GetMessage(It.IsAny<string>(), It.IsAny<string>(), expectedError))
            .Returns(expectedError);

        // Act
        var result = await _controller.Update(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        var resString = Assert.IsType<string>(badRequestResult.Value);
        Assert.Contains(expectedError, resString);
    }

    [Fact]
    public async Task Update_ReturnsBadRequest_WhenLoginExists()
    {
        // Arrange
        var userId = "123";
        var user = new User { UserId = userId, Login = "old" };
        var request = new AddChangeUserRequest { UserId = userId, Login = "new" };

        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>())).ReturnsAsync(user);
        _mockUserManager.Setup(m => m.GetUserByLogin("new", It.IsAny<string>())).ReturnsAsync(new User());
        _mockLanguageManager.Setup(m => m.GetMessage(It.IsAny<string>(), It.IsAny<string>(), "A user with the specified ID already exists"))
            .Returns("A user with the specified ID already exists");

        // Act
        var result = await _controller.Update(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        var resString = Assert.IsType<string>(badRequestResult.Value);
        Assert.Contains("A user with the specified ID already exists", resString);
    }



    [Fact]
    public async Task Update_ReturnsBadRequest_WhenEmailExists()
    {
        // Arrange
        var userId = "123";
        var user = new User { UserId = userId, Login = "old", Email = "old@test.com" };
        var request = new AddChangeUserRequest { UserId = userId, Login = "old", Email = "new@test.com" };

        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>())).ReturnsAsync(user);
        _mockUserManager.Setup(m => m.GetUserByEmail("new@test.com", It.IsAny<string>())).ReturnsAsync(new User());
        _mockLanguageManager.Setup(m => m.GetMessage(It.IsAny<string>(), It.IsAny<string>(), "A user with the specified email already exists"))
            .Returns("A user with the specified email already exists");

        // Act
        var result = await _controller.Update(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        var resString = Assert.IsType<string>(badRequestResult.Value);
        Assert.Contains("A user with the specified email already exists", resString);
    }



    [Fact]
    public async Task Update_ReturnsBadRequest_WhenAdminRoleRestricted()
    {
        // Arrange
        var userId = "123";
        var user = new User { UserId = userId, Login = "old", Email = "old@test.com", Role = "user" }; // Old role not admin
        var request = new AddChangeUserRequest { UserId = userId, Login = "old", Email = "old@test.com", FirstName = "First", LastName = "Last", Company = "Co", Status = "active", PrimaryAccountType = "payer", Role = "admin" }; // Trying to set admin

        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>())).ReturnsAsync(user);

        // Mock language manager for admin check messages
        _mockLanguageManager.Setup(m => m.GetMessage(It.IsAny<string>(), It.IsAny<string>(), "Admin"))
            .Returns("Admin");
        _mockLanguageManager.Setup(m => m.GetMessage(It.IsAny<string>(), It.IsAny<string>(), "Only '{admin}' users can assign '{admin}' role"))
            .Returns("Only 'Admin' users can assign 'Admin' role");

        // Ensure current user is NOT admin
        var currentUser = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { new Claim(ClaimTypes.Name, "testuser") }, "mock"));
        _controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = currentUser } };

        // Act
        var result = await _controller.Update(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        var resString = Assert.IsType<string>(badRequestResult.Value);
        Assert.Contains("Only 'Admin' users can assign 'Admin' role", resString);
    }

    [Fact]
    public async Task Update_ReturnsOk_WhenValidRequest()
    {
        // Arrange
        var requests = Epay3.Test.Common.Helpers.MockDataLoader.Load<JObject>("userrequests.json");
        var request = requests["UpdateUser_Valid"].ToObject<AddChangeUserRequest>();

        var existingUser = new User { UserId = "123", Login = "oldlogin", Email = "old@test.com" };

        _mockUserManager.Setup(m => m.GetUserById(request.UserId, It.IsAny<string>())).ReturnsAsync(existingUser);
        _mockUserManager.Setup(m => m.GetUserByLogin(request.Login, It.IsAny<string>())).ReturnsAsync((User?)null); // No conflict
        _mockUserManager.Setup(m => m.GetUserByEmail(request.Email, It.IsAny<string>())).ReturnsAsync((User?)null); // No conflict

        _mockUserManager.Setup(m => m.UpdateUser(It.IsAny<User>(), It.IsAny<string>()))
            .ReturnsAsync(new User { Login = request.Login });

        // Act
        var result = await _controller.Update(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var updatedUser = Assert.IsType<User>(okResult.Value);
        Assert.Equal(request.Login, updatedUser.Login);
    }

    [Fact]
    public async Task Update_UpdatesPassword_WhenPasswordProvided()
    {
        // Arrange
        var requests = Epay3.Test.Common.Helpers.MockDataLoader.Load<JObject>("userrequests.json");
        var request = requests["UpdateUser_Valid"].ToObject<AddChangeUserRequest>();
        request.Password = "Newpassword1!";

        var existingUser = new User { UserId = request.UserId, Login = request.Login, Email = request.Email, Role = request.Role };

        _mockUserManager.Setup(m => m.GetUserById(request.UserId, It.IsAny<string>())).ReturnsAsync(existingUser);
        _mockUserManager.Setup(m => m.UpdateUser(It.IsAny<User>(), It.IsAny<string>()))
            .ReturnsAsync(existingUser); // mocking return, but verification is on call arguments

        // Act
        var result = await _controller.Update(request);

        // Assert
        Assert.IsType<OkObjectResult>(result);
        _mockUserManager.Verify(m => m.UpdateUser(It.Is<User>(u =>
            !string.IsNullOrEmpty(u.PasswordHash) &&
            !string.IsNullOrEmpty(u.PasswordSalt) &&
            u.LastPasswordChange.HasValue
        ), It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task Update_Returns500_WhenInternalErrorOccurs()
    {
        // Arrange
        var requests = Epay3.Test.Common.Helpers.MockDataLoader.Load<JObject>("userrequests.json");
        var validRequest = requests["UpdateUser_Valid"].ToObject<AddChangeUserRequest>();
        var user = new User { UserId = validRequest.UserId, Login = validRequest.Login, Email = validRequest.Email, Role = "User" };

        _mockUserManager.Setup(m => m.GetUserById(validRequest.UserId, It.IsAny<string>())).ReturnsAsync(user);

        // Force exception in UpdateUser
        _mockUserManager.Setup(m => m.UpdateUser(It.IsAny<User>(), It.IsAny<string>()))
            .ThrowsAsync(new Exception("SAP error"));

        // Act
        var result = await _controller.Update(validRequest);

        // Assert
        Assert.IsType<ExceptionResult>(result);
    }

    [Fact]
    public async Task Update_ReturnsBadRequest_WhenRequestNull()
    {
        // Act
        var result = await _controller.Update(null!);

        // Assert
        Assert.IsType<BadRequestResult>(result);
    }

    [Fact]
    public async Task Update_ReturnsBadRequest_WhenValidationFails()
    {
        // Arrange
        var request = new AddChangeUserRequest { UserId = "123" }; // Empty validation triggers validation errors
        var language = "en";
        _mockLanguageManager.Setup(m => m.GetMessage(It.IsAny<string>(), language, It.IsAny<string>()))
            .Returns("Validation Error");
        _mockUserManager.Setup(m => m.GetUserById("123", It.IsAny<string>()))
            .ReturnsAsync(new User { Login = "testlogin", Email = "test@example.com", Role = "user" });

        // Act
        var result = await _controller.Update(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.IsType<string>(badRequestResult.Value);
    }

    [Fact]
    public async Task Delete_ReturnsOk_WhenUserExists()
    {
        // Arrange
        var userId = "123";
        var user = new User { UserId = userId };
        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>())).ReturnsAsync(user);
        _mockUserManager.Setup(m => m.DeleteUser(user, It.IsAny<string>())).ReturnsAsync((User?)null);

        // Act
        var result = await _controller.Delete(userId);

        // Assert
        Assert.IsType<OkResult>(result);
    }

    [Fact]
    public async Task Delete_ReturnsExceptionResult_WhenExceptionOccurs()
    {
        // Arrange
        var userId = "123";
        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>()))
            .ThrowsAsync(new Exception("SAP error"));

        // Act
        var result = await _controller.Delete(userId);

        // Assert
        var exceptionResult = Assert.IsType<ExceptionResult>(result);
    }

    [Fact]
    public async Task Delete_ReturnsBadRequest_WhenUserIdNull()
    {
        // Act
        var result = await _controller.Delete(null!);

        // Assert
        Assert.IsType<BadRequestResult>(result);
    }

    [Fact]
    public async Task Delete_ReturnsNotFound_WhenUserNotFound()
    {
        // Arrange
        var userId = "123";
        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>())).ReturnsAsync((User?)null);

        // Act
        var result = await _controller.Delete(userId);

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task ChangePassword_ReturnsOk_WhenValid()
    {
        // Arrange
        var requests = Epay3.Test.Common.Helpers.MockDataLoader.Load<JObject>("userrequests.json");
        var request = requests["ChangePassword_Valid"].ToObject<PasswordChangeRequest>();
        var user = new User { FirstName = "Test", LastName = "User", Email = "test@test.com", PasswordResetToken = "token" };

        _mockAuthManager.Setup(m => m.ValidateLogin(It.IsAny<string>(), "old", It.IsAny<string>())).ReturnsAsync(user);

        // Mocking Controller Context User Identity Name which is used in ChangePassword
        var claims = new List<Claim> { new Claim(ClaimTypes.Name, "testuser") };
        var identity = new ClaimsIdentity(claims, "TestAuthType");
        var claimsPrincipal = new ClaimsPrincipal(identity);
        _controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = claimsPrincipal } };
        // Additionally need to set headers for country
        _controller.ControllerContext.HttpContext.Request.Headers["X-Country"] = "US";


        _mockUserManager.Setup(m => m.UpdateUser(user, It.IsAny<string>())).ReturnsAsync(user);

        // Fix: UpdateLogonStatus expects LoginStatusAction enum and returns Task<User>
        _mockAuthManager.Setup(m => m.UpdateLogonStatus(user, It.IsAny<LoginStatusAction>(), It.IsAny<string>()))
            .ReturnsAsync(user);

        _mockMailer.Setup(m => m.SendPasswordChangedEmail(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<MimeKit.MailboxAddress>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _controller.ChangePassword(request);

        // Assert
        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task ChangePassword_ReturnsExceptionResult_WhenExceptionOccurs()
    {
        // Arrange
        var requests = Epay3.Test.Common.Helpers.MockDataLoader.Load<JObject>("userrequests.json");
        var request = requests["ChangePassword_Valid"].ToObject<PasswordChangeRequest>();

        // Mock exception
        _mockAuthManager.Setup(m => m.ValidateLogin(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
             .ThrowsAsync(new Exception("Auth error"));

        // Act
        var result = await _controller.ChangePassword(request);

        // Assert
        var exceptionResult = Assert.IsType<ExceptionResult>(result);
    }

    [Fact]
    public async Task ChangePassword_ReturnsBadRequest_WhenNewPwMismatch()
    {
        // Arrange
        var request = new PasswordChangeRequest { NewPassword = "new", NewPasswordConfirmation = "mismatch" };

        // Act
        var result = await _controller.ChangePassword(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task ChangePassword_ReturnsBadRequest_WhenNewPwSameAsOld()
    {
        // Arrange
        var request = new PasswordChangeRequest { CurrentPassword = "old", NewPassword = "old", NewPasswordConfirmation = "old" };
        var language = "en";
        _mockLanguageManager.Setup(m => m.GetMessage(It.IsAny<string>(), language, It.IsAny<string>()))
            .Returns("Error Message");

        // Act
        var result = await _controller.ChangePassword(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task ChangePassword_ReturnsUnauthorized_WhenCurrentPwIncorrect()
    {
        // Arrange
        var request = new PasswordChangeRequest { CurrentPassword = "wrong", NewPassword = "Password1!", NewPasswordConfirmation = "Password1!" };
        var language = "en";
        _mockLanguageManager.Setup(m => m.GetMessage(It.IsAny<string>(), language, It.IsAny<string>()))
            .Returns("Error Message");

        // Mock AuthManager to return null (invalid login)
        _mockAuthManager.Setup(m => m.ValidateLogin(It.IsAny<string>(), request.CurrentPassword, It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        // Mock Controller Context for User Identity
        var claims = new List<Claim> { new Claim(ClaimTypes.Name, "testuser") };
        var identity = new ClaimsIdentity(claims, "TestAuthType");
        var claimsPrincipal = new ClaimsPrincipal(identity);
        _controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = claimsPrincipal } };


        // Act
        var result = await _controller.ChangePassword(request);

        // Assert
        var unauthorizedResult = Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task PasswordResetRequest_ReturnsOk_WhenUserFound()
    {
        // Arrange
        var requests = Epay3.Test.Common.Helpers.MockDataLoader.Load<JObject>("userrequests.json");
        var request = requests["PasswordResetRequest_Valid"].ToObject<RequestPasswordReset>();
        var user = new User { FirstName = "Test", LastName = "User", Email = "test@test.com" };

        _mockUserManager.Setup(m => m.GetUserByEmail(request.Email, It.IsAny<string>())).ReturnsAsync(user);
        _mockUserManager.Setup(m => m.UpdateUser(It.IsAny<User>(), It.IsAny<string>()))
            .Callback<User, string>((u, _) => u.PasswordResetToken = string.Empty)
            .ReturnsAsync(user);
        _mockMailer.Setup(m => m.SendResetPasswordEmail(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<MimeKit.MailboxAddress>(),
                It.Is<string>(token => !string.IsNullOrWhiteSpace(token)),
                It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        _mockAuthManager.Setup(m => m.UpdateLogonStatus(user, It.IsAny<LoginStatusAction>(), It.IsAny<string>()))
            .ReturnsAsync(user);

        // Headers
        _controller.ControllerContext.HttpContext.Request.Headers["Accept-Language"] = "en";
        _controller.ControllerContext.HttpContext.Request.Headers["X-Country"] = "US";

        // Act
        var result = await _controller.PasswordResetRequest(request);

        // Assert
        Assert.IsType<OkObjectResult>(result);
        _mockMailer.VerifyAll();
    }

    [Fact]
    public async Task PasswordResetRequest_ReturnsBadRequest_WhenEmailNull()
    {
        // Arrange
        var request = new RequestPasswordReset { Email = null! };

        // Act
        var result = await _controller.PasswordResetRequest(request);

        // Assert
        Assert.IsType<BadRequestResult>(result);
    }

    [Fact]
    public async Task CompletePasswordReset_ReturnsOk_WhenValid()
    {
        // Arrange
        var requests = Epay3.Test.Common.Helpers.MockDataLoader.Load<JObject>("userrequests.json");
        var request = requests["CompletePasswordReset_Valid"].ToObject<CompletePasswordResetForm>();
        var user = new User { UserId = "123" };

        _mockUserManager.Setup(m => m.GetUserByResetPassword(request.Id, It.IsAny<string>())).ReturnsAsync(user);
        _mockUserManager.Setup(m => m.UpdateUser(user, It.IsAny<string>())).ReturnsAsync(user);

        // Act
        var result = await _controller.CompletePasswordReset(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal("Success", okResult.Value);
    }

    [Fact]
    public async Task CompletePasswordReset_ReturnsBadRequest_WhenUserNotFound()
    {
        // Arrange
        var request = new CompletePasswordResetForm { Id = "invalid" };
        _mockUserManager.Setup(m => m.GetUserByResetPassword(request.Id, It.IsAny<string>())).ReturnsAsync((User?)null);

        // Act
        var result = await _controller.CompletePasswordReset(request);

        // Assert
        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(400, objectResult.StatusCode);
    }

    [Fact]
    public async Task CompletePasswordReset_ReturnsBadRequest_WhenPasswordsDoNotMatch()
    {
        // Arrange
        var request = new CompletePasswordResetForm { Id = "valid", Password = "new", ConfirmPassword = "mismatch" };
        var user = new User { UserId = "123" };
        _mockUserManager.Setup(m => m.GetUserByResetPassword(request.Id, It.IsAny<string>())).ReturnsAsync(user);

        // Act
        var result = await _controller.CompletePasswordReset(request);

        // Assert
        var statusCodeResult = Assert.IsType<StatusCodeResult>(result);
        Assert.Equal(400, statusCodeResult.StatusCode);
    }

    [Fact]
    public async Task GetUserAccounts_ReturnsOk_WithAccounts()
    {
        // Arrange
        var userId = "123";
        var user = new User { UserId = userId };
        var accounts = Epay3.Test.Common.Helpers.MockDataLoader.Load<List<Account>>("accounts.json");
        var accountViews = accounts.Select(x => new AccountView
        {
            AccountId = x.AccountId,
            UserId = x.UserId,
            PrimaryAcct = x.PrimaryAcct,
            AccountTypeId = x.AccountTypeId,
            CompanyCode = x.CompanyCode
        }).ToList();

        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>())).ReturnsAsync(user);
        _mockAccountManager.Setup(m => m.GetAccountViewsByUser(user, It.IsAny<string>(), false)).ReturnsAsync(accountViews);

        // Act
        var result = await _controller.GetUserAccounts(userId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<UserAccountsResponse>(okResult.Value);
        Assert.Equal(accountViews.Count, response.Accounts.Count);
        Assert.Equal(accountViews[0].AccountId, response.Accounts[0].AccountId);
    }

    [Fact]
    public async Task GetUserAccounts_PopulatesAutoPayLastFourDigitsFromResolvedPaymentCards()
    {
        var userId = "123";
        var user = new User { UserId = userId };
        const string paymentCardToken = "-E803-0002-PH3AE4RZAK831S";
        var accountViews = new List<AccountView>
        {
            new()
            {
                AccountId = "acct-1",
                UserId = userId,
                PrimaryAcct = "4000",
                ResolvedPayerDetails = new PayerDetail
                {
                    PaymentCards = new List<PaymentCard>
                    {
                        new() { PaymentCardToken = paymentCardToken, CardLast4Digit = "0002" }
                    },
                    PayerAutoPayStatus = new List<AutoPayStatus>
                    {
                        new() { CompanyCode = "3000", PaymentMethod = "CC", PaymentCardToken = paymentCardToken }
                    },
                }
            }
        };

        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>())).ReturnsAsync(user);
        _mockAccountManager.Setup(m => m.GetAccountViewsByUser(user, It.IsAny<string>(), false)).ReturnsAsync(accountViews);

        var result = await _controller.GetUserAccounts(userId);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<UserAccountsResponse>(okResult.Value);
        AutoPayStatus autoPayStatus = Assert.Single(Assert.Single(response.Accounts).ResolvedPayerDetails!.PayerAutoPayStatus!);
        Assert.Equal("0002", autoPayStatus.CardLast4Digit);
        Assert.NotEqual(paymentCardToken, autoPayStatus.PaymentCardToken);
    }

    [Fact]
    public async Task GetUserAccounts_ReturnsConciseUiDtoShape()
    {
        var userId = "123";
        var user = new User { UserId = userId };
        var accountViews = new List<AccountView>
        {
            new()
            {
                AccountId = "acct-1",
                UserId = userId,
                PrimaryAcct = "4000",
                AccountTypeId = "Payer",
                CompanyCode = "3000",
                SalesOrganization = "3000",
                DistributionChannel = "10",
                Division = "00",
                AllowPayments = true,
                AllowDeposits = true,
                PayerDet = new PayerDetail
                {
                    PaymentCards = new List<PaymentCard>
                    {
                        new() { PaymentCardToken = "-E803-0002-PH3AE4RZAK831S", CardLast4Digit = "0002" }
                    }
                },
                PayerDetail = new PayerDetail
                {
                    PaymentCards = new List<PaymentCard>
                    {
                        new() { PaymentCardToken = "-E803-0002-PH3AE4RZAK831S", CardLast4Digit = "0002" }
                    }
                },
                ResolvedPayerDetails = new PayerDetail
                {
                    IsAutoPayEnrolled = true,
                    PaymentCards = new List<PaymentCard>
                    {
                        new() { PaymentCardToken = "-E803-0002-PH3AE4RZAK831S", CardLast4Digit = "0002" }
                    },
                    PayerAutoPayStatus = new List<AutoPayStatus>
                    {
                        new() { CompanyCode = "3000", PaymentMethod = "CC", PaymentCardToken = "-E803-0002-PH3AE4RZAK831S", CardLast4Digit = "0002" }
                    }
                },
                DefaultPayer = new RelatedAccount
                {
                    PrimaryAccount = "4000",
                    CompanyCode = "3000"
                }
            }
        };

        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>())).ReturnsAsync(user);
        _mockAccountManager.Setup(m => m.GetAccountViewsByUser(user, It.IsAny<string>(), false)).ReturnsAsync(accountViews);

        var result = await _controller.GetUserAccounts(userId);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<UserAccountsResponse>(okResult.Value);
        var account = Assert.Single(response.Accounts);

        Assert.Equal("4000", account.PrimaryAcct);
        Assert.True(account.AllowPayments);
        Assert.True(account.AllowDeposits);
        Assert.NotNull(account.ResolvedPayerDetails);
        Assert.Equal("4000", account.ResolvedPayerDetails!.CustomerNumber);
        Assert.Equal("3000", account.ResolvedPayerDetails.CompanyCode);

        var json = JsonSerializer.Serialize(okResult.Value, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        Assert.DoesNotContain("payerDet", json);
        Assert.DoesNotContain("soldToDet", json);
        Assert.DoesNotContain("payerDetail", json);
        Assert.DoesNotContain("soldToDetail", json);
    }

    [Fact]
    public async Task GetUserAccounts_ReturnsForbid_WhenUserIdNull_AndNoClaim()
    {
        // Arrange
        // Clear conflicting headers or context if necessary, though new setup below should override
        _controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
        // Ensure no user principal or claims

        var language = "en";
        _mockLanguageManager.Setup(m => m.GetMessage(It.IsAny<string>(), language, It.IsAny<string>()))
            .Returns("Forbid Error");

        // Act
        var result = await _controller.GetUserAccounts(null);

        // Assert
        var forbidResult = Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task GetUserAccounts_ReturnsOk_WhenUserIdNull_AndPrincipalHasId()
    {
        // Arrange
        var userId = "123";
        var user = new User { UserId = userId };
        var accounts = Epay3.Test.Common.Helpers.MockDataLoader.Load<List<Account>>("accounts.json");
        var accountViews = accounts.Select(x => new AccountView
        {
            AccountId = x.AccountId,
            UserId = x.UserId,
            PrimaryAcct = x.PrimaryAcct,
            AccountTypeId = x.AccountTypeId
        }).ToList();

        // Setup User Principal with UserId claim
        var claims = new List<Claim> { new Claim("UserId", userId) };
        var identity = new ClaimsIdentity(claims, "TestAuthType");
        var claimsPrincipal = new ClaimsPrincipal(identity);
        _controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = claimsPrincipal } };

        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>())).ReturnsAsync(user);
        _mockAccountManager.Setup(m => m.GetAccountViewsByUser(user, It.IsAny<string>(), false)).ReturnsAsync(accountViews);

        // Act
        var result = await _controller.GetUserAccounts(null);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<UserAccountsResponse>(okResult.Value);
        Assert.Equal(accountViews.Count, response.Accounts.Count);
    }

    [Fact]
    public async Task GetUserAccounts_ReturnsForbid_WhenUserIdDiffersWithoutImpersonate()
    {
        var result = await _controller.GetUserAccounts("456");

        Assert.IsType<ForbidResult>(result);
        _mockUserManager.Verify(
            m => m.GetUserById("456", It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task GetUserAccounts_ForwardsForceRefresh()
    {
        var userId = "123";
        var user = new User { UserId = userId };

        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>())).ReturnsAsync(user);
        _mockAccountManager.Setup(m => m.GetAccountViewsByUser(user, It.IsAny<string>(), true))
            .ReturnsAsync([]);

        var result = await _controller.GetUserAccounts(userId, true);

        Assert.IsType<OkObjectResult>(result);
        _mockAccountManager.Verify(m => m.GetAccountViewsByUser(user, It.IsAny<string>(), true), Times.Once);
    }

    [Fact]
    public async Task GetUserAccounts_ReturnsForbid_WhenUserNotFound()
    {
        // Arrange
        var userId = "123";
        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>())).ReturnsAsync((User?)null);
        var language = "en";
        _mockLanguageManager.Setup(m => m.GetMessage(It.IsAny<string>(), language, It.IsAny<string>()))
            .Returns("User not found");

        // Act
        var result = await _controller.GetUserAccounts(userId);

        // Assert
        var forbidResult = Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task AddAccountByInvoice_ReturnsBadRequest_WhenUserIdIsNull()
    {
        // Act
        var result = await _controller.AddAccountByInvoice(null!, new InvoiceAccountRequest());

        // Assert
        Assert.IsType<BadRequestResult>(result);
    }

    [Fact]
    public async Task AddAccountByInvoice_ReturnsForbid_WhenUserNotFound()
    {
        // Arrange
        var userId = "123";
        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>())).ReturnsAsync((User?)null);
        var language = "en";
        _mockLanguageManager.Setup(m => m.GetMessage(It.IsAny<string>(), language, It.IsAny<string>()))
            .Returns("User not found");

        // Act
        var result = await _controller.AddAccountByInvoice(userId, new InvoiceAccountRequest());

        // Assert
        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task AddAccountByInvoice_ReturnsNotFound_WhenInvoiceMismatch()
    {
        // Arrange
        var userId = "123";
        var user = new User { UserId = userId };
        var request = new InvoiceAccountRequest { AccountNumber = "100", InvoiceNumber = "INV1", InvoiceAmount = 50 }; // Amount mismatch
        var invoiceDetail = new InvoiceDetailResponse
        {
            Detail = new InvoiceDetail
            {
                HeaderData = new InvoiceHeaderData { TotalAmount = 100, SoldtoNumber = "100" }
            }
        };

        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>())).ReturnsAsync(user);
        _mockInvoiceManager.Setup(m => m.GetInvoiceDetails(It.IsAny<DocumentDetail>(), It.IsAny<string>())).ReturnsAsync(invoiceDetail);
        _mockConfiguration.Setup(c => c.GetSection("Registration:MatchSoldTo").Value).Returns("true");
        // Mock GetValue extension behavior if needed, or ensuring configuration setup supports key lookup. 
        // Note: Generic GetValue<T> relies on binding, basic Value return works if mocked correctly or using configuration provider.
        // Simplified approach: Assuming basic mock setup might need specific key handling if methods are extensions.
        // However, IConfiguration.GetSection().Value returns string. The extension method uses this.

        // Act
        var result = await _controller.AddAccountByInvoice(userId, request);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task AddAccountByInvoice_ReturnsNotFound_WhenCompanyCodeMissing()
    {
        // Arrange
        var userId = "123";
        var user = new User { UserId = userId };
        var request = new InvoiceAccountRequest { AccountNumber = "100", InvoiceNumber = "INV1", InvoiceAmount = 100 };
        var invoiceDetail = new InvoiceDetailResponse
        {
            Detail = new InvoiceDetail
            {
                HeaderData = new InvoiceHeaderData { TotalAmount = 100, SoldtoNumber = "100", CompanyCode = "" } // Missing CompanyCode
            }
        };

        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>())).ReturnsAsync(user);
        _mockInvoiceManager.Setup(m => m.GetInvoiceDetails(It.IsAny<DocumentDetail>(), It.IsAny<string>())).ReturnsAsync(invoiceDetail);
        _mockConfiguration.Setup(c => c.GetSection("Registration:MatchSoldTo").Value).Returns("true");

        // Act
        var result = await _controller.AddAccountByInvoice(userId, request);

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task AddAccountByInvoice_ReturnsNotFound_WhenPartnerNotFound()
    {
        // Arrange
        var userId = "123";
        var user = new User { UserId = userId, PrimaryAccountType = "payer" }; // Requires RG partner
        var request = new InvoiceAccountRequest { AccountNumber = "100", InvoiceNumber = "INV1", InvoiceAmount = 100 };
        var invoiceDetail = new InvoiceDetailResponse
        {
            Detail = new InvoiceDetail
            {
                HeaderData = new InvoiceHeaderData { TotalAmount = 100, SoldtoNumber = "100", CompanyCode = "C1" },
                PartnerData = new List<InvoicePartnerData>() // No RG partner
            }
        };

        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>())).ReturnsAsync(user);
        _mockInvoiceManager.Setup(m => m.GetInvoiceDetails(It.IsAny<DocumentDetail>(), It.IsAny<string>())).ReturnsAsync(invoiceDetail);
        _mockConfiguration.Setup(c => c.GetSection("Registration:MatchSoldTo").Value).Returns("true");

        // Act
        var result = await _controller.AddAccountByInvoice(userId, request);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task AddAccountByInvoice_ReturnsBadRequest_WhenAccountExists()
    {
        // Arrange
        var userId = "123";
        var user = new User { UserId = userId, PrimaryAccountType = "payer" };
        var request = new InvoiceAccountRequest { AccountNumber = "100", InvoiceNumber = "INV1", InvoiceAmount = 100 };
        var invoiceDetail = new InvoiceDetailResponse
        {
            Detail = new InvoiceDetail
            {
                HeaderData = new InvoiceHeaderData { TotalAmount = 100, SoldtoNumber = "100", CompanyCode = "C1", Division = "D1", SalesOrganization = "S1", DistributionChannel = "DC1" },
                PartnerData = new List<InvoicePartnerData> { new InvoicePartnerData { PartnerFunction = "RG", PartnerNumber = "100" } }
            }
        };

        var existingAccount = new Account { PrimaryAcct = "100", CompanyCode = "C1", Division = "D1", SalesOrganization = "S1", DistributionChannel = "DC1" };
        var accounts = new List<Account> { existingAccount };

        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>())).ReturnsAsync(user);
        _mockInvoiceManager.Setup(m => m.GetInvoiceDetails(It.IsAny<DocumentDetail>(), It.IsAny<string>())).ReturnsAsync(invoiceDetail);
        _mockConfiguration.Setup(c => c.GetSection("Registration:MatchSoldTo").Value).Returns("true");
        _mockAccountManager.Setup(m => m.GetAccountsByUser(user, It.IsAny<string>())).ReturnsAsync(accounts);
        _mockLanguageManager.Setup(m => m.GetMessage(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).Returns("Exists");

        // Act
        var result = await _controller.AddAccountByInvoice(userId, request);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task AddAccountByInvoice_ReturnsOk_WhenValid()
    {
        // Arrange
        var userId = "123";
        var user = new User { UserId = userId, PrimaryAccountType = "payer" };
        var request = new InvoiceAccountRequest { AccountNumber = "100", InvoiceNumber = "INV1", InvoiceAmount = 100 };
        var invoiceDetail = new InvoiceDetailResponse
        {
            Detail = new InvoiceDetail
            {
                HeaderData = new InvoiceHeaderData { TotalAmount = 100, SoldtoNumber = "100", CompanyCode = "C1", Division = "D1", SalesOrganization = "S1", DistributionChannel = "DC1" },
                PartnerData = new List<InvoicePartnerData> { new InvoicePartnerData { PartnerFunction = "RG", PartnerNumber = "100" } }
            }
        };

        var accounts = new List<Account>(); // No conflicting accounts

        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>())).ReturnsAsync(user);
        _mockInvoiceManager.Setup(m => m.GetInvoiceDetails(It.IsAny<DocumentDetail>(), It.IsAny<string>())).ReturnsAsync(invoiceDetail);
        _mockConfiguration.Setup(c => c.GetSection("Registration:MatchSoldTo").Value).Returns("true");
        _mockAccountManager.Setup(m => m.GetAccountsByUser(user, It.IsAny<string>())).ReturnsAsync(accounts);
        _mockAccountManager.Setup(m => m.CreateAccount(It.IsAny<Account>(), It.IsAny<string>()))
            .ReturnsAsync(new Account { PrimaryAcct = "100" });

        // Act
        var result = await _controller.AddAccountByInvoice(userId, request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var createdAccount = Assert.IsType<Account>(okResult.Value);
        Assert.Equal("100", createdAccount.PrimaryAcct);
    }

    [Fact]
    public async Task GetUserAccounts_ReturnsExceptionResult_WhenExceptionOccurs()
    {
        // Arrange
        var userId = "123";
        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>()))
            .ThrowsAsync(new Exception("SAP error"));

        // Act
        var result = await _controller.GetUserAccounts(userId);

        // Assert
        var exceptionResult = Assert.IsType<ExceptionResult>(result);
    }

    [Fact]
    public async Task AddAccountManual_ReturnsExceptionResult_WhenExceptionOccurs()
    {
        // Arrange
        var userId = "123";
        var account = new Account { PrimaryAcct = "123" };
        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>()))
             .ThrowsAsync(new Exception("SAP error"));

        // Act
        var result = await _controller.AddAccountManual(userId, account);

        // Assert
        Assert.IsType<ExceptionResult>(result);
    }

    [Fact]
    public async Task AddAccountByInvoice_ReturnsExceptionResult_WhenExceptionOccurs()
    {
        // Arrange
        var userId = "123";
        var request = new InvoiceAccountRequest();
        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>()))
             .ThrowsAsync(new Exception("SAP error"));

        // Act
        var result = await _controller.AddAccountByInvoice(userId, request);

        // Assert
        Assert.IsType<ExceptionResult>(result);
    }

    [Fact]
    public async Task UpdateAccount_ReturnsExceptionResult_WhenExceptionOccurs()
    {
        // Arrange
        var userId = "123";
        var accountId = "acc123";
        var account = new Account();
        _mockAccountManager.Setup(m => m.UpdateAccount(It.IsAny<Account>(), It.IsAny<string>()))
             .ThrowsAsync(new Exception("SAP error"));

        // Act
        var result = await _controller.UpdateAccount(userId, accountId, account);

        // Assert
        Assert.IsType<ExceptionResult>(result);
    }

    [Fact]
    public async Task DeleteAccount_ReturnsExceptionResult_WhenExceptionOccurs()
    {
        // Arrange
        var userId = "123";
        var accountId = "acc123";
        _mockAccountManager.Setup(m => m.DeleteAccount(userId, accountId, It.IsAny<string>()))
             .ThrowsAsync(new Exception("SAP error"));

        // Act
        var result = await _controller.DeleteAccount(userId, accountId);

        // Assert
        Assert.IsType<ExceptionResult>(result);
    }

    [Fact]
    public async Task AddAccountManual_ReturnsBadRequest_WhenUserIdNull()
    {
        // Act
        var result = await _controller.AddAccountManual(null!, new Account());

        // Assert
        Assert.IsType<BadRequestResult>(result);
    }

    [Fact]
    public async Task AddAccountManual_ReturnsForbid_WhenUserNotFound()
    {
        // Arrange
        var userId = "123";
        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>())).ReturnsAsync((User?)null);
        var language = "en";
        _mockLanguageManager.Setup(m => m.GetMessage(It.IsAny<string>(), language, It.IsAny<string>()))
            .Returns("User not found");

        // Act
        var result = await _controller.AddAccountManual(userId, new Account());

        // Assert
        var forbidResult = Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task AddAccountManual_ReturnsBadRequest_WhenAccountExists()
    {
        // Arrange
        var userId = "123";
        var user = new User { UserId = userId };
        var account = new Account { PrimaryAcct = "123", CompanyCode = "C1", SalesOrganization = "S1", DistributionChannel = "D1", Division = "D1" };
        var accounts = new List<Account> { account };

        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>())).ReturnsAsync(user);
        _mockAccountManager.Setup(m => m.GetAccountsByUser(user, It.IsAny<string>(), It.IsAny<bool>())).ReturnsAsync(accounts);
        var language = "en";
        _mockLanguageManager.Setup(m => m.GetMessage(It.IsAny<string>(), language, It.IsAny<string>()))
            .Returns("Account exists");

        // Act
        var result = await _controller.AddAccountManual(userId, account);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task AddAccountByInvoice_ReturnsNotFound_WhenAccountMismatchAndMatchSoldToTrue()
    {
        // Arrange
        var userId = "123";
        var user = new User { UserId = userId };
        var request = new InvoiceAccountRequest { AccountNumber = "999", InvoiceNumber = "INV1", InvoiceAmount = 100 }; // Account mismatch
        var invoiceDetail = new InvoiceDetailResponse
        {
            Detail = new InvoiceDetail
            {
                HeaderData = new InvoiceHeaderData { TotalAmount = 100, SoldtoNumber = "100" },
                PartnerData = new List<InvoicePartnerData>()
            }
        };

        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>())).ReturnsAsync(user);
        _mockInvoiceManager.Setup(m => m.GetInvoiceDetails(It.IsAny<DocumentDetail>(), It.IsAny<string>())).ReturnsAsync(invoiceDetail);
        _mockConfiguration.Setup(c => c.GetSection("Registration:MatchSoldTo").Value).Returns("true");

        // Act
        var result = await _controller.AddAccountByInvoice(userId, request);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task AddAccountByInvoice_ReturnsOk_WhenSoldToMismatchButPartnerRGMatches()
    {
        // Arrange
        var userId = "123";
        var user = new User { UserId = userId, PrimaryAccountType = "payer" };
        var request = new InvoiceAccountRequest { AccountNumber = "200", InvoiceNumber = "INV1", InvoiceAmount = 100 };
        var invoiceDetail = new InvoiceDetailResponse
        {
            Detail = new InvoiceDetail
            {
                HeaderData = new InvoiceHeaderData { TotalAmount = 100, SoldtoNumber = "100", CompanyCode = "C1", Division = "D1", SalesOrganization = "S1", DistributionChannel = "DC1" },
                PartnerData = new List<InvoicePartnerData> { new InvoicePartnerData { PartnerFunction = "RG", PartnerNumber = "200" } }
            }
        };

        var accounts = new List<Account>();

        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>())).ReturnsAsync(user);
        _mockInvoiceManager.Setup(m => m.GetInvoiceDetails(It.IsAny<DocumentDetail>(), It.IsAny<string>())).ReturnsAsync(invoiceDetail);
        _mockConfiguration.Setup(c => c.GetSection("Registration:MatchSoldTo").Value).Returns("true");
        _mockAccountManager.Setup(m => m.GetAccountsByUser(user, It.IsAny<string>())).ReturnsAsync(accounts);
        _mockAccountManager.Setup(m => m.CreateAccount(It.IsAny<Account>(), It.IsAny<string>()))
            .ReturnsAsync(new Account { PrimaryAcct = "200" });

        // Act
        var result = await _controller.AddAccountByInvoice(userId, request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var createdAccount = Assert.IsType<Account>(okResult.Value);
        Assert.Equal("200", createdAccount.PrimaryAcct);
    }

    [Fact]
    public async Task AddAccountByInvoice_ReturnsOk_WhenUserIsNotPayer()
    {
        // Arrange
        var userId = "123";
        var user = new User { UserId = userId, PrimaryAccountType = "other" };
        var request = new InvoiceAccountRequest { AccountNumber = "100", InvoiceNumber = "INV1", InvoiceAmount = 100 };
        var invoiceDetail = new InvoiceDetailResponse
        {
            Detail = new InvoiceDetail
            {
                HeaderData = new InvoiceHeaderData { TotalAmount = 100, SoldtoNumber = "100", CompanyCode = "C1", Division = "D1", SalesOrganization = "S1", DistributionChannel = "DC1" },
                PartnerData = new List<InvoicePartnerData> { new InvoicePartnerData { PartnerFunction = "AG", PartnerNumber = "100" } }
            }
        };

        var accounts = new List<Account>();

        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>())).ReturnsAsync(user);
        _mockInvoiceManager.Setup(m => m.GetInvoiceDetails(It.IsAny<DocumentDetail>(), It.IsAny<string>())).ReturnsAsync(invoiceDetail);
        _mockConfiguration.Setup(c => c.GetSection("Registration:MatchSoldTo").Value).Returns("true");
        _mockAccountManager.Setup(m => m.GetAccountsByUser(user, It.IsAny<string>())).ReturnsAsync(accounts);
        _mockAccountManager.Setup(m => m.CreateAccount(It.IsAny<Account>(), It.IsAny<string>()))
            .ReturnsAsync(new Account { PrimaryAcct = "100" });

        // Act
        var result = await _controller.AddAccountByInvoice(userId, request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var createdAccount = Assert.IsType<Account>(okResult.Value);
        Assert.Equal("100", createdAccount.PrimaryAcct);
    }

    [Fact]
    public async Task AddAccountByInvoice_ReturnsNotFound_WhenMatchSoldToDisabledAndTotalMismatch()
    {
        // Arrange
        var userId = "123";
        var user = new User { UserId = userId };
        var request = new InvoiceAccountRequest { AccountNumber = "100", InvoiceNumber = "INV1", InvoiceAmount = 50 }; // Mismatch amount
        var invoiceDetail = new InvoiceDetailResponse
        {
            Detail = new InvoiceDetail
            {
                HeaderData = new InvoiceHeaderData { TotalAmount = 100, SoldtoNumber = "100" }
            }
        };

        _mockUserManager.Setup(m => m.GetUserById(userId, It.IsAny<string>())).ReturnsAsync(user);
        _mockInvoiceManager.Setup(m => m.GetInvoiceDetails(It.IsAny<DocumentDetail>(), It.IsAny<string>())).ReturnsAsync(invoiceDetail);
        _mockConfiguration.Setup(c => c.GetSection("Registration:MatchSoldTo").Value).Returns("false");

        // Act
        var result = await _controller.AddAccountByInvoice(userId, request);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task AddAccountByInvoice_ReturnsBadRequest_WhenUserIdNull()
    {
        // Act
        var result = await _controller.AddAccountByInvoice(null!, new InvoiceAccountRequest());

        // Assert
        Assert.IsType<BadRequestResult>(result);
    }

    [Fact]
    public async Task UpdateAccount_ReturnsBadRequest_WhenIdsNull()
    {
        // Act
        var result = await _controller.UpdateAccount(null!, null!, new Account());

        // Assert
        Assert.IsType<BadRequestResult>(result);
    }

    [Fact]
    public async Task DeleteAccount_ReturnsBadRequest_WhenIdsNull()
    {
        // Act
        var result = await _controller.DeleteAccount(null!, null!);

        // Assert
        Assert.IsType<BadRequestResult>(result);
    }
}
