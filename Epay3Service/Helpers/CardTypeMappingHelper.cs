namespace Epay3Service.Helpers;

public static class CardTypeMappingHelper
{
    public static string NormalizeCardType(string? cardType)
    {
        if (string.IsNullOrWhiteSpace(cardType))
        {
            return string.Empty;
        }

        string trimmed = cardType.Trim();
        string upper = trimmed.ToUpperInvariant();

        return upper switch
        {
            "MAST" or "MC" or "MASTERCARD" => "MC",
            "VISA" or "VI" => "VISA",
            "AMEX" or "AX" or "AMERICAN_EXPRESS" or "AMERICAN-EXPRESS" => "AMEX",
            "DISC" or "DI" or "DISCOVER" => "DISC",
            "DINERS" or "DN" or "DINERS_CLUB" or "DINERS-CLUB" => "DINERS_CLUB",
            "JCB" or "JC" => "JCB",
            "EC" => "EC",
            "CC" or "CREDIT CARD" => "CREDIT CARD",
            _ => trimmed
        };
    }

    public static string ToSapCardType(string? cardType)
    {
        string normalized = NormalizeCardType(cardType);
        return normalized == "CREDIT CARD" ? "CC" : normalized;
    }

    public static string ToGatewayCardType(string? cardType)
    {
        string normalized = NormalizeCardType(cardType);

        return normalized switch
        {
            "MC" => "MC",
            "VISA" => "VI",
            "AMEX" => "AX",
            "DISC" => "DI",
            "DINERS_CLUB" => "DN",
            "JCB" => "JC",
            "EC" => "EC",
            "CREDIT CARD" => "CC",
            _ => normalized
        };
    }

    public static bool IsElectronicCheck(string? cardType) =>
        string.Equals(ToSapCardType(cardType), "EC", StringComparison.OrdinalIgnoreCase);
}
