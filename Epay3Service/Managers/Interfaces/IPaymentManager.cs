using Epay3Service.Clients.Models;
using Epay3Service.Models;
using WebAR.Service.Services.API.Models;

namespace Epay3Service.Managers.Interfaces;

public interface IPaymentManager
{
    public Task<PayerDetail?> GetPayerDetails(User user, string selectedAccount, string payer, string language = "en");

    public Task<PayerDetail?> GetGuestPayerDetails(PayerDetailsRequest request, string language = "en");

    public Task<PaymentAccessToken?> GetPaymentAccessToken(Dictionary<string, string?> queryParams, string language = "en");

    public Task<PaymentAccessToken?> GetAccessToken(User user, string selectedAccount, string payer, SapCustomData customData, string cardKey, decimal amount, string currency, string redirectURI, string language = "en", PaymentMethod? paymentMethod = null, string? companyCode = null);

    public Task<Dictionary<string, string?>> GetCardinalData(User user, string selectedAccount, string payer, SapCustomData customData, string cardKey, decimal amount, string currency, string language = "en");

    // Task<PaymentAccessToken?> GetPaymentCCAccessToken(string language = "en");

    public Task<AccessTokenResponse?> GetPaymentResponse(string accessToken, string language = "en");

    public Task<TokenizationResponse> GetTokenResponse(TokenizationRequest request, string language = "en");

    public Task<PaymentReceipt?> MakePayment(User user, string selectedAccount, string payer, string companyCode, List<PaymentInvoice> documents, string? cvv, CardinalData? cardinalData, string userAgent, string country, string language = "en", PaymentMethod? paymentCard = null);

    public Task<SapHttpStatus?> ScheduledPayment(User user, string selectedAccount, string payer, string companyCode, List<PaymentInvoice> documents, string? cvv, CardinalData? cardinalData, string userAgent, string country, string language = "en", PaymentMethod? paymentCard = null, string? scheduledDate = null);

    public Task<SapHttpStatus?> DeleteSchedulepayment(User user, string scheduleId, string CustomerNumber, string companyCode, string language = "en");

    public Task<PaymentReceipt?> MakeGuestPayment(PayerData payer, SoldToPayment soldTo, List<PaymentInvoice> documents, PaymentDetail paymentDetail, string country, CardinalData? cardinalData = null, string? guestUserEmail = null, string language = "en");




    public Task<DepositsResponse?> MakeDeposit(User user, string selectedAccount, string companyCode, string payer, DepositDetail depositDetails, string currecnyKey, string? cvv, CardinalData? cardinalData, string userAgent, string language = "en", PaymentMethod? paymentCard = null);

    public Task<PaymentCardsResponse?> ManagePaymentCard(User user, string action, PayerData payer, List<PaymentCard> paymentCards, string language = "en", bool returnStatusOnSapError = false, SapPaymentCardAddressData? addressData = null);
    Task<PaymentCardsResponse?> ManageGuestPaymentCard(string action, PayerData payer, List<PaymentCard> paymentCards, string language = "en", bool returnStatusOnSapError = false, SapPaymentCardAddressData? addressData = null);

    public Task<AutoPayEnrollmentResponse?> ManageAutoPay(User user, PayerData payer, bool isEnrolled, string paymentMethodType, string? paymentCardToken, string language = "en");
}
