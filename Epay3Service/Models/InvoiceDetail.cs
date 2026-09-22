using Newtonsoft.Json;

namespace Epay3Service.Models;

public partial class InvoiceDetail
{
    [JsonProperty("header_data")]
    public InvoiceHeaderData? HeaderData { get; set; }

    [JsonProperty("item_data")]
    public List<InvoiceItemData> ItemData { get; set; } = new List<InvoiceItemData>();

    [JsonProperty("partner_data")]
    public List<InvoicePartnerData> PartnerData { get; set; } = new List<InvoicePartnerData>();
}

public partial class InvoiceHeaderData
{
    [JsonProperty("billing_document_number")]
    public string? BillingDocumentNumber { get; set; }

    [JsonProperty("billing_document_type")]
    public string? BillingDocumentType { get; set; }

    [JsonProperty("soldto_number")]
    public string? SoldtoNumber { get; set; }

    [JsonProperty("sales_organization")]
    public string? SalesOrganization { get; set; }

    [JsonProperty("company_code")]
    public string? CompanyCode { get; set; }

    [JsonProperty("distribution_channel")]
    public string? DistributionChannel { get; set; }

    [JsonProperty("division")]
    public string? Division { get; set; }

    [JsonProperty("currency_key")]
    public string? CurrencyKey { get; set; }

    [JsonProperty("document_date")]
    public string? DocumentDate { get; set; }

    [JsonProperty("total_amount")]
    public decimal? TotalAmount { get; set; }

    [JsonProperty("document_status")]
    public string? DocumentStatus { get; set; }

    [JsonProperty("custom_fields")]
    public dynamic? CustomFields { get; set; }

    [JsonProperty("open_amount")]
    public decimal? OpenAmount { get; set; }

    [JsonProperty("paid_amount")]
    public decimal? PaidAmount { get; set; }

    [JsonProperty("due_date")]
    public string? DueDate { get; set; }
}

public partial class InvoiceItemData
{
    [JsonProperty("item_number")]
    public long? ItemNumber { get; set; }

    [JsonProperty("material_number")]
    public string? MaterialNumber { get; set; }

    [JsonProperty("description")]
    public string? Description { get; set; }

    [JsonProperty("billed_quantity")]
    public decimal? BilledQuantity { get; set; }

    [JsonProperty("sales_unit")]
    public string? SalesUnit { get; set; }

    [JsonProperty("base_unit")]
    public string? BaseUnit { get; set; }

    [JsonProperty("pricing_unit")]
    public string? PricingUnit { get; set; }

    [JsonProperty("currency_key")]
    public string? CurrencyKey { get; set; }

    [JsonProperty("total_amount")]
    public decimal? TotalAmount { get; set; }
}

public partial class InvoicePartnerData
{
    [JsonProperty("partner_function")]
    public string? PartnerFunction { get; set; }

    [JsonProperty("partner_number")]
    public string? PartnerNumber { get; set; }

    [JsonProperty("address_data")]
    public AddressData? AddressData { get; set; }
}
