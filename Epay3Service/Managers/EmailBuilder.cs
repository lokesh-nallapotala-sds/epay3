using System.Globalization;
using System.Text.RegularExpressions;
using Epay3Service.Models;

namespace Epay3Service.Managers;

public class EmailBuilder {
    private const string PaymentsStartString = "[[payments_start]]";
    private const string PaymentsEndString = "[[payments_end]]";

    public static string BuildReceiptEmail(string template, Localizer localizer, CultureInfo culture, User user,
        SapPaymentRequest request, SystemConfiguration config, string language, string country) {
        var body = template;
        var start = body.IndexOf(PaymentsStartString, StringComparison.Ordinal);
        var end = body.IndexOf(PaymentsEndString, StringComparison.Ordinal);
        string now = GetNowDateFormatted(culture);

        if (start != -1 && end != -1) {
            var tableTemplate = body.Substring(start + PaymentsStartString.Length,
                end - (start + PaymentsStartString.Length));
            var innerBody = BuildReceiptInnerTable(request.Documents, tableTemplate, culture);
            body = body.Remove(start, end + PaymentsEndString.Length - start);
            body = body.Insert(start, innerBody);
        }

        string termsAndConditions = config.TermsAndConditions;
        termsAndConditions = termsAndConditions.Replace("country", country);
        termsAndConditions = termsAndConditions.Replace("language", language);
        body = body.Replace("[[first_name]]", user.FirstName);
        body = body.Replace("[[last_name]]", user.LastName);
        body = body.Replace("[[customer_number]]", request.SoldTo.AccountNumber);
        body = body.Replace("[[payment_method]]", request.PaymentDetail.PaymentMethod);
        body = body.Replace("[[card_type]]", request.PaymentDetail.PaymentCardType);
        body = body.Replace("[[payment_date]]", now);
        if (!user.FirstName?.Equals("guest", StringComparison.OrdinalIgnoreCase) == true)
        {
            body = body.Replace("[[company_name]]", request.PaymentDetail.AddressData.Name);
            body = body.Replace("[[company_name2]]", request.PaymentDetail.AddressData.Name2);
            body = body.Replace("[[company_name3]]", request.PaymentDetail.AddressData.Name3);
            body = body.Replace("[[company_name4]]", request.PaymentDetail.AddressData.Name4);
            body = body.Replace("[[address_line]]", request.PaymentDetail.AddressData.Street);
            body = body.Replace("[[address_city]]", request.PaymentDetail.AddressData.City);
            body = body.Replace("[[address_region]]", request.PaymentDetail.AddressData.Region);
            body = body.Replace("[[address_country]]", request.PaymentDetail.AddressData.Country);
            body = body.Replace("[[address_postal_code]]", request.PaymentDetail.AddressData.PostalCodeCity);
        }
        body = body.Replace("[[phone_number]]", "[[phone_number]]");
        body = body.Replace("[[site.contact_us_url]]", config.ContactUs);
        body = body.Replace("[[site.terms_conditions_url]]", termsAndConditions);


        // replace language
        string pattern = @"\{\{[\w._\-\(\)]*\}\}";
        bool find = true;

        var total = request.Documents.Sum(_ => _.PaymentAmount);
        var currencyKey = request.Documents[0].CurrencyKey;

        // Fallback replacement for payment placeholders
        if (request.Documents?.Any() == true)
        {
            var document = request.Documents.First();

            body = body.Replace("[[payment_number]]",
                document.BillingDocumentNumber?.TrimStart('0') ?? document.DocumentNumberFinance);

            body = body.Replace("[[document_date]]",
                document.DocumentDate?.ToString("d", culture) ?? string.Empty);

            body = body.Replace("[[payment_amount]]",
                currencyKey.Equals("JPY", StringComparison.OrdinalIgnoreCase)
                    ? $"{document.PaymentAmount}"
                    : $"{document.PaymentAmount:0.00}");
        }

        if (currencyKey.ToLowerInvariant() == "jpy") {
            body = body.Replace("[[payment_total]]", $"{total}");
            body = body.Replace("[[payment_currency]]", "\uffe5");
        }
        else {
            body = body.Replace("[[payment_total]]", $"{total:0.00}");
            body = body.Replace("[[payment_currency]]", currencyKey);
        }
        while (find) {
            Match m = Regex.Match(body, pattern, RegexOptions.IgnoreCase);
            if (m.Success) {
                var key = m.Value.Substring(2, m.Value.Length - 4);
                body = body.Replace(m.Value, localizer.FormatMessage(key));
            }
            else {
                find = false;
            }
        }

        return body;
    }

    private static string BuildReceiptInnerTable(List<PaymentInvoice> invoices, string innerTemplate, CultureInfo culture) {
        var innerSection = "";
        foreach (PaymentInvoice invoice in invoices) {
            var t = innerTemplate;

            t = t.Replace("[[payment_number]]",
                invoice.BillingDocumentNumber?.TrimStart(new Char[] { '0' }).ToString(culture));
            t = t.Replace("[[payment_date]]", GetNowDateFormatted(culture));
            if (!string.IsNullOrEmpty(invoice.DocumentDate?.ToString())) {
                DateTime documentDate =
                    DateTime.Parse(invoice.DocumentDate?.ToString(), CultureInfo.CreateSpecificCulture("en-US"));
                t = t.Replace("[[document_date]]", documentDate.ToString("d", culture));
            }

            var currencyKey = invoice.CurrencyKey;
            if (currencyKey.ToLowerInvariant() == "jpy") {
                t = t.Replace("[[payment_currency]]", "\uffe5");
                t = t.Replace("[[payment_amount]]", $"{invoice.PaymentAmount}");
            }
            else {
                t = t.Replace("[[payment_currency]]", invoice.CurrencyKey);
                t = t.Replace("[[payment_amount]]", $"{invoice.PaymentAmount:0.00}");
            }
            innerSection += t;
        }

        return innerSection;
    }

    public static string BuildWelcomeEmail(string template, string firstName, CultureInfo culture, string inviteId, string appUrl, SystemConfiguration config, string language, string country) {
        var body = template;
        string termsAndConditions = config.TermsAndConditions;
        termsAndConditions = termsAndConditions.Replace("country", country);
        termsAndConditions = termsAndConditions.Replace("language", language);
        string now = GetNowDateFormatted(culture);
        body = body.Replace("[[current_date]]", now);
        body = body.Replace("[[first_name]]", firstName);
        body = body.Replace("[[activation_url]]", $"{appUrl}/register/{inviteId}");
        body = body.Replace("[[site.contact_us_url]]", config.ContactUs);
        body = body.Replace("[[site.terms_conditions_url]]", termsAndConditions);
        return body;
    }

    public static string BuildResetPasswordEmail(string template, string firstName, CultureInfo culture, string resetId,
        object appUrl, SystemConfiguration config, string language, string country) {
        var body = template;
        string termsAndConditions = config.TermsAndConditions;
        termsAndConditions = termsAndConditions.Replace("country", country);
        termsAndConditions = termsAndConditions.Replace("language", language);
        string now = GetNowDateFormatted(culture);
        body = body.Replace("[[first_name]]", firstName);
        body = body.Replace("[[current_date]]", now);
        body = body.Replace("[[reset_url]]", $"{appUrl}/reset-password/{resetId}");
        body = body.Replace("[[site.contact_us_url]]", config.ContactUs);
        body = body.Replace("[[site.terms_conditions_url]]", termsAndConditions);
        return body;
    }


    public static string BuildPasswordChangedEmail(string template, string firstName, CultureInfo culture, string resetId,
object appUrl, SystemConfiguration config, string language, string country) {
        var body = template;
        string termsAndConditions = config.TermsAndConditions;
        termsAndConditions = termsAndConditions.Replace("country", country);
        termsAndConditions = termsAndConditions.Replace("language", language);
        string now = GetNowDateFormatted(culture);
        string time = GetNowTimeFormatted(culture);
        body = body.Replace("[[current_date]]", now);
        body = body.Replace("[[first_name]]", firstName);
        body = body.Replace("[[current_time]]", time);
        body = body.Replace("[[reset_url]]", $"{appUrl}/reset-password/{resetId}");
        body = body.Replace("[[site.contact_us_url]]", config.ContactUs);
        body = body.Replace("[[site.terms_conditions_url]]", termsAndConditions);
        return body;
    }

    public static string BuildRegistrationRequestEmail(string template, CultureInfo culture,
        RegistrationRequest request,
        string appUrl) {
        var body = template;
        string now = GetNowDateFormatted(culture);
        body = body.Replace("[[current_date]]", now);
        body = body.Replace("[[first_name]]", request.FirstName);
        body = body.Replace("[[last_name]]", request.LastName);
        body = body.Replace("[[email_address]]", request.Email);
        body = body.Replace("[[company_name]]", request.Company);
        body = body.Replace("[[message_body]]", request.Message);
        body = body.Replace("[[process_url]]", $"{appUrl}/settings/registration-requests");
        return body;
    }

    public static string BuildRegistrationRequestorEmail(string template, CultureInfo culture, string requestId) {
        var body = template;
        string now = GetNowDateFormatted(culture);
        body = body.Replace("[[current_date]]", now);
        body = body.Replace("[[request_id]]", requestId);
        return body;
    }

    public static string BuildConfirmationEmail(string template, string firstName, CultureInfo culture, string appUrl,
        string confirmationToken, SystemConfiguration config, string language, string country) {
        var body = template;
        string termsAndConditions = config.TermsAndConditions;
        termsAndConditions = termsAndConditions.Replace("country", country);
        termsAndConditions = termsAndConditions.Replace("language", language);
        string now = GetNowDateFormatted(culture);
        body = body.Replace("[[confirmation_url]]",
            $"{appUrl}/auto-register/confirm/{confirmationToken}");
        body = body.Replace("[[current_date]]", now);
        body = body.Replace("[[first_name]]", firstName);
        body = body.Replace("[[site.contact_us_url]]", config.ContactUs);
        body = body.Replace("[[site.terms_conditions_url]]", termsAndConditions);
        return body;
    }

    public static string BuildEmailChangeEmail(string template, string firstName, CultureInfo culture, string appUrl,
        string token, SystemConfiguration config, string language, string country) {
        var body = template;
        string termsAndConditions = config.TermsAndConditions;
        termsAndConditions = termsAndConditions.Replace("country", country);
        termsAndConditions = termsAndConditions.Replace("language", language);
        string now = GetNowDateFormatted(culture);
        body = body.Replace("[[confirmation_url]]",
            $"{appUrl}/confirm-email-change/{token}");
        body = body.Replace("[[current_date]]", now);
        body = body.Replace("[[first_name]]", firstName);
        body = body.Replace("[[site.contact_us_url]]", config.ContactUs);
        body = body.Replace("[[site.terms_conditions_url]]", termsAndConditions);
        return body;
    }

    private static string GetNowDateFormatted(CultureInfo culture) {
        DateTime now = DateTime.Now;
        return now.ToString("d", culture);
    }
    private static string GetNowTimeFormatted(CultureInfo culture) {
        DateTime now = DateTime.Now;
        return now.ToString("t", culture);
    }
}
