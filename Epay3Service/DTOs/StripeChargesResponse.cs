using Newtonsoft.Json;
using System.Text.Json.Serialization;

namespace Epay3Service.DTOs;

public class StripeChargesResponse
{
    [JsonProperty("object")]
    [JsonPropertyName("object")]
    public string? Object { get; set; }

    [JsonProperty("data")]
    [JsonPropertyName("data")]
    public List<StripeChargeItem>? Data { get; set; }

    [JsonProperty("has_more")]
    [JsonPropertyName("has_more")]
    public bool HasMore { get; set; }

    [JsonProperty("url")]
    [JsonPropertyName("url")]
    public string? Url { get; set; }
}

public class StripeChargeItem
{
    [JsonProperty("id")]
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonProperty("object")]
    [JsonPropertyName("object")]
    public string? Object { get; set; }

    [JsonProperty("amount")]
    [JsonPropertyName("amount")]
    public decimal? Amount { get; set; }

    [JsonProperty("amount_captured")]
    [JsonPropertyName("amount_captured")]
    public decimal? AmountCaptured { get; set; }

    [JsonProperty("amount_refunded")]
    [JsonPropertyName("amount_refunded")]
    public decimal? AmountRefunded { get; set; }

    [JsonProperty("currency")]
    [JsonPropertyName("currency")]
    public string? Currency { get; set; }

    [JsonProperty("status")]
    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonProperty("paid")]
    [JsonPropertyName("paid")]
    public bool Paid { get; set; }

    [JsonProperty("refunded")]
    [JsonPropertyName("refunded")]
    public bool Refunded { get; set; }

    [JsonProperty("created")]
    [JsonPropertyName("created")]
    public long? Created { get; set; }

    [JsonProperty("description")]
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonProperty("statement_descriptor")]
    [JsonPropertyName("statement_descriptor")]
    public string? StatementDescriptor { get; set; }

    [JsonProperty("customer")]
    [JsonPropertyName("customer")]
    public string? Customer { get; set; }

    [JsonProperty("failure_code")]
    [JsonPropertyName("failure_code")]
    public string? FailureCode { get; set; }

    [JsonProperty("failure_message")]
    [JsonPropertyName("failure_message")]
    public string? FailureMessage { get; set; }

    [JsonProperty("receipt_email")]
    [JsonPropertyName("receipt_email")]
    public string? ReceiptEmail { get; set; }

    [JsonProperty("receipt_number")]
    [JsonPropertyName("receipt_number")]
    public string? ReceiptNumber { get; set; }

    [JsonProperty("receipt_url")]
    [JsonPropertyName("receipt_url")]
    public string? ReceiptUrl { get; set; }

    [JsonProperty("payment_method_details")]
    [JsonPropertyName("payment_method_details")]
    public StripePaymentMethodDetails? PaymentMethodDetails { get; set; }

    [JsonProperty("paymentMethodDetails")]
    [JsonPropertyName("paymentMethodDetails")]
    public StripePaymentMethodDetails? PaymentMethodDetailsCamel
    {
        get => PaymentMethodDetails;
        set { if (value != null && PaymentMethodDetails == null) PaymentMethodDetails = value; }
    }

    [JsonProperty("billing_details")]
    [JsonPropertyName("billing_details")]
    public StripeChargeBillingDetails? BillingDetails { get; set; }

    [JsonProperty("billingDetails")]
    [JsonPropertyName("billingDetails")]
    public StripeChargeBillingDetails? BillingDetailsCamel
    {
        get => BillingDetails;
        set { if (value != null && BillingDetails == null) BillingDetails = value; }
    }

    [JsonProperty("outcome")]
    [JsonPropertyName("outcome")]
    public StripeChargeOutcome? Outcome { get; set; }

    [JsonProperty("refunds")]
    [JsonPropertyName("refunds")]
    public StripeRefundsList? Refunds { get; set; }

    [JsonProperty("payment_intent")]
    [JsonPropertyName("payment_intent")]
    public string? PaymentIntent { get; set; }

    [JsonProperty("metadata")]
    [JsonPropertyName("metadata")]
    public Dictionary<string, string>? Metadata { get; set; }
}

public class StripePaymentMethodDetails
{
    [JsonProperty("type")]
    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonProperty("card")]
    [JsonPropertyName("card")]
    public StripeCardDetails? Card { get; set; }

    [JsonProperty("us_bank_account")]
    [JsonPropertyName("us_bank_account")]
    public StripeBankAccountDetails? UsBankAccount { get; set; }
}

public class StripeCardDetails
{
    [JsonProperty("brand")]
    [JsonPropertyName("brand")]
    public string? Brand { get; set; }

    [JsonProperty("last4")]
    [JsonPropertyName("last4")]
    public string? Last4 { get; set; }

    [JsonProperty("exp_month")]
    [JsonPropertyName("exp_month")]
    public int? ExpMonth { get; set; }

    [JsonProperty("expMonth")]
    [JsonPropertyName("expMonth")]
    public int? ExpMonthCamel
    {
        get => ExpMonth;
        set { if (value.HasValue && !ExpMonth.HasValue) ExpMonth = value; }
    }

    [JsonProperty("exp_year")]
    [JsonPropertyName("exp_year")]
    public int? ExpYear { get; set; }

    [JsonProperty("expYear")]
    [JsonPropertyName("expYear")]
    public int? ExpYearCamel
    {
        get => ExpYear;
        set { if (value.HasValue && !ExpYear.HasValue) ExpYear = value; }
    }

    [JsonProperty("funding")]
    [JsonPropertyName("funding")]
    public string? Funding { get; set; }

    [JsonProperty("country")]
    [JsonPropertyName("country")]
    public string? Country { get; set; }
}

public class StripeBankAccountDetails
{
    [JsonProperty("bank_name")]
    [JsonPropertyName("bank_name")]
    public string? BankName { get; set; }

    [JsonProperty("last4")]
    [JsonPropertyName("last4")]
    public string? Last4 { get; set; }

    [JsonProperty("routing_number")]
    [JsonPropertyName("routing_number")]
    public string? RoutingNumber { get; set; }

    [JsonProperty("account_holder_type")]
    [JsonPropertyName("account_holder_type")]
    public string? AccountHolderType { get; set; }
}

public class StripeChargeBillingDetails
{
    [JsonProperty("name")]
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonProperty("email")]
    [JsonPropertyName("email")]
    public string? Email { get; set; }

    [JsonProperty("phone")]
    [JsonPropertyName("phone")]
    public string? Phone { get; set; }
}

public class StripeChargeOutcome
{
    [JsonProperty("network_status")]
    [JsonPropertyName("network_status")]
    public string? NetworkStatus { get; set; }

    [JsonProperty("reason")]
    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonProperty("risk_level")]
    [JsonPropertyName("risk_level")]
    public string? RiskLevel { get; set; }

    [JsonProperty("seller_message")]
    [JsonPropertyName("seller_message")]
    public string? SellerMessage { get; set; }

    [JsonProperty("type")]
    [JsonPropertyName("type")]
    public string? Type { get; set; }
}

public class StripeRefundsList
{
    [JsonProperty("data")]
    [JsonPropertyName("data")]
    public List<StripeRefundItem>? Data { get; set; }

    [JsonProperty("total_count")]
    [JsonPropertyName("total_count")]
    public int? TotalCount { get; set; }
}

public class StripeRefundItem
{
    [JsonProperty("id")]
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonProperty("amount")]
    [JsonPropertyName("amount")]
    public decimal? Amount { get; set; }

    [JsonProperty("currency")]
    [JsonPropertyName("currency")]
    public string? Currency { get; set; }

    [JsonProperty("status")]
    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonProperty("created")]
    [JsonPropertyName("created")]
    public long? Created { get; set; }
}
