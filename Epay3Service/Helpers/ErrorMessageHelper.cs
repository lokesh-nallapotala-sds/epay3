using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text.RegularExpressions;
using Epay3Service.Managers.Interfaces;

public static class ErrorMessageHelper
{
    private static readonly Dictionary<string, string> ErrorMappings = new()
    {
        {
            "Approval not received for payment",
            "Approval not received for payment of amount {currency} {amount}"
        },
        {
            "Card declined due to insufficient funds",
            "Card was declined – insufficient funds"
        },
        {
            "Transaction failed due to expired card",
            "Your card is expired"
        }
        // Add more mappings as needed
    };

    public static string GetFriendlyMessage(string errorMessage, string language, ILanguageManager languageManager)
    {
        foreach (var entry in ErrorMappings)
        {
            if (errorMessage.StartsWith(entry.Key, StringComparison.OrdinalIgnoreCase))
            {
                // Detect if the value contains placeholders to trigger dynamic substitution
                if (entry.Value.Contains("{amount}") || entry.Value.Contains("{currency}"))
                {
                    return TransformToFriendlyPaymentMessage(errorMessage, entry.Value);
                }

                return entry.Value;
            }
        }

        // Fallback
        string ts = DateTime.UtcNow.ToString("HHmmssMMddyyyy", CultureInfo.InvariantCulture);
        return languageManager.GetMessage("error.unknown.message", language, "Something went wrong.  If the issue persists, please contact customer service and provide this code: ({timestamp})").Replace("{timestamp}", ts);
    }

    private static string TransformToFriendlyPaymentMessage(string rawMessage, string template)
    {
        // Match any 3-letter currency and amount
        var match = Regex.Match(rawMessage, @"amount\s+([A-Z]{3})\s+(\d+(\.\d{1,3})?)");

        if (match.Success)
        {
            string currency = match.Groups[1].Value;
            string amount = match.Groups[2].Value;
            decimal amountDecimal = decimal.Parse(amount, CultureInfo.InvariantCulture);
            string formattedAmount = amountDecimal.ToString("F2", CultureInfo.InvariantCulture);
            return template
                .Replace("{currency}", currency)
                .Replace("{amount}", formattedAmount);
        }

        // Fallback if currency/amount not found
        return template
            .Replace("{currency}", "XXX")
            .Replace("{amount}", "UNKNOWN");
    }
}
