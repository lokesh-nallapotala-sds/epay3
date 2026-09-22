using Epay3Service.Clients.Interfaces;
using Epay3Service.Clients.Models;
using Epay3Service.Managers;
using Epay3Service.Models;
using Moq;
using Xunit;
using Status = Epay3Service.Models.Status;

namespace Epay3Service.Tests.Managers;

public class UserManagerTests
{
    private readonly Mock<ISapHttpClient> _mockSapClient;
    private readonly UserManager _userManager;

    public UserManagerTests()
    {
        _mockSapClient = new Mock<ISapHttpClient>();
        _userManager = new UserManager(_mockSapClient.Object);
    }

    [Fact]
    public async Task GetUsers_ReturnsListOfUsers()
    {
        // Arrange
        var sapData = Epay3.Test.Common.Helpers.MockDataLoader.Load<SapHttpData<List<User>?>>("users.json");

        _mockSapClient.Setup(c => c.Get<List<User>>(
                "CNBS_GET_APP_USERS",
                It.IsAny<Dictionary<string, string?>>(),
                "en",
                true))
            .ReturnsAsync(sapData);

        // Act
        var result = await _userManager.GetUsers("", "en");

        // Assert
        Assert.NotNull(result);
        Assert.Equal(5, result!.Count);
        Assert.Equal("rep", result[0].Login);
    }

    [Fact]
    public async Task GetUsers_WithFilter_PassesFilterParam()
    {
        // Arrange
        var sapData = Epay3.Test.Common.Helpers.MockDataLoader.Load<SapHttpData<List<User>?>>("users.json");
        var filter = "some-filter";

        _mockSapClient.Setup(c => c.Get<List<User>>(
                "CNBS_GET_APP_USERS",
                It.Is<Dictionary<string, string?>>(d => d["search_string"] == filter),
                "en",
                true))
            .ReturnsAsync(sapData);

        // Act
        var result = await _userManager.GetUsers(filter, "en");

        // Assert
        Assert.NotNull(result);
        _mockSapClient.Verify(c => c.Get<List<User>>(
            "CNBS_GET_APP_USERS",
            It.Is<Dictionary<string, string?>>(d => d.ContainsKey("search_string") && d["search_string"] == filter),
            "en",
            true), Times.Once);
    }

    [Fact]
    public async Task GetUsers_ReturnsNull_WhenResponseIsNull()
    {
        // Arrange
        _mockSapClient.Setup(c => c.Get<List<User>>(
                "CNBS_GET_APP_USERS",
                It.IsAny<Dictionary<string, string?>>(),
                "en",
                true))
            .ReturnsAsync((SapHttpData<List<User>>?)null);

        // Act
        var result = await _userManager.GetUsers("", "en");

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetUserById_ReturnsUser_WhenFound()
    {
        // Arrange
        // Load all users from the mock data
        var allUsersData = Epay3.Test.Common.Helpers.MockDataLoader.Load<SapHttpData<List<User>?>>("users.json");
        var allUsers = allUsersData.Data;

        // Pick a user ID that exists in the mock data (e.g., the first one)
        var targetUser = allUsers!.First();
        var userId = targetUser.UserId!;

        // Setup the mock to return a list containing just this user when queried by ID
        // Note: The API typically returns a list even for a single user fetch
        var singleUserList = new List<User> { targetUser };
        var sapData = new SapHttpData<List<User>?> { Data = singleUserList };

        _mockSapClient.Setup(c => c.Get<List<User>>(
                "CNBS_GET_APP_USER_ACTION",
                It.Is<Dictionary<string, string?>>(d => d["user_id"] == userId),
                "en",
                true))
            .ReturnsAsync(sapData);

        // Act
        var result = await _userManager.GetUserById(userId, "en");

        // Assert
        Assert.NotNull(result);
        Assert.Equal(userId, result!.UserId);
        Assert.Equal(targetUser.Login, result.Login);
    }

    [Fact]
    public async Task GetUserById_ReturnsNull_WhenResponseIsNull()
    {
        // Arrange
        _mockSapClient.Setup(c => c.Get<List<User>>(
                "CNBS_GET_APP_USER_ACTION",
                It.IsAny<Dictionary<string, string?>>(),
                "en",
                true))
            .ReturnsAsync((SapHttpData<List<User>>?)null);

        // Act
        var result = await _userManager.GetUserById("123", "en");

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetUserByLogin_ReturnsUser_WhenFound()
    {
        // Arrange
        var allUsersData = Epay3.Test.Common.Helpers.MockDataLoader.Load<SapHttpData<List<User>?>>("users.json");
        var targetUser = allUsersData.Data!.First();
        var login = targetUser.Login!;

        var singleUserList = new List<User> { targetUser };
        var sapData = new SapHttpData<List<User>?> { Data = singleUserList };

        _mockSapClient.Setup(c => c.Get<List<User>>(
                "CNBS_GET_APP_USERS",
                It.Is<Dictionary<string, string?>>(d => d["login"] == login),
                "en",
                true))
            .ReturnsAsync(sapData);

        // Act
        var result = await _userManager.GetUserByLogin(login, "en");

        // Assert
        Assert.NotNull(result);
        Assert.Equal(login, result!.Login);
    }

    [Fact]
    public async Task GetUserByLogin_ReturnsNull_WhenResponseIsNull()
    {
        // Arrange
        _mockSapClient.Setup(c => c.Get<List<User>>(
                "CNBS_GET_APP_USERS",
                It.IsAny<Dictionary<string, string?>>(),
                "en",
                true))
            .ReturnsAsync((SapHttpData<List<User>>?)null);

        // Act
        var result = await _userManager.GetUserByLogin("login", "en");

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetUserByEmail_ReturnsUser_WhenFound()
    {
        // Arrange
        var allUsersData = Epay3.Test.Common.Helpers.MockDataLoader.Load<SapHttpData<List<User>?>>("users.json");
        var targetUser = allUsersData.Data!.First();
        var email = targetUser.Email!;

        var singleUserList = new List<User> { targetUser };
        var sapData = new SapHttpData<List<User>?> { Data = singleUserList };

        _mockSapClient.Setup(c => c.Get<List<User>>(
                "CNBS_GET_APP_USERS",
                It.Is<Dictionary<string, string?>>(d => d["email"] == email),
                "en",
                true))
            .ReturnsAsync(sapData);

        // Act
        var result = await _userManager.GetUserByEmail(email, "en");

        // Assert
        Assert.NotNull(result);
        Assert.Equal(email, result!.Email);
    }

    [Fact]
    public async Task GetUserByEmail_ReturnsNull_WhenResponseIsNull()
    {
        // Arrange
        _mockSapClient.Setup(c => c.Get<List<User>>(
                "CNBS_GET_APP_USERS",
                It.IsAny<Dictionary<string, string?>>(),
                "en",
                true))
            .ReturnsAsync(new SapHttpData<List<User>?>());

        // Act
        var result = await _userManager.GetUserByEmail("email@test.com", "en");

        // Assert
        Assert.Null(result);
    }


    [Fact]
    public async Task CreateUser_ProcessesAccounts_WhenPresent()
    {
        // Arrange
        var allUsersData = Epay3.Test.Common.Helpers.MockDataLoader.Load<SapHttpData<List<User>?>>("users.json");
        var newUser = allUsersData.Data!.First();

        // Add accounts to user
        var accounts = Epay3.Test.Common.Helpers.MockDataLoader.Load<List<Account>>("accounts.json");
        newUser.Accounts = accounts;

        var sapData = new SapHttpData<User?> { Data = newUser };

        _mockSapClient.Setup(c => c.Post<User>(
                "CNBS_GET_APP_USER_ACTION",
                null,
                It.IsAny<object>(),
                "en",
                true))
            .ReturnsAsync(sapData);

        // Act
        var result = await _userManager.CreateUser(newUser, "en");

        // Assert
        Assert.NotNull(result);
        Assert.Equal(newUser.Login, result!.Login);
        Assert.NotNull(result.Accounts);
        Assert.NotEmpty(result.Accounts);

        // Verify AccountTypeId is uppercased (logic in UserManager.CreateUser)
        Assert.All(result.Accounts, acc => Assert.Equal(acc.AccountTypeId.ToUpper(), acc.AccountTypeId));
    }

    [Fact]
    public async Task CreateUser_ReturnsCreatedUser()
    {
        // Arrange
        var allUsersData = Epay3.Test.Common.Helpers.MockDataLoader.Load<SapHttpData<List<User>?>>("users.json");
        var newUser = allUsersData.Data!.First();
        var sapData = new SapHttpData<User?> { Data = newUser };

        _mockSapClient.Setup(c => c.Post<User>(
                "CNBS_GET_APP_USER_ACTION",
                null,
                It.IsAny<object>(), // Checking exact anonymous object structure is complex in Moq without custom matchers or loose verification
                "en",
                true))
            .ReturnsAsync(sapData);

        // Act
        var result = await _userManager.CreateUser(newUser, "en");

        // Assert
        Assert.NotNull(result);
        Assert.Equal(newUser.Login, result!.Login);
    }

    [Fact]
    public async Task UpdateUser_ReturnsUpdatedUser()
    {
        // Arrange
        var allUsersData = Epay3.Test.Common.Helpers.MockDataLoader.Load<SapHttpData<List<User>?>>("users.json");
        var userToUpdate = allUsersData.Data!.First();
        var sapData = new SapHttpData<User?> { Data = userToUpdate };

        _mockSapClient.Setup(c => c.Post<User>(
                "CNBS_GET_APP_USER_ACTION",
                null,
                It.IsAny<object>(),
                "en",
                true))
            .ReturnsAsync(sapData);

        // Act
        var result = await _userManager.UpdateUser(userToUpdate, "en");

        // Assert
        Assert.NotNull(result);
        Assert.Equal(userToUpdate.Login, result!.Login);
    }

    [Fact]
    public async Task UpdateUser_ProcessesAccounts_WhenPresent()
    {
        // Arrange
        var allUsersData = Epay3.Test.Common.Helpers.MockDataLoader.Load<SapHttpData<List<User>?>>("users.json");
        var userToUpdate = allUsersData.Data!.First();

        // Add accounts with lowercase type to verify uppercasing in the loop
        userToUpdate.Accounts = new List<Account>
        {
            new Account { AccountId = "123", AccountTypeId = "payer" },
            new Account { AccountId = "456", AccountTypeId = "soldto" }
        };

        var sapData = new SapHttpData<User?> { Data = userToUpdate };

        _mockSapClient.Setup(c => c.Post<User>(
                "CNBS_GET_APP_USER_ACTION",
                null,
                It.IsAny<object>(),
                "en",
                true))
            .ReturnsAsync(sapData);

        // Act
        var result = await _userManager.UpdateUser(userToUpdate, "en");

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result!.Accounts);
        Assert.NotEmpty(result.Accounts);
        Assert.All(result.Accounts, acc => Assert.Equal(acc.AccountTypeId.ToUpper(), acc.AccountTypeId));
        // Specifically check the instances we passed in
        Assert.Equal("PAYER", userToUpdate.Accounts.First().AccountTypeId);
        Assert.Equal("SOLDTO", userToUpdate.Accounts.Last().AccountTypeId);
    }

    [Fact]
    public async Task DeleteUser_ReturnsNull_AsExpected()
    {
        // Arrange
        var allUsersData = Epay3.Test.Common.Helpers.MockDataLoader.Load<SapHttpData<List<User>?>>("users.json");
        var userToDelete = allUsersData.Data!.First();
        var sapData = new SapHttpData<User?> { Data = null }; // Delete usually returns null data or specific status

        _mockSapClient.Setup(c => c.Post<User>(
                "CNBS_GET_APP_USER_ACTION",
                null,
                It.IsAny<object>(),
                "en",
                true))
            .ReturnsAsync(sapData);

        // Act
        var result = await _userManager.DeleteUser(userToDelete, "en");

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task DeleteUser_ProcessesAccounts_WhenPresent()
    {
        // Arrange
        var userToDelete = new User
        {
            UserId = "123",
            Accounts = new List<Account>
            {
                new Account { AccountId = "123", AccountTypeId = "payer" },
                new Account { AccountId = "456", AccountTypeId = "soldto" }
            }
        };

        var sapData = new SapHttpData<User?> { Data = null };

        _mockSapClient.Setup(c => c.Post<User>(
                "CNBS_GET_APP_USER_ACTION",
                null,
                It.IsAny<object>(),
                "en",
                true))
            .ReturnsAsync(sapData);

        // Act
        await _userManager.DeleteUser(userToDelete, "en");

        // Assert
        Assert.NotNull(userToDelete.Accounts);
        Assert.NotEmpty(userToDelete.Accounts);
        Assert.All(userToDelete.Accounts, acc => Assert.Equal(acc.AccountTypeId.ToUpper(), acc.AccountTypeId));
        Assert.Equal("PAYER", userToDelete.Accounts.First().AccountTypeId);
        Assert.Equal("SOLDTO", userToDelete.Accounts.Last().AccountTypeId);
    }

    [Fact]
    public async Task RecoverUser_ReturnsStatus()
    {
        // Arrange
        var statusData = Epay3.Test.Common.Helpers.MockDataLoader.Load<SapHttpData<Status?>>("status.json");

        _mockSapClient.Setup(c => c.GetData<Status>(
                "CNBS_GET_ADMIN_RECOVERY",
                It.IsAny<Dictionary<string, string?>>(),
                "en"))
            .ReturnsAsync(statusData);

        // Act
        var result = await _userManager.RecoverUser("key", "user", "mode", "en");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("S", result!.MessageType);
    }

    [Fact]
    public async Task GetUserByResetPassword_ReturnsUser()
    {
        // Arrange
        var allUsersData = Epay3.Test.Common.Helpers.MockDataLoader.Load<SapHttpData<List<User>>>("users.json");
        var targetUser = allUsersData.Data!.First();
        var requestId = "reset-token";

        var singleUserList = new List<User> { targetUser };
        var sapData = new SapHttpData<List<User>?> { Data = singleUserList };

        _mockSapClient.Setup(c => c.Get<List<User>>(
                "CNBS_GET_APP_USERS",
                It.Is<Dictionary<string, string?>>(d => d["password_reset_token"] == requestId),
                "en",
                true))
            .ReturnsAsync(sapData);

        // Act
        var result = await _userManager.GetUserByResetPassword(requestId, "en");

        // Assert
        Assert.NotNull(result);
        Assert.Equal(targetUser.Login, result!.Login);
    }
    [Theory]
    [InlineData("Admin")]
    [InlineData("Manager")]
    [InlineData("Internal")]
    [InlineData("User")]
    public void GetAbilityClaims_ReturnsCorrectClaims_ForRole(string role)
    {
        // Arrange
        var abilitiesData = Epay3.Test.Common.Helpers.MockDataLoader.Load<Dictionary<string, List<string>>>("userabilities.json");
        var expectedAbilities = abilitiesData[role];

        var user = new User { Role = role, PrimaryAccountType = "Payer" };

        // Act
        var claims = user.GetAbilityClaims();
        var actualAbilities = claims.Where(c => c.Type == Ability.ClaimType).Select(c => c.Value).ToList();

        // Assert
        // Sort both lists to ensure order doesn't matter
        expectedAbilities.Sort();
        actualAbilities.Sort();
        Assert.Equal(expectedAbilities, actualAbilities);
    }

    [Fact]
    public async Task GetUserById_ResolvesFromSalesforce_WhenSalesforceReturnsUser()
    {
        // Arrange
        var mockSfClient = new Mock<ISalesforceHttpClient>();
        var sfUser = new User
        {
            UserId = "a08fj00000iOqQzAAK",
            Login = "sfcpdemo",
            PrimaryAccountType = "Payer",
            Role = "User",
            Status = "Active"
        };
        var sfData = new SapHttpData<List<User>?> { Data = new List<User> { sfUser } };

        mockSfClient.Setup(c => c.Get<List<User>>(
                "CNBS_GET_APP_USER_ACTION",
                It.Is<Dictionary<string, string?>>(d => d["user_id"] == sfUser.UserId),
                "en",
                true))
            .ReturnsAsync(sfData);

        var manager = new UserManager(mockSfClient.Object, _mockSapClient.Object);

        // Act
        var result = await manager.GetUserById(sfUser.UserId, "en");

        // Assert
        Assert.NotNull(result);
        Assert.Equal(sfUser.UserId, result!.UserId);
        Assert.Equal("sfcpdemo", result.Login);
        Assert.Contains(result.Claims, c => c.Type == "UserId" && c.Value == sfUser.UserId);
        mockSfClient.Verify(c => c.Get<List<User>>(
            "CNBS_GET_APP_USER_ACTION",
            It.Is<Dictionary<string, string?>>(d => d["user_id"] == sfUser.UserId),
            "en",
            true), Times.Once);
        _mockSapClient.Verify(c => c.Get<List<User>>(
            It.IsAny<string>(),
            It.IsAny<Dictionary<string, string?>>(),
            It.IsAny<string>(),
            It.IsAny<bool>()), Times.Never);
    }

    [Fact]
    public async Task GetUserById_FallsBackToSap_WhenSalesforceReturnsNull()
    {
        // Arrange
        var mockSfClient = new Mock<ISalesforceHttpClient>();
        var sapUser = new User
        {
            UserId = "sap-user-id",
            Login = "sapuser",
            PrimaryAccountType = "SoldTo",
            Role = "User",
            Status = "Active"
        };
        var sapData = new SapHttpData<List<User>?> { Data = new List<User> { sapUser } };

        mockSfClient.Setup(c => c.Get<List<User>>(
                "CNBS_GET_APP_USER_ACTION",
                It.IsAny<Dictionary<string, string?>>(),
                "en",
                true))
            .ReturnsAsync(new SapHttpData<List<User>?> { Data = null });

        _mockSapClient.Setup(c => c.Get<List<User>>(
                "CNBS_GET_APP_USER_ACTION",
                It.Is<Dictionary<string, string?>>(d => d["user_id"] == sapUser.UserId),
                "en",
                true))
            .ReturnsAsync(sapData);

        var manager = new UserManager(mockSfClient.Object, _mockSapClient.Object);

        // Act
        var result = await manager.GetUserById(sapUser.UserId, "en");

        // Assert
        Assert.NotNull(result);
        Assert.Equal(sapUser.UserId, result!.UserId);
        Assert.Equal("sapuser", result.Login);
        _mockSapClient.Verify(c => c.Get<List<User>>(
            "CNBS_GET_APP_USER_ACTION",
            It.Is<Dictionary<string, string?>>(d => d["user_id"] == sapUser.UserId),
            "en",
            true), Times.Once);
    }

    [Fact]
    public async Task GetUsers_ResolvesFromSalesforce_WhenSalesforceReturnsUsers()
    {
        // Arrange
        var mockSfClient = new Mock<ISalesforceHttpClient>();
        var sfUsers = new List<User>
        {
            new() { UserId = "a08fj00000iOqQzAAK", Login = "sfcpdemo", Role = "Admin", Status = "active" },
            new() { UserId = "a08fj00000iOtMzAAK", Login = "sfuser2", Role = "User", Status = "active" }
        };
        var sfData = new SapHttpData<List<User>?> { Data = sfUsers };

        mockSfClient.Setup(c => c.Get<List<User>>(
                "CNBS_GET_APP_USERS",
                It.IsAny<Dictionary<string, string?>>(),
                "en",
                true))
            .ReturnsAsync(sfData);

        var manager = new UserManager(mockSfClient.Object, _mockSapClient.Object);

        // Act
        var result = await manager.GetUsers("", "en");

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result!.Count);
        Assert.Equal("sfcpdemo", result[0].Login);
        mockSfClient.Verify(c => c.Get<List<User>>(
            "CNBS_GET_APP_USERS",
            null,
            "en",
            true), Times.Once);
        _mockSapClient.Verify(c => c.Get<List<User>>(
            "CNBS_GET_APP_USERS",
            It.IsAny<Dictionary<string, string?>>(),
            It.IsAny<string>(),
            It.IsAny<bool>()), Times.Never);
    }

    [Fact]
    public async Task GetUsers_FallsBackToSap_WhenSalesforceReturnsNull()
    {
        // Arrange
        var mockSfClient = new Mock<ISalesforceHttpClient>();
        var sapUsers = new List<User>
        {
            new() { UserId = "sap-user-1", Login = "sapuser1", Role = "User", Status = "active" }
        };
        var sapData = new SapHttpData<List<User>?> { Data = sapUsers };

        mockSfClient.Setup(c => c.Get<List<User>>(
                "CNBS_GET_APP_USERS",
                It.IsAny<Dictionary<string, string?>>(),
                "en",
                true))
            .ReturnsAsync(new SapHttpData<List<User>?> { Data = null });

        _mockSapClient.Setup(c => c.Get<List<User>>(
                "CNBS_GET_APP_USERS",
                It.IsAny<Dictionary<string, string?>>(),
                "en",
                true))
            .ReturnsAsync(sapData);

        var manager = new UserManager(mockSfClient.Object, _mockSapClient.Object);

        // Act
        var result = await manager.GetUsers("", "en");

        // Assert
        Assert.NotNull(result);
        Assert.Single(result!);
        Assert.Equal("sapuser1", result[0].Login);
        mockSfClient.Verify(c => c.Get<List<User>>(
            "CNBS_GET_APP_USERS",
            null,
            "en",
            true), Times.Once);
        _mockSapClient.Verify(c => c.Get<List<User>>(
            "CNBS_GET_APP_USERS",
            null,
            "en",
            true), Times.Once);
    }

    [Fact]
    public async Task GetUsers_FallsBackToSap_WhenSalesforceThrows()
    {
        // Arrange
        var mockSfClient = new Mock<ISalesforceHttpClient>();
        var sapUsers = new List<User>
        {
            new() { UserId = "sap-user-1", Login = "sapuser1", Role = "User", Status = "active" }
        };
        var sapData = new SapHttpData<List<User>?> { Data = sapUsers };

        mockSfClient.Setup(c => c.Get<List<User>>(
                "CNBS_GET_APP_USERS",
                It.IsAny<Dictionary<string, string?>>(),
                "en",
                true))
            .ThrowsAsync(new HttpRequestException("SF connection failed"));

        _mockSapClient.Setup(c => c.Get<List<User>>(
                "CNBS_GET_APP_USERS",
                It.IsAny<Dictionary<string, string?>>(),
                "en",
                true))
            .ReturnsAsync(sapData);

        var manager = new UserManager(mockSfClient.Object, _mockSapClient.Object);

        // Act
        var result = await manager.GetUsers("", "en");

        // Assert
        Assert.NotNull(result);
        Assert.Single(result!);
        Assert.Equal("sapuser1", result[0].Login);
        _mockSapClient.Verify(c => c.Get<List<User>>(
            "CNBS_GET_APP_USERS",
            null,
            "en",
            true), Times.Once);
    }
}
