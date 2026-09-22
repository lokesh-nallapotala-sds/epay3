// using Epay3Service.Clients.Interfaces;
// using Epay3Service.Clients.Models;
// using Epay3Service.Helpers;
// using Epay3Service.Managers;
// using Epay3Service.Managers.Interfaces;
// using Epay3Service.Models;
// using Microsoft.Extensions.Configuration;
// using Moq;

// namespace Epay3Service.Tests.Managers;

// public class AuthManagerTests
// {
//     private readonly Mock<ISapHttpClient> _mockSapHttpClient;
//     private readonly Mock<IApplicationConfigurationManager> _mockAppConfigManager;
//     private readonly Mock<IUserManager> _mockUserManager;
//     private readonly Mock<IConfiguration> _mockConfiguration;
//     private readonly AuthManager _authManager;

//     public AuthManagerTests()
//     {
//         _mockSapHttpClient = new Mock<ISapHttpClient>();
//         _mockAppConfigManager = new Mock<IApplicationConfigurationManager>();
//         _mockUserManager = new Mock<IUserManager>();
//         _mockConfiguration = new Mock<IConfiguration>();

//         _authManager = new AuthManager(
//             _mockSapHttpClient.Object,
//             _mockAppConfigManager.Object,
//             _mockUserManager.Object,
//             _mockConfiguration.Object
//         );
//     }

//     [Fact]
//     public async Task ValidateLogin_ThrowsException_WhenPaymentsDisabled()
//     {
//         // Arrange
//         _mockAppConfigManager.Setup(m => m.ArePaymentsDisabled()).ReturnsAsync(true);

//         // Act & Assert
//         await Assert.ThrowsAsync<Exception>(() => _authManager.ValidateLogin("user", "pass"));
//     }

//     [Fact]
//     public async Task ValidateLogin_ReturnsNull_WhenUserNotFound()
//     {
//         // Arrange
//         _mockAppConfigManager.Setup(m => m.ArePaymentsDisabled()).ReturnsAsync(false);
//         _mockSapHttpClient.Setup(m => m.Get<List<User>>(
//             "CNBS_GET_APP_USERS",
//             It.IsAny<Dictionary<string, string?>>(),
//             It.IsAny<string>(),
//             It.IsAny<bool>()))
//             .ReturnsAsync(new SapHttpData<List<User>?> { Data = new List<User>() }); // Empty list

//         // Act
//         var result = await _authManager.ValidateLogin("user", "pass");

//         // Assert
//         Assert.Null(result);
//     }

//     [Fact]
//     public async Task ValidateLogin_ReturnsUser_WhenUserIsLocked()
//     {
//         // Arrange
//         var user = new User { Login = "user", Status = "locked" };
//         _mockAppConfigManager.Setup(m => m.ArePaymentsDisabled()).ReturnsAsync(false);
//         _mockSapHttpClient.Setup(m => m.Get<List<User>>(
//             "CNBS_GET_APP_USERS",
//             It.IsAny<Dictionary<string, string?>>(),
//             It.IsAny<string>(),
//             It.IsAny<bool>()))
//             .ReturnsAsync(new SapHttpData<List<User>?> { Data = new List<User> { user } });

//         // Act
//         var result = await _authManager.ValidateLogin("user", "pass");

//         // Assert
//         Assert.NotNull(result);
//         Assert.Equal("locked", result.Status);
//     }

//     [Fact]
//     public async Task ValidateLogin_ReturnsNull_WhenPasswordInvalid_AndLocksUser()
//     {
//         // Arrange
//         var salt = Salt.Create();
//         var hash = Hash.Create("correctpass", salt);
//         var user = new User { Login = "user", Status = "active", PasswordSalt = salt, PasswordHash = hash, FailedLoginCount = "4" };

//         _mockAppConfigManager.Setup(m => m.ArePaymentsDisabled()).ReturnsAsync(false);
//         _mockSapHttpClient.Setup(m => m.Get<List<User>>(
//             "CNBS_GET_APP_USERS",
//             It.IsAny<Dictionary<string, string?>>(),
//             It.IsAny<string>(),
//             It.IsAny<bool>()))
//             .ReturnsAsync(new SapHttpData<List<User>?> { Data = new List<User> { user } });

//         _mockConfiguration.Setup(c => c["MaximumFailedLoginCount"]).Returns("5");

//         var updatedUser = new User { Login = "user", Status = "active", FailedLoginCount = "5" };
//         _mockSapHttpClient.Setup(m => m.Post<User>(
//              "CNBS_UPDATE_LOGON_STATUS",
//              null,
//              It.IsAny<object>(),
//              It.IsAny<string>(),
//              It.IsAny<bool>()))
//              .ReturnsAsync(new SapHttpData<User?> { Data = updatedUser });


//         // Act
//         var result = await _authManager.ValidateLogin("user", "wrongpass");

//         // Assert
//         Assert.Null(result);
//         _mockUserManager.Verify(m => m.UpdateUser(It.Is<User>(u => u.Status == "locked"), It.IsAny<string>()), Times.Once);
//     }

//     [Fact]
//     public async Task ValidateLogin_ReturnsUser_WhenSuccess_AndFetchesAccounts()
//     {
//         // Arrange
//         var salt = Salt.Create();
//         var hash = Hash.Create("password", salt);
//         var user = new User { UserId = "1", Login = "user", Status = "Active", PasswordSalt = salt, PasswordHash = hash, FailedLoginCount = "0", PrimaryAccountType = "Payer" };

//         _mockAppConfigManager.Setup(m => m.ArePaymentsDisabled()).ReturnsAsync(false);
//         _mockSapHttpClient.Setup(m => m.Get<List<User>>(
//             "CNBS_GET_APP_USERS",
//             It.IsAny<Dictionary<string, string?>>(),
//             It.IsAny<string>(),
//             It.IsAny<bool>()))
//             .ReturnsAsync(new SapHttpData<List<User>?> { Data = new List<User> { user } });

//         _mockSapHttpClient.Setup(m => m.Get<List<Account>>(
//             "CNBS_GET_APP_USER_ACCOUNTS",
//              It.IsAny<Dictionary<string, string?>>(),
//             It.IsAny<string>(),
//             It.IsAny<bool>()))
//             .ReturnsAsync(new SapHttpData<List<Account>?> { Data = new List<Account> { new Account { PrimaryAcct = "123" } } });

//         _mockSapHttpClient.Setup(m => m.Post<User>(
//              "CNBS_UPDATE_LOGON_STATUS",
//              null,
//              It.IsAny<object>(),
//              It.IsAny<string>(),
//              It.IsAny<bool>()))
//              .ReturnsAsync(new SapHttpData<User?> { Data = user });

//         // Act
//         var result = await _authManager.ValidateLogin("user", "password");

//         // Assert
//         Assert.NotNull(result);
//         Assert.Equal("Active", result.Status);
//         Assert.NotEmpty(result.Accounts);
//         Assert.Contains(result.Claims, c => c.Type == "Accounts" && c.Value == "123");
//     }

//     [Fact]
//     public async Task GetUserByConfirmationToken_ReturnsUser_WhenFound()
//     {
//         // Arrange
//         var user = new User { Login = "user" };
//         _mockSapHttpClient.Setup(m => m.Get<List<User>>(
//              "CNBS_GET_APP_USERS",
//              It.Is<Dictionary<string, string?>>(d => d.ContainsKey("confirmation_token")),
//              It.IsAny<string>(),
//              It.IsAny<bool>()))
//              .ReturnsAsync(new SapHttpData<List<User>?> { Data = new List<User> { user } });

//         // Act
//         var result = await _authManager.GetUserByConfirmationToken("token");

//         // Assert
//         Assert.NotNull(result);
//         Assert.Equal("user", result.Login);
//     }
// }
