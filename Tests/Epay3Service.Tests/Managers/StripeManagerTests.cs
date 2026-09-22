using Epay3Service.Clients.Interfaces;
using Epay3Service.DTOs;
using Epay3Service.Managers;
using Microsoft.Extensions.Logging;
using Moq;

namespace Epay3Service.Tests.Managers;

/// <summary>
/// Unit tests for <see cref="StripeManager"/>.
///
/// All tests mock <see cref="ISalesforceHttpClient"/> to avoid real
/// Salesforce / Stripe network calls.
/// </summary>
public class StripeManagerTests
{
    // ─────────────────────────────────────────────────────────────────────────
    // Fixtures
    // ─────────────────────────────────────────────────────────────────────────

    private readonly Mock<ISalesforceHttpClient> _mockSfClient = new();
    private readonly Mock<ILogger<StripeManager>> _mockLogger = new();
    private readonly StripeManager _manager;

    public StripeManagerTests()
    {
        _manager = new StripeManager(
            _mockSfClient.Object,
            _mockLogger.Object);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private static StripePaymentIntentRequest ValidRequest() => new()
    {
        Amount        = 250.00m,
        CurrencyCode  = "USD",
        CustomerName  = "Test Customer",
        CustomerEmail = "test@example.com",
        InvoiceNumber = "INV-001",
        Description   = "Payment for invoice INV-001",
    };

    private static StripePaymentIntentResponse ValidIntentResponse() => new()
    {
        PaymentIntentId = "pi_test_001",
        ClientSecret    = "pi_test_001_secret_abc",
        Status          = "requires_payment_method",
        Amount          = 25000,
        CurrencyCode    = "usd",
    };

    // ─────────────────────────────────────────────────────────────────────────
    // CreatePaymentIntentAsync — happy path
    // ─────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreatePaymentIntentAsync_ReturnsResponse_WhenSalesforceSucceeds()
    {
        // Arrange
        var expectedResponse = ValidIntentResponse();

        _mockSfClient
            .Setup(c => c.PostAsync<StripePaymentIntentResponse>(
                It.Is<string>(p => p.Contains("paymentIntent")),
                It.IsAny<object?>(),
                It.IsAny<Dictionary<string, string?>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedResponse);

        // Act
        var result = await _manager.CreatePaymentIntentAsync(ValidRequest());

        // Assert
        Assert.NotNull(result);
        Assert.Equal("pi_test_001",          result.PaymentIntentId);
        Assert.Equal("pi_test_001_secret_abc", result.ClientSecret);
        Assert.Equal("requires_payment_method", result.Status);
        Assert.Equal(25000,  result.Amount);
        Assert.Equal("usd",  result.CurrencyCode);
    }

    [Fact]
    public async Task CreatePaymentIntentAsync_DefaultsCurrency_WhenNotProvided()
    {
        // Arrange
        var request = ValidRequest();
        request.CurrencyCode = "";  // blank — should default to USD

        _mockSfClient
            .Setup(c => c.PostAsync<StripePaymentIntentResponse>(
                It.IsAny<string>(),
                It.Is<object?>(b => b != null),
                It.IsAny<Dictionary<string, string?>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(ValidIntentResponse());

        // Act
        var result = await _manager.CreatePaymentIntentAsync(request);

        // Assert — should not throw; SF client was called
        Assert.NotNull(result);
        _mockSfClient.Verify(c => c.PostAsync<StripePaymentIntentResponse>(
            It.IsAny<string>(),
            It.IsAny<object?>(),
            It.IsAny<Dictionary<string, string?>>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CreatePaymentIntentAsync — validation
    // ─────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreatePaymentIntentAsync_Throws_WhenRequestIsNull()
    {
        await Assert.ThrowsAsync<ArgumentNullException>(
            () => _manager.CreatePaymentIntentAsync(null!));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-100.50)]
    public async Task CreatePaymentIntentAsync_Throws_WhenAmountIsNonPositive(decimal amount)
    {
        var request = ValidRequest();
        request.Amount = amount;

        await Assert.ThrowsAsync<ArgumentException>(
            () => _manager.CreatePaymentIntentAsync(request));
    }

    [Fact]
    public async Task CreatePaymentIntentAsync_Throws_WhenSalesforceReturnsNull()
    {
        // Arrange
        _mockSfClient
            .Setup(c => c.PostAsync<StripePaymentIntentResponse>(
                It.IsAny<string>(),
                It.IsAny<object?>(),
                It.IsAny<Dictionary<string, string?>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((StripePaymentIntentResponse?)null);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _manager.CreatePaymentIntentAsync(ValidRequest()));
    }

    [Fact]
    public async Task CreatePaymentIntentAsync_Throws_WhenClientSecretMissing()
    {
        // Arrange
        _mockSfClient
            .Setup(c => c.PostAsync<StripePaymentIntentResponse>(
                It.IsAny<string>(),
                It.IsAny<object?>(),
                It.IsAny<Dictionary<string, string?>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new StripePaymentIntentResponse
            {
                PaymentIntentId = "pi_test_001",
                ClientSecret    = null,   // ← missing
                Status          = "requires_payment_method",
            });

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _manager.CreatePaymentIntentAsync(ValidRequest()));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GetPaymentIntentAsync
    // ─────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetPaymentIntentAsync_ReturnsResponse_WhenSalesforceSucceeds()
    {
        // Arrange
        var expected = ValidIntentResponse();
        expected.Status = "succeeded";

        _mockSfClient
            .Setup(c => c.GetAsync<StripePaymentIntentResponse>(
                It.Is<string>(p => p.Contains("pi_test_001")),
                It.IsAny<Dictionary<string, string?>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        // Act
        var result = await _manager.GetPaymentIntentAsync("pi_test_001");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("pi_test_001", result.PaymentIntentId);
        Assert.Equal("succeeded",   result.Status);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task GetPaymentIntentAsync_Throws_WhenIdIsNullOrEmpty(string? id)
    {
        await Assert.ThrowsAsync<ArgumentException>(
            () => _manager.GetPaymentIntentAsync(id!));
    }

    [Fact]
    public async Task GetPaymentIntentAsync_Throws_WhenIdHasInvalidFormat()
    {
        await Assert.ThrowsAsync<ArgumentException>(
            () => _manager.GetPaymentIntentAsync("invalid_id_format"));
    }

    [Fact]
    public async Task GetPaymentIntentAsync_Throws_WhenSalesforceReturnsNull()
    {
        _mockSfClient
            .Setup(c => c.GetAsync<StripePaymentIntentResponse>(
                It.IsAny<string>(),
                It.IsAny<Dictionary<string, string?>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((StripePaymentIntentResponse?)null);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _manager.GetPaymentIntentAsync("pi_test_001"));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GetPublishableKeyAsync
    // ─────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetPublishableKeyAsync_ReturnsKey_WhenSalesforceSucceeds()
    {
        _mockSfClient
            .Setup(c => c.GetAsync<StripePublishableKeyResponse>(
                It.Is<string>(p => p.Contains("config")),
                It.IsAny<Dictionary<string, string?>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new StripePublishableKeyResponse
            {
                PublishableKey = "pk_test_51XXXXXXXXXXXX"
            });

        var key = await _manager.GetPublishableKeyAsync();

        Assert.Equal("pk_test_51XXXXXXXXXXXX", key);
    }

    [Fact]
    public async Task GetPublishableKeyAsync_Throws_WhenKeyIsEmpty()
    {
        _mockSfClient
            .Setup(c => c.GetAsync<StripePublishableKeyResponse>(
                It.IsAny<string>(),
                It.IsAny<Dictionary<string, string?>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new StripePublishableKeyResponse { PublishableKey = "" });

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _manager.GetPublishableKeyAsync());
    }

    [Fact]
    public async Task GetPublishableKeyAsync_Throws_WhenKeyHasInvalidFormat()
    {
        _mockSfClient
            .Setup(c => c.GetAsync<StripePublishableKeyResponse>(
                It.IsAny<string>(),
                It.IsAny<Dictionary<string, string?>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new StripePublishableKeyResponse { PublishableKey = "sk_test_INVALID" });

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _manager.GetPublishableKeyAsync());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CreateRefundAsync
    // ─────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateRefundAsync_ReturnsRefund_WhenSalesforceSucceeds()
    {
        _mockSfClient
            .Setup(c => c.PostAsync<StripeRefundResponse>(
                It.Is<string>(p => p.Contains("refund")),
                It.IsAny<object?>(),
                It.IsAny<Dictionary<string, string?>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new StripeRefundResponse
            {
                RefundId        = "re_test_001",
                PaymentIntentId = "pi_test_001",
                Amount          = 5000,
                CurrencyCode    = "usd",
                Status          = "succeeded",
            });

        var result = await _manager.CreateRefundAsync(new StripeRefundRequest
        {
            PaymentIntentId = "pi_test_001",
            Amount          = 50.00m,
            CurrencyCode    = "USD",
        });

        Assert.NotNull(result);
        Assert.Equal("re_test_001", result.RefundId);
        Assert.Equal("succeeded",   result.Status);
    }

    [Fact]
    public async Task CreateRefundAsync_Throws_WhenPaymentIntentIdMissing()
    {
        await Assert.ThrowsAsync<ArgumentException>(
            () => _manager.CreateRefundAsync(new StripeRefundRequest { PaymentIntentId = "" }));
    }

    [Fact]
    public async Task CreateRefundAsync_Throws_WhenPartialAmountRequiresCurrency()
    {
        await Assert.ThrowsAsync<ArgumentException>(
            () => _manager.CreateRefundAsync(new StripeRefundRequest
            {
                PaymentIntentId = "pi_test_001",
                Amount          = 50.00m,
                CurrencyCode    = null,   // ← missing when amount provided
            }));
    }

    [Fact]
    public async Task CreateRefundAsync_Succeeds_FullRefund_WithNullAmount()
    {
        _mockSfClient
            .Setup(c => c.PostAsync<StripeRefundResponse>(
                It.IsAny<string>(),
                It.IsAny<object?>(),
                It.IsAny<Dictionary<string, string?>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new StripeRefundResponse
            {
                RefundId        = "re_test_002",
                PaymentIntentId = "pi_test_001",
                Status          = "succeeded",
            });

        // Full refund: Amount = null, CurrencyCode = null
        var result = await _manager.CreateRefundAsync(new StripeRefundRequest
        {
            PaymentIntentId = "pi_test_001",
            Amount          = null,
            CurrencyCode    = null,
        });

        Assert.NotNull(result);
        Assert.Equal("re_test_002", result.RefundId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CreatePaymentMethodAsync
    // ─────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreatePaymentMethodAsync_ReturnsResponse_WhenSalesforceSucceeds()
    {
        _mockSfClient
            .Setup(c => c.PostAsync<StripePaymentMethodResponse>(
                It.Is<string>(s => s.Contains("paymentMethod")),
                It.IsAny<object?>(),
                It.IsAny<Dictionary<string, string?>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new StripePaymentMethodResponse
            {
                Success = true,
                PaymentMethodId = "pm_test_123",
                CustomerId = "cus_test_456",
                SalesforcePaymentMethodId = "a01xx0000012345AAA",
                Message = "Success"
            });

        var result = await _manager.CreatePaymentMethodAsync(new StripePaymentMethodRequest
        {
            PaymentMethodId = "pm_test_123",
            CustomerId = "cus_test_456",
            AccountId = "001xx0000012345AAA",
            CardholderName = "Jane Doe",
            SetDefault = true,
        });

        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.Equal("pm_test_123", result.PaymentMethodId);
        Assert.Equal("a01xx0000012345AAA", result.SalesforcePaymentMethodId);
    }

    [Fact]
    public async Task CreatePaymentMethodAsync_ThrowsArgumentNull_WhenRequestIsNull()
    {
        await Assert.ThrowsAsync<ArgumentNullException>(
            () => _manager.CreatePaymentMethodAsync(null!));
    }

    [Fact]
    public async Task CreatePaymentMethodAsync_ThrowsArgumentException_WhenPaymentMethodIdIsEmpty()
    {
        await Assert.ThrowsAsync<ArgumentException>(
            () => _manager.CreatePaymentMethodAsync(new StripePaymentMethodRequest { PaymentMethodId = "" }));
    }
}

