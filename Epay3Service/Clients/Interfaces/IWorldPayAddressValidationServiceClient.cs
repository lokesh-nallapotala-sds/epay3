using WorldpayAddressValidationServiceClient;

namespace Epay3Service.Clients.Interfaces
{
    public interface IWorldPayAddressValidationServiceClient
    {
        Task<SoapOpResponse?> VerifyAddressAsync(string env, ITransactionHeader request);
    }
}
