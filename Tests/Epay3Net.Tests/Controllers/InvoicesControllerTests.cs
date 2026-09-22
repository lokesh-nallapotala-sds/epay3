using System.Security.Claims;
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
using WebAR.Service.Services.API.Models;
using Xunit;

namespace Epay3Net.Tests.Controllers;

public class InvoicesControllerTests
{
    private readonly Mock<IInvoicesManager> _mockInvoicesManager = new();
    private readonly Mock<IAccountManager> _mockAccountManager = new();
    private readonly Mock<IUserManager> _mockUserManager = new();
    private readonly Mock<IApplicationConfigurationManager> _mockAppConfigManager = new();
    private readonly Mock<ILanguageManager> _mockLanguageManager = new();
    private readonly Mock<IAuthorizationService> _mockAuthorizationService = new();
    private readonly InvoicesController _controller;

    public InvoicesControllerTests()
    {
        _mockLanguageManager
            .Setup(m => m.GetMessage(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns((string _, string _, string message) => message);

        _controller = new InvoicesController(
            _mockInvoicesManager.Object,
            _mockAccountManager.Object,
            _mockUserManager.Object,
            _mockAppConfigManager.Object,
            _mockLanguageManager.Object,
            _mockAuthorizationService.Object,
            new ApplicationSecrets
            {
                EncryptionKey = "encryption-key-that-is-long-enough",
                RequestsTokenKey = "requests-token-key-that-is-long-enough"
            });

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = CreatePrincipal()
            }
        };
    }

    [Fact]
    public async Task Search_UsesLinkedAccountsAndResolvedAccount()
    {
        var user = new User
        {
            UserId = "user-1",
            Login = "testuser",
            Email = "test@example.com",
            FirstName = "Test",
            LastName = "User",
            PrimaryAccountType = "SoldTo"
        };
        var account = new Account { PrimaryAcct = "123", CompanyCode = "1000" };
        var accounts = new List<Account> { account };
        var request = new InvoiceSearchRequest
        {
            SelectedAccount = "123",
            documentType = "01",
            Status = "Open",
            CurrencyKey = "USD",
            Filters = []
        };

        _mockUserManager.Setup(m => m.GetUserById("user-1", "en")).ReturnsAsync(user);
        _mockAccountManager.Setup(m => m.GetLinkedAccountsByUser(user, "en", It.IsAny<bool>())).ReturnsAsync(accounts);
        _mockAuthorizationService
            .Setup(m => m.AuthorizeAsync(It.IsAny<ClaimsPrincipal>(), request.SelectedAccount, It.IsAny<IEnumerable<IAuthorizationRequirement>>()))
            .Callback<ClaimsPrincipal, object, IEnumerable<IAuthorizationRequirement>>((principal, resource, _) =>
            {
                Assert.Equal(request.SelectedAccount, resource);
                Assert.True(principal.HasClaim("Accounts", account.PrimaryAcct!));
            })
            .ReturnsAsync(AuthorizationResult.Success());
        _mockAccountManager.Setup(m => m.FindLinkedAccount(accounts, request.SelectedAccount, null)).Returns(account);
        _mockInvoicesManager
            .Setup(m => m.Search(user, account, It.IsAny<InvoicesSearch>(), request.SubAccounts, "en"))
            .ReturnsAsync(new List<Invoice>());

        IActionResult result = await _controller.Search(request, "en");

        Assert.IsType<OkObjectResult>(result);
        _mockAccountManager.Verify(m => m.GetLinkedAccountsByUser(user, "en", It.IsAny<bool>()), Times.Once);
        _mockAccountManager.Verify(m => m.GetAccountsByUser(It.IsAny<User>(), It.IsAny<string>()), Times.Never);
        _mockInvoicesManager.Verify(m => m.Search(user, account, It.IsAny<InvoicesSearch>(), request.SubAccounts, "en"), Times.Once);
    }

    [Fact]
    public async Task Search_ReturnsFilteredInvoicesAndEncryptsScheduledTokens_WhenExcludeFlagsAreEnabled()
    {
        var user = CreateUser();
        var account = new Account { PrimaryAcct = "123", CompanyCode = "1000" };
        var accounts = new List<Account> { account };
        var request = new InvoiceSearchRequest
        {
            SelectedAccount = "123",
            CompanyCode = "1000",
            documentType = "01",
            Status = "Open",
            CurrencyKey = "All",
            ExcludePayments = true,
            ExcludeCredits = true,
            Filters =
            [
                new SearchFilter { FilterType = "reference", Value = "INV" }
            ]
        };
        var invoices = new List<Invoice>
        {
            new()
            {
                BillingDocumentNumber = "PAYMENT",
                ItemIsAPayment = "X",
                TotalAmount = 100m,
                PaidAmount = 0m
            },
            new()
            {
                BillingDocumentNumber = "CREDIT",
                TotalAmount = 50m,
                PaidAmount = 75m
            },
            new()
            {
                BillingDocumentNumber = "INV1",
                TotalAmount = 100m,
                PaidAmount = 25m,
                scheduledIdDetails = new Invoice.ScheduledIdDetails
                {
                    PaymentDetail = new PaymentDetail { PaymentCardToken = "plain-token" }
                }
            }
        };

        _mockUserManager.Setup(m => m.GetUserById("user-1", "en")).ReturnsAsync(user);
        _mockAccountManager.Setup(m => m.GetLinkedAccountsByUser(user, "en", It.IsAny<bool>())).ReturnsAsync(accounts);
        _mockAccountManager.Setup(m => m.FindLinkedAccount(accounts, request.SelectedAccount, request.CompanyCode)).Returns(account);
        _mockAuthorizationService
            .Setup(m => m.AuthorizeAsync(It.IsAny<ClaimsPrincipal>(), request.SelectedAccount, It.IsAny<IEnumerable<IAuthorizationRequirement>>()))
            .ReturnsAsync(AuthorizationResult.Success());
        _mockInvoicesManager
            .Setup(m => m.Search(
                user,
                account,
                It.Is<InvoicesSearch>(s =>
                    s.InvoicesSearchParameters!.CurrencyKey == null &&
                    s.InvoicesSearchParameters.Filter!.Single().FilterType == "reference"),
                request.SubAccounts,
                "en"))
            .ReturnsAsync(invoices);

        IActionResult result = await _controller.Search(request, "en");

        var okResult = Assert.IsType<OkObjectResult>(result);
        var returnedInvoices = Assert.IsType<List<Invoice>>(okResult.Value);
        var invoice = Assert.Single(returnedInvoices);
        Assert.Equal("INV1", invoice.BillingDocumentNumber);
        Assert.NotEqual("plain-token", invoice.scheduledIdDetails!.PaymentDetail!.PaymentCardToken);
        Assert.Equal("plain-token", Encryption.Decrypt(invoice.scheduledIdDetails.PaymentDetail.PaymentCardToken!, "encryption-key-that-is-long-enough"));
    }

    [Fact]
    public async Task Search_ReturnsUnauthorized_WhenAccountAuthorizationFails()
    {
        var user = CreateUser();
        var account = new Account { PrimaryAcct = "123", CompanyCode = "1000" };
        var accounts = new List<Account> { account };
        var request = new InvoiceSearchRequest
        {
            SelectedAccount = "123",
            documentType = "01",
            Status = "Open",
            CurrencyKey = "USD",
            Filters = []
        };

        _mockUserManager.Setup(m => m.GetUserById("user-1", "en")).ReturnsAsync(user);
        _mockAccountManager.Setup(m => m.GetLinkedAccountsByUser(user, "en", It.IsAny<bool>())).ReturnsAsync(accounts);
        _mockAccountManager.Setup(m => m.FindLinkedAccount(accounts, request.SelectedAccount, null)).Returns(account);
        _mockAuthorizationService
            .Setup(m => m.AuthorizeAsync(It.IsAny<ClaimsPrincipal>(), request.SelectedAccount, It.IsAny<IEnumerable<IAuthorizationRequirement>>()))
            .ReturnsAsync(AuthorizationResult.Failed());

        IActionResult result = await _controller.Search(request, "en");

        var unauthorizedResult = Assert.IsType<UnauthorizedObjectResult>(result);
        Assert.Equal("Account not allowed", unauthorizedResult.Value);
        _mockInvoicesManager.Verify(m => m.Search(It.IsAny<User>(), It.IsAny<Account>(), It.IsAny<InvoicesSearch>(), It.IsAny<List<string>?>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task GetInvoicePdf_ReturnsUnauthorized_WhenResolvedLinkedAccountIsMissing()
    {
        var user = new User { UserId = "user-1", PrimaryAccountType = "SoldTo" };
        var accounts = new List<Account> { new() { PrimaryAcct = "999" } };
        var request = new InvoicePdfDownloadRequest
        {
            PrimaryAccount = "123",
            CustomerNumber = "123",
            DocumentNumber = "INV1"
        };

        _mockUserManager.Setup(m => m.GetUserById("user-1", "en")).ReturnsAsync(user);
        _mockAccountManager.Setup(m => m.GetLinkedAccountsByUser(user, "en", It.IsAny<bool>())).ReturnsAsync(accounts);
        _mockAuthorizationService
            .Setup(m => m.AuthorizeAsync(It.IsAny<ClaimsPrincipal>(), request.PrimaryAccount, It.IsAny<IEnumerable<IAuthorizationRequirement>>()))
            .ReturnsAsync(AuthorizationResult.Success());
        _mockAccountManager.Setup(m => m.FindLinkedAccount(accounts, request.PrimaryAccount, null)).Returns((Account?)null);

        IActionResult result = await _controller.GetInvoicePdf(request, "en");

        Assert.IsType<UnauthorizedObjectResult>(result);
        _mockAccountManager.Verify(m => m.GetAccountsByUser(It.IsAny<User>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task InvoicesSearch_ReturnsOk_WhenGuestAccountWasValidated()
    {
        var validatedAccounts = new List<ValidateInvoiceAccount>
        {
            CreateValidatedAccount("123", "0100", "INV1")
        };
        var request = new InvoiceRequestBody
        {
            PayerData = new PayerData { CustomerNumber = "000123", CompanyCode = "0100" },
            SearchParameters = new SearchParameters
            {
                Status = "Open",
                Currency = "All",
                Filters =
                [
                    new SearchFilter { FilterType = "billing_document_number", Value = "INV1" }
                ]
            },
            ValidatedAccounts = validatedAccounts
        };

        _controller.ControllerContext.HttpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity())
        };
        _mockInvoicesManager
            .Setup(m => m.InvoiceSearch(
                It.Is<InvoicesSearch>(s =>
                    s.Payer!.CustomerNumber == request.PayerData.CustomerNumber &&
                    s.Payer.CompanyCode == request.PayerData.CompanyCode &&
                    s.InvoicesSearchParameters!.CurrencyKey == "all"),
                "en"))
            .ReturnsAsync(new List<Invoice> { new() { BillingDocumentNumber = "INV1" } });

        IActionResult result = await _controller.InvoicesSearch(request);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var invoices = Assert.IsType<List<Invoice>>(okResult.Value);
        Assert.Single(invoices);
    }

    [Fact]
    public async Task InvoicesSearch_ReturnsUnauthorized_WhenGuestAccountWasNotValidated()
    {
        var request = new InvoiceRequestBody
        {
            PayerData = new PayerData { CustomerNumber = "000123", CompanyCode = "0100" },
            SearchParameters = new SearchParameters
            {
                Status = "Open",
                Currency = "USD",
                Filters =
                [
                    new SearchFilter { FilterType = "billing_document_number", Value = "INV1" }
                ]
            }
        };

        _controller.ControllerContext.HttpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity())
        };

        IActionResult result = await _controller.InvoicesSearch(request);

        var unauthorizedResult = Assert.IsType<UnauthorizedObjectResult>(result);
        Assert.Equal("You must validate an invoice for this account before searching.", unauthorizedResult.Value);
        _mockInvoicesManager.Verify(m => m.InvoiceSearch(It.IsAny<InvoicesSearch>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task GetPaymentHistory_ReturnsOkAndEncryptsPaymentTokens_WhenAuthorized()
    {
        var user = CreateUser();
        var account = new Account { PrimaryAcct = "123", CompanyCode = "1000" };
        var accounts = new List<Account> { account };
        var request = new InvoiceSearchRequest
        {
            SelectedAccount = "123",
            documentType = "01",
            Status = "Cleared",
            CurrencyKey = "USD",
            Filters = []
        };
        var paymentResponse = new PaymentInvoiceResponse
        {
            PaymentList =
            [
                new PaymentList { DocumentNumberFinance = "PAY1", PaymentCardToken = "payment-token" },
                new PaymentList { DocumentNumberFinance = "PAY2", PaymentCardToken = "" }
            ]
        };

        _mockUserManager.Setup(m => m.GetUserById("user-1", "en")).ReturnsAsync(user);
        _mockAccountManager.Setup(m => m.GetLinkedAccountsByUser(user, "en", It.IsAny<bool>())).ReturnsAsync(accounts);
        _mockAccountManager.Setup(m => m.FindLinkedAccount(accounts, request.SelectedAccount, null)).Returns(account);
        _mockAuthorizationService
            .Setup(m => m.AuthorizeAsync(It.IsAny<ClaimsPrincipal>(), request.SelectedAccount, It.IsAny<IEnumerable<IAuthorizationRequirement>>()))
            .ReturnsAsync(AuthorizationResult.Success());
        _mockInvoicesManager
            .Setup(m => m.GetPayments(user, account, It.IsAny<InvoicesSearch>(), request.SubAccounts, "en"))
            .ReturnsAsync(paymentResponse);

        IActionResult result = await _controller.GetPaymentHistory(request, "en");

        var okResult = Assert.IsType<OkObjectResult>(result);
        var returnedResponse = Assert.IsType<PaymentInvoiceResponse>(okResult.Value);
        Assert.NotEqual("payment-token", returnedResponse.PaymentList[0].PaymentCardToken);
        Assert.Equal("payment-token", Encryption.Decrypt(returnedResponse.PaymentList[0].PaymentCardToken!, "encryption-key-that-is-long-enough"));
        Assert.Equal("", returnedResponse.PaymentList[1].PaymentCardToken);
    }

    [Fact]
    public async Task GetPaymentHistory_ReturnsForbid_WhenRequestedUserDiffersWithoutImpersonation()
    {
        var request = new InvoiceSearchRequest
        {
            UserId = "other-user",
            SelectedAccount = "123",
            documentType = "01",
            Status = "Cleared",
            CurrencyKey = "USD",
            Filters = []
        };

        IActionResult result = await _controller.GetPaymentHistory(request, "en");

        Assert.IsType<ForbidResult>(result);
        _mockUserManager.Verify(m => m.GetUserById(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task GetInvoiceDetails_ReturnsOk_WhenAuthenticatedUserRequestsDetails()
    {
        var request = new InvoiceDetailRequest
        {
            CustomerNumber = "123",
            DocumentNumber = "INV1"
        };
        var invoiceResponse = new InvoiceDetailResponse
        {
            Detail = new InvoiceDetail { HeaderData = new InvoiceHeaderData { SoldtoNumber = "123" } }
        };

        _mockInvoicesManager
            .Setup(m => m.GetInvoiceDetails(
                It.Is<DocumentDetail>(d =>
                    d.CustomerNumber == request.CustomerNumber &&
                    d.DocumentNumber == request.DocumentNumber &&
                    d.DocumentType == "01"),
                "en"))
            .ReturnsAsync(invoiceResponse);

        IActionResult result = await _controller.GetInvoiceDetails(request);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Same(invoiceResponse, okResult.Value);
    }

    [Fact]
    public async Task GetInvoiceDetails_ReturnsOk_WhenGuestRequestIncludesValidatedAccounts()
    {
        var request = new InvoiceDetailRequest
        {
            CustomerNumber = "123",
            DocumentNumber = "INV1",
            ValidatedAccounts = new List<ValidateInvoiceAccount>
            {
                CreateValidatedAccount("123", "0100", "INV1")
            }
        };
        var invoiceResponse = new InvoiceDetailResponse
        {
            Detail = new InvoiceDetail { HeaderData = new InvoiceHeaderData { SoldtoNumber = "123" } }
        };

        _controller.ControllerContext.HttpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity())
        };

        _mockInvoicesManager
            .Setup(m => m.GetInvoiceDetails(It.IsAny<DocumentDetail>(), "en"))
            .ReturnsAsync(invoiceResponse);

        IActionResult result = await _controller.GetInvoiceDetails(request);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Same(invoiceResponse, okResult.Value);
    }

    [Fact]
    public async Task GetInvoiceDetails_ReturnsUnauthorized_WhenGuestRequestHasNoValidatedAccounts()
    {
        var request = new InvoiceDetailRequest
        {
            CustomerNumber = "123",
            DocumentNumber = "INV1"
        };

        _controller.ControllerContext.HttpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity())
        };

        IActionResult result = await _controller.GetInvoiceDetails(request);

        var unauthorizedResult = Assert.IsType<UnauthorizedObjectResult>(result);
        Assert.Equal("You must validate this invoice before viewing its details.", unauthorizedResult.Value);
        _mockInvoicesManager.Verify(m => m.GetInvoiceDetails(It.IsAny<DocumentDetail>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task GetInvoiceDetails_ReturnsNotFound_WhenManagerReturnsNoDetail()
    {
        var request = new InvoiceDetailRequest
        {
            CustomerNumber = "123",
            DocumentNumber = "INV1"
        };

        _mockInvoicesManager
            .Setup(m => m.GetInvoiceDetails(It.IsAny<DocumentDetail>(), "en"))
            .ReturnsAsync(new InvoiceDetailResponse());

        IActionResult result = await _controller.GetInvoiceDetails(request);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    private static ClaimsPrincipal CreatePrincipal() =>
        new(new ClaimsIdentity(
            new[]
            {
                new Claim("UserId", "user-1"),
                new Claim(ClaimTypes.Name, "testuser")
            },
            "mock"));

    private static User CreateUser() =>
        new()
        {
            UserId = "user-1",
            Login = "testuser",
            Email = "test@example.com",
            FirstName = "Test",
            LastName = "User",
            PrimaryAccountType = "SoldTo"
        };

    private static ValidateInvoiceAccount CreateValidatedAccount(string accountNumber, string companyCode, string invoiceNumber) =>
        new()
        {
            AccountNumber = accountNumber,
            InvoiceNumber = invoiceNumber,
            InvoiceDetail = new InvoiceDetail
            {
                HeaderData = new InvoiceHeaderData
                {
                    CompanyCode = companyCode,
                    Division = "00",
                    SalesOrganization = "3000",
                    DistributionChannel = "10"
                },
                PartnerData =
                [
                    new InvoicePartnerData { PartnerFunction = "RG", PartnerNumber = accountNumber }
                ]
            }
        };
}
