using Epay3Net.Controllers;
using Epay3Service.Clients.Interfaces;
using Epay3Service.Configuration;
using Epay3Service.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Moq;
using WorldpayAddressValidationServiceClient;

namespace Epay3Net.Tests.Controllers;

public class AddressValidationControllerTests
{
    private const string EncryptionKey = "address-encryption-key-long-enough";

    private readonly Mock<IWorldPayAddressValidationServiceClient> _mockWorldPayClient = new();
    private readonly Mock<IConfiguration> _mockConfiguration = new();
    private readonly ApplicationSecrets _applicationSecrets = new()
    {
        EncryptionKey = EncryptionKey,
        CvvEncryptionKey = "unused-cvv-key",
        RequestsTokenKey = "unused-request-token-key"
    };

    [Fact]
    public async Task WorldpayVerifyAddress_ReturnsBadRequest_WhenTransactionHeaderMissing()
    {
        var controller = CreateController();

        IActionResult result = await controller.WorldpayVerifyAddress(null!);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Invalid request: transactionHeader is required.", badRequest.Value);
        _mockWorldPayClient.Verify(
            client => client.VerifyAddressAsync(It.IsAny<string>(), It.IsAny<ITransactionHeader>()),
            Times.Never);
    }

    [Fact]
    public async Task GuestWorldpayVerifyAddress_ReturnsBadRequest_WhenAvsKeyMissing()
    {
        var controller = CreateController();
        var transactionHeader = new ITransactionHeader();

        _mockConfiguration.Setup(config => config["AvsKey"]).Returns((string?)null);

        IActionResult result = await controller.GuestWorldpayVerifyAddress(transactionHeader);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Environment is required.", badRequest.Value);
        _mockWorldPayClient.Verify(
            client => client.VerifyAddressAsync(It.IsAny<string>(), It.IsAny<ITransactionHeader>()),
            Times.Never);
    }

    [Fact]
    public async Task WorldpayVerifyAddress_DecryptsCardAndReturnsOk_WhenServiceSucceeds()
    {
        var controller = CreateController();
        var encryptedCardNumber = Encryption.Encrypt("4111111111111111", EncryptionKey);
        var transactionHeader = new ITransactionHeader
        {
            CardNumber = encryptedCardNumber
        };

        ITransactionHeader? capturedRequest = null;
        _mockConfiguration.Setup(config => config["AvsKey"]).Returns("CERT");
        _mockWorldPayClient
            .Setup(client => client.VerifyAddressAsync("CERT", It.IsAny<ITransactionHeader>()))
            .Callback<string, ITransactionHeader>((_, request) => capturedRequest = request)
            .ReturnsAsync(new SoapOpResponse(new IPackets
            {
                packets =
                [
                    new ITransactionHeader
                    {
                        StatusCode = 100,
                        AVSCode = "Y"
                    }
                ]
            }));

        IActionResult result = await controller.WorldpayVerifyAddress(transactionHeader);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(capturedRequest);
        Assert.Equal("4111111111111111", capturedRequest!.CardNumber);
        Assert.Equal("Address verification completed successfully.", okResult.Value!.GetType().GetProperty("message")!.GetValue(okResult.Value));
        Assert.Equal("Y", okResult.Value!.GetType().GetProperty("avsCode")!.GetValue(okResult.Value));
    }

    [Fact]
    public async Task WorldpayVerifyAddress_ReturnsServerError_WhenStatusCodeIsNotSuccess()
    {
        var controller = CreateController();
        var transactionHeader = new ITransactionHeader();

        _mockConfiguration.Setup(config => config["AvsKey"]).Returns("CERT");
        _mockWorldPayClient
            .Setup(client => client.VerifyAddressAsync("CERT", transactionHeader))
            .ReturnsAsync(new SoapOpResponse(new IPackets
            {
                packets =
                [
                    new ITransactionHeader
                    {
                        StatusCode = 200,
                        Message = "Address verification failed"
                    }
                ]
            }));

        IActionResult result = await controller.WorldpayVerifyAddress(transactionHeader);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(500, objectResult.StatusCode);
        Assert.Equal("Address verification failed", objectResult.Value!.GetType().GetProperty("message")!.GetValue(objectResult.Value));
    }

    [Fact]
    public async Task GuestWorldpayVerifyAddress_ReturnsServerError_WhenServiceReturnsNull()
    {
        var controller = CreateController();
        var transactionHeader = new ITransactionHeader();

        _mockConfiguration.Setup(config => config["AvsKey"]).Returns("CERT");
        _mockWorldPayClient
            .Setup(client => client.VerifyAddressAsync("CERT", transactionHeader))
            .ReturnsAsync((SoapOpResponse?)null);

        IActionResult result = await controller.GuestWorldpayVerifyAddress(transactionHeader);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(500, objectResult.StatusCode);
        Assert.Null(objectResult.Value!.GetType().GetProperty("message")!.GetValue(objectResult.Value));
    }

    private AddressValidationController CreateController() =>
        new(_mockWorldPayClient.Object, _mockConfiguration.Object, _applicationSecrets);
}
