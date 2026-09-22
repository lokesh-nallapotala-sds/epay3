using Epay3Service.Clients.Interfaces;
using Epay3Service.Clients.Models;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;
using Newtonsoft.Json;
using System.ServiceModel;
using WorldpayAddressValidationServiceClient;

namespace Epay3Service.Clients
{
    public class WorldPayAddressValidationServiceClient : IWorldPayAddressValidationServiceClient
    {
        private readonly IApplicationConfigurationManager _configManager;

        public WorldPayAddressValidationServiceClient(IApplicationConfigurationManager configManager)
        {
            _configManager = configManager;
        }

        public async Task<SoapOpResponse?> VerifyAddressAsync(string env, ITransactionHeader request)
        {
            SoapOpResponse result;
            SapCustomData? config = await this._configManager.GetCustomConfig("en",true);
            string avsKey = env; 
            // Get the matching parameter
            var parameter = config?.Parameters.FirstOrDefault(obj => obj.Name == avsKey);
            AddressValidationServiceCredentials? credentials = null;

            if (!string.IsNullOrEmpty(parameter?.Value))
            {
                try
                {
                    credentials = JsonConvert.DeserializeObject<AddressValidationServiceCredentials>(parameter.Value);
                }
                catch (JsonException ex)
                {
                    throw new InvalidOperationException("Failed to deserialize AVS credentials", ex);
                }
            }

            // Validate that credentials are properly populated before using them
            if (credentials == null || string.IsNullOrWhiteSpace(credentials.Domain))
            {
                throw new InvalidOperationException("AVS credentials are missing or invalid.");
            }


            var endpoint = new EndpointAddress(credentials?.Domain);
            var binding = new BasicHttpBinding
            {
                Security = new BasicHttpSecurity
                {
                    Mode = BasicHttpSecurityMode.TransportWithMessageCredential,
                    Transport = new HttpTransportSecurity
                    {
                        ClientCredentialType = HttpClientCredentialType.Windows
                    },
                    Message = new BasicHttpMessageSecurity
                    {
                        ClientCredentialType = BasicHttpMessageCredentialType.UserName
                    }
                },
                SendTimeout = TimeSpan.FromMinutes(5),
                ReceiveTimeout = TimeSpan.FromMinutes(5),
                OpenTimeout = TimeSpan.FromMinutes(2),
                CloseTimeout = TimeSpan.FromMinutes(2)
            };

            try
            {
                using (var client = new XiPayWSSoapClient(binding, endpoint))
                {
                    client.ClientCredentials.UserName.UserName = credentials?.Username;
                    client.ClientCredentials.UserName.Password = credentials?.Password;
                    client.ClientCredentials.Windows.ClientCredential =
                        new System.Net.NetworkCredential(credentials?.Username, credentials?.Password, credentials?.Domain);

                    await client.OpenAsync();
                    result = await client.SoapOpAsync(new IPackets { packets = new[] { request }, count = 1 });

                    return result;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"An error occurred: {ex.Message}");
            }

            return null;
        }
    }
}
