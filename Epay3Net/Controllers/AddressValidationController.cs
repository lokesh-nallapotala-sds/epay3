using Epay3Service.Clients.Interfaces;
using Epay3Net.Authorization.Abilities;
using Epay3Net.RateLimiting;
using Epay3Service.Configuration;
using Epay3Service.Helpers;
using Epay3Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SixLabors.ImageSharp;
using WorldpayAddressValidationServiceClient;

namespace Epay3Net.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [RequiresAbility(Ability.MakePayment)]
    public class AddressValidationController : Controller
    {
        private readonly IWorldPayAddressValidationServiceClient worldPayAddressValidationServiceClient;
        private readonly IConfiguration configuration;
        private readonly ApplicationSecrets secrets;
        public AddressValidationController(IWorldPayAddressValidationServiceClient worldPayAddressValidationServiceClient, IConfiguration configuration, ApplicationSecrets secrets)
        {
            this.worldPayAddressValidationServiceClient = worldPayAddressValidationServiceClient;
            this.configuration = configuration;
            this.secrets = secrets;
        }

        [HttpPost("WorldpayVerifyAddress")]
        public async Task<IActionResult> WorldpayVerifyAddress([FromBody] ITransactionHeader transactionHeader) =>
            await VerifyAddress(transactionHeader);

        [HttpPost("GuestWorldpayVerifyAddress")]
        [AllowAnonymous]
        [EnableRateLimiting(RateLimitPolicyNames.GuestPayment)]
        public async Task<IActionResult> GuestWorldpayVerifyAddress([FromBody] ITransactionHeader transactionHeader) =>
            await VerifyAddress(transactionHeader);

        private async Task<IActionResult> VerifyAddress(ITransactionHeader transactionHeader)
        {
            if (transactionHeader == null)
            {
                return BadRequest("Invalid request: transactionHeader is required.");
            }

            var AvsEnvValue = this.configuration["AvsKey"];
            if (!string.IsNullOrEmpty(transactionHeader.CardNumber))
            {
                transactionHeader.CardNumber = Encryption.Decrypt(transactionHeader.CardNumber, this.secrets.EncryptionKey);
            }
            if (string.IsNullOrEmpty(AvsEnvValue))
            {
                return BadRequest("Environment is required.");
            }

            var response = await this.worldPayAddressValidationServiceClient.VerifyAddressAsync(AvsEnvValue, transactionHeader);
            if (response != null)
            {
                bool statusCode = response.SoapOpResult.packets[0].StatusCode == 100;
                if (statusCode)
                {

                    return Ok(new { message = "Address verification completed successfully.", avsCode = response.SoapOpResult.packets[0].AVSCode });
                }

            }
            return StatusCode(500, new { message = response?.SoapOpResult.packets[0].Message });
        }
    }
}
