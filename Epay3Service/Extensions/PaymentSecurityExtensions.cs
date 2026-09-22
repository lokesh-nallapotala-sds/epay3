using Epay3Service.Models;

namespace Epay3Service.Extensions;

public static class PaymentSecurityExtensions
{
    public static PayerDetail? WithoutCardValidationCodes(this PayerDetail? detail)
    {
        if (detail?.PaymentCards == null)
        {
            return detail;
        }

        foreach (PaymentCard paymentCard in detail.PaymentCards)
        {
            paymentCard.CardValidationCode = null;
        }

        return detail;
    }

    public static TokenizationResponse? WithoutCardValidationCode(this TokenizationResponse? response)
    {
        if (response?.PaymentCard != null)
        {
            response.PaymentCard.CardValidationCode = string.Empty;
        }

        return response;
    }
}
