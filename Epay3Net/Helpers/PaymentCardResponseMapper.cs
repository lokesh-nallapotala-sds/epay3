using Epay3Service.Helpers;
using Epay3Service.Models;

namespace Epay3Net.Helpers;

internal static class PaymentCardResponseMapper
{
    public static UserPayerDetailsDto? MapPayerDetails(
        PayerDetail? source,
        string? customerNumber,
        string? companyCode,
        string encryptionKey)
    {
        if (source == null)
        {
            return null;
        }

        return new UserPayerDetailsDto
        {
            CustomerNumber = customerNumber,
            CompanyCode = source.CompanyData?.FirstOrDefault()?.Data?.CompanyCode ?? companyCode,
            IsAutoPayEnrolled = source.IsAutoPayEnrolled,
            AddressData = CloneAddress(source.AddressData),
            PaymentCards = source.PaymentCards?.Select(card => MapPaymentCard(card, encryptionKey)).ToList() ?? [],
            PayerAutoPayStatus = source.PayerAutoPayStatus?.Select(status =>
                MapAutoPayStatus(status, encryptionKey, source.PaymentCards)).ToList() ?? []
        };
    }

    public static PaymentCardResponseDto MapPaymentCard(PaymentCard card, string encryptionKey)
    {
        string sapCardType = CardTypeMappingHelper.ToSapCardType(card.PaymentCardType);

        return new PaymentCardResponseDto
        {
            PaymentCardType = card.PaymentCardType,
            SapCardType = sapCardType,
            GatewayCardType = CardTypeMappingHelper.ToGatewayCardType(card.PaymentCardType),
            PaymentCardToken = EncryptToken(card.PaymentCardToken, encryptionKey),
            PaymentCardName = card.PaymentCardName,
            ValidFrom = card.ValidFrom,
            ValidTo = card.ValidTo,
            ElectronicCheckAccountType = card.ElectronicCheckAccountType,
            ElectronicCheckRdfiNumber = card.ElectronicCheckRdfiNumber,
            Default = card.Default,
            CardLast4Digit = card.CardLast4Digit,
            CardValidationCode = card.CardValidationCode
        };
    }

    public static AutoPayStatus MapAutoPayStatus(
        AutoPayStatus status,
        string encryptionKey,
        IEnumerable<PaymentCard>? paymentCards = null
    )
    {
        string? cardLast4Digit = status.CardLast4Digit;

        if (!string.IsNullOrEmpty(status.PaymentCardToken))
        {
            PaymentCard? matchedCard = paymentCards?.FirstOrDefault(card =>
                string.Equals(card.PaymentCardToken, status.PaymentCardToken, StringComparison.OrdinalIgnoreCase));

            if (!string.IsNullOrEmpty(matchedCard?.CardLast4Digit))
            {
                cardLast4Digit = matchedCard.CardLast4Digit;
            }
        }

        return new AutoPayStatus
        {
            CompanyCode = status.CompanyCode,
            Enrolled = status.Enrolled,
            PaymentMethod = status.PaymentMethod,
            PaymentCardToken = EncryptToken(status.PaymentCardToken, encryptionKey)?? "",
            CardLast4Digit = cardLast4Digit
        };
    }

    private static CompanyAddress? CloneAddress(CompanyAddress? address)
    {
        if (address == null)
        {
            return null;
        }

        return new CompanyAddress
        {
            Name = address.Name,
            Name2 = address.Name2,
            Name3 = address.Name3,
            Name4 = address.Name4,
            City = address.City,
            District = address.District,
            Street = address.Street,
            PostalCodeCity = address.PostalCodeCity,
            Region = address.Region,
            Country = address.Country
        };
    }

    private static string? EncryptToken(string? token, string encryptionKey)
    {
        if (string.IsNullOrEmpty(token))
        {
            return token;
        }

        return Encryption.Encrypt(token, encryptionKey);
    }
}
