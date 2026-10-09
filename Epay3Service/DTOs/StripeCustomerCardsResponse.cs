using Newtonsoft.Json;
using System.Text.Json.Serialization;

namespace Epay3Service.DTOs;

public class StripeCustomerCardsResponse
{
    [JsonProperty("customer")]
    [JsonPropertyName("customer")]
    public object? Customer { get; set; }

    [JsonProperty("isNewCustomer")]
    [JsonPropertyName("isNewCustomer")]
    public bool IsNewCustomer { get; set; }

    [JsonProperty("paymentMethods")]
    [JsonPropertyName("paymentMethods")]
    public List<StripeCustomerPaymentMethodDto>? PaymentMethods { get; set; }

    [JsonProperty("payment_methods")]
    [JsonPropertyName("payment_methods")]
    public List<StripeCustomerPaymentMethodDto>? PaymentMethodsSnake
    {
        get => PaymentMethods;
        set { if (value != null && PaymentMethods == null) PaymentMethods = value; }
    }

    [JsonProperty("accountId")]
    [JsonPropertyName("accountId")]
    public string? AccountId { get; set; }

    [JsonProperty("accountName")]
    [JsonPropertyName("accountName")]
    public string? AccountName { get; set; }

    [JsonProperty("accountNumber")]
    [JsonPropertyName("accountNumber")]
    public string? AccountNumber { get; set; }

    [JsonProperty("salesOrganization")]
    [JsonPropertyName("salesOrganization")]
    public string? SalesOrganization { get; set; }

    [JsonProperty("email")]
    [JsonPropertyName("email")]
    public string? Email { get; set; }

    [JsonProperty("phone")]
    [JsonPropertyName("phone")]
    public string? Phone { get; set; }

    [JsonProperty("billingStreet")]
    [JsonPropertyName("billingStreet")]
    public string? BillingStreet { get; set; }

    [JsonProperty("billingCity")]
    [JsonPropertyName("billingCity")]
    public string? BillingCity { get; set; }

    [JsonProperty("billingState")]
    [JsonPropertyName("billingState")]
    public string? BillingState { get; set; }

    [JsonProperty("billingPostalCode")]
    [JsonPropertyName("billingPostalCode")]
    public string? BillingPostalCode { get; set; }

    [JsonProperty("billingCountry")]
    [JsonPropertyName("billingCountry")]
    public string? BillingCountry { get; set; }
}

public class StripeCustomerPaymentMethodDto
{
    [JsonProperty("id")]
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonProperty("type")]
    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonProperty("card")]
    [JsonPropertyName("card")]
    public StripeCardDetails? Card { get; set; }

    [JsonProperty("us_bank_account")]
    [JsonPropertyName("us_bank_account")]
    public StripeUsBankAccountDetails? UsBankAccount { get; set; }

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

    [JsonProperty("created")]
    [JsonPropertyName("created")]
    public long? Created { get; set; }

    [JsonProperty("customer")]
    [JsonPropertyName("customer")]
    public string? Customer { get; set; }
}

public class StripeUsBankAccountDetails
{
    [JsonProperty("bank_name")]
    [JsonPropertyName("bank_name")]
    public string? BankName { get; set; }

    [JsonProperty("last4")]
    [JsonPropertyName("last4")]
    public string? Last4 { get; set; }

    [JsonProperty("account_type")]
    [JsonPropertyName("account_type")]
    public string? AccountType { get; set; }

    [JsonProperty("routing_number")]
    [JsonPropertyName("routing_number")]
    public string? RoutingNumber { get; set; }

    [JsonProperty("account_holder_type")]
    [JsonPropertyName("account_holder_type")]
    public string? AccountHolderType { get; set; }
}

