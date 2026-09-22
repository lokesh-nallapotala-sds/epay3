using Newtonsoft.Json;

namespace Epay3Service.Models;

public class Invoice
{
    [JsonProperty("billing_document_number")]
    public string? BillingDocumentNumber { get; set; }

    [JsonProperty("billing_document_type")]
    public string? BillingDocumentType { get; set; }

    [JsonProperty("sales_organization")]
    public string? SalesOrganization { get; set; }

    [JsonProperty("distribution_channel")]
    public string? DistributionChannel { get; set; }

    [JsonProperty("division")]
    public string? Division { get; set; }

    [JsonProperty("document_number_finance")]
    public string? DocumentNumberFinance { get; set; }

    [JsonProperty("line_item_in_the_relevant_invoice")]
    public long? LineItemInTheRelevantInvoice { get; set; }

    [JsonProperty("finance_document_type")]
    public string? FinanceDocumentType { get; set; }

    [JsonProperty("reference_number")]
    public string? ReferenceNumber { get; set; }

    [JsonProperty("fiscal_year_of_the_relevant_invoice")]
    public long? FiscalYearOfTheRelevantInvoice { get; set; }

    [JsonProperty("soldto_number")]
    public string? SoldtoNumber { get; set; }

    [JsonProperty("payer_number")]
    public string? PayerNumber { get; set; }

    [JsonProperty("posting_date")]
    public DateTime? PostingDate { get; set; }

    [JsonProperty("document_date")]
    public DateTime? DocumentDate { get; set; }

    [JsonProperty("due_date")]
    public DateTime? DueDateInternal { get; set; }

    [JsonProperty("days_in_arrears")]
    public string? DaysInArrears { get; set; }

    [JsonProperty("currency_key")]
    public string? CurrencyKey { get; set; }

    [JsonProperty("total_amount")]
    public decimal? TotalAmount { get; set; }

    [JsonProperty("open_amount")]
    public decimal? OpenAmount { get; set; }

    [JsonProperty("paid_amount")]
    public decimal? PaidAmount { get; set; }

    [JsonProperty("discount_amount")]
    public decimal? DiscountAmount { get; set; }

    [JsonProperty("pdf_document_available")]
    public string? PdfDocumentAvailable { get; set; }

    [JsonProperty("read_only_flag")]
    public string? ReadOnlyFlag { get; set; }

    [JsonProperty("item_is_a_payment")]
    public string? ItemIsAPayment { get; set; }

    [JsonProperty("scheduled_id")]
    public string? ScheduledId { get; set; }

    [JsonProperty("scheduled_date")]
    public DateTime? ScheduledDate { get; set; }

    [JsonProperty("scheduled_id_details")]
    public ScheduledIdDetails? scheduledIdDetails { get; set; }
    public bool HasKey => !string.IsNullOrEmpty(this.BillingDocumentNumber) && this.BillingDocumentType != "01" && this.PdfDocumentAvailable == "X" && this.SoldtoNumber != null;

    public string InvoiceStatus => (this.OpenAmount ?? 0) < 0 ? "Credit" :
                               (this.OpenAmount ?? 0) == 0 ? "Paid" : "Open";

    public int? DaysTillDue => this.OpenAmount < 0 || this.DueDateInternal == null ? null : (int)(DateTime.Now - this.DueDateInternal.Value).TotalDays;

    public DateTime? DueDate => this.OpenAmount <= 0 ? null : this.DueDateInternal;
    protected bool Equals(Invoice other) => string.Equals(this.BillingDocumentNumber, other.BillingDocumentNumber) && string.Equals(this.BillingDocumentType, other.BillingDocumentType) && string.Equals(this.SalesOrganization, other.SalesOrganization) && string.Equals(this.DistributionChannel, other.DistributionChannel) && string.Equals(this.Division, other.Division) && string.Equals(this.DocumentNumberFinance, other.DocumentNumberFinance) && this.LineItemInTheRelevantInvoice == other.LineItemInTheRelevantInvoice && string.Equals(this.FinanceDocumentType, other.FinanceDocumentType) && string.Equals(this.ReferenceNumber, other.ReferenceNumber) && this.FiscalYearOfTheRelevantInvoice == other.FiscalYearOfTheRelevantInvoice && string.Equals(this.SoldtoNumber, other.SoldtoNumber) && string.Equals(this.PayerNumber, other.PayerNumber) && string.Equals(this.PostingDate, other.PostingDate) && string.Equals(this.DocumentDate, other.DocumentDate) && string.Equals(this.DueDate, other.DueDate) && string.Equals(this.DaysInArrears, other.DaysInArrears) && string.Equals(this.CurrencyKey, other.CurrencyKey) && this.TotalAmount == other.TotalAmount && this.OpenAmount == other.OpenAmount && this.PaidAmount == other.PaidAmount && this.DiscountAmount == other.DiscountAmount && string.Equals(this.PdfDocumentAvailable, other.PdfDocumentAvailable);

    public override bool Equals(object? obj)
    {
        if (ReferenceEquals(null, obj)) {
            return false;
        }

        if (ReferenceEquals(this, obj)) {
            return true;
        }

        if (obj.GetType() != this.GetType()) {
            return false;
        }

        return this.Equals((Invoice)obj);
    }

    public override int GetHashCode()
    {
        unchecked
        {
            var hashCode = (this.BillingDocumentNumber != null ? this.BillingDocumentNumber.GetHashCode() : 0);
            hashCode = (hashCode * 397) ^ (this.BillingDocumentType != null ? this.BillingDocumentType.GetHashCode() : 0);
            hashCode = (hashCode * 397) ^ (this.SalesOrganization != null ? this.SalesOrganization.GetHashCode() : 0);
            hashCode = (hashCode * 397) ^ (this.DistributionChannel != null ? this.DistributionChannel.GetHashCode() : 0);
            hashCode = (hashCode * 397) ^ (this.Division != null ? this.Division.GetHashCode() : 0);
            hashCode = (hashCode * 397) ^ (this.DocumentNumberFinance != null ? this.DocumentNumberFinance.GetHashCode() : 0);
            hashCode = (hashCode * 397) ^ (this.LineItemInTheRelevantInvoice.HasValue ? this.LineItemInTheRelevantInvoice.Value.GetHashCode() : 0);
            hashCode = (hashCode * 397) ^ (this.FinanceDocumentType != null ? this.FinanceDocumentType.GetHashCode() : 0);
            hashCode = (hashCode * 397) ^ (this.ReferenceNumber != null ? this.ReferenceNumber.GetHashCode() : 0);
            hashCode = (hashCode * 397) ^ (this.FiscalYearOfTheRelevantInvoice.HasValue ? this.FiscalYearOfTheRelevantInvoice.Value.GetHashCode() : 0);
            hashCode = (hashCode * 397) ^ (this.SoldtoNumber != null ? this.SoldtoNumber.GetHashCode() : 0);
            hashCode = (hashCode * 397) ^ (this.PayerNumber != null ? this.PayerNumber.GetHashCode() : 0);
            hashCode = (hashCode * 397) ^ (this.PostingDate != null ? this.PostingDate.GetHashCode() : 0);
            hashCode = (hashCode * 397) ^ (this.DocumentDate != null ? this.DocumentDate.GetHashCode() : 0);
            hashCode = (hashCode * 397) ^ (this.DueDate != null ? this.DueDate.GetHashCode() : 0);
            hashCode = (hashCode * 397) ^ (this.DaysInArrears != null ? this.DaysInArrears.GetHashCode() : 0);
            hashCode = (hashCode * 397) ^ (this.CurrencyKey != null ? this.CurrencyKey.GetHashCode() : 0);
            hashCode = (hashCode * 397) ^ this.TotalAmount.GetHashCode();
            hashCode = (hashCode * 397) ^ this.OpenAmount.GetHashCode();
            hashCode = (hashCode * 397) ^ this.PaidAmount.GetHashCode();
            hashCode = (hashCode * 397) ^ this.DiscountAmount.GetHashCode();
            hashCode = (hashCode * 397) ^ (this.PdfDocumentAvailable != null ? this.PdfDocumentAvailable.GetHashCode() : 0);
            return hashCode;
        }
    }

    public class ScheduledIdDetails
    {
        [JsonProperty("scheduled_status")]
        public string? ScheduledStatus { get; set; }

        [JsonProperty("payment_detail")]
        public PaymentDetail? PaymentDetail { get; set; }

        [JsonProperty("scheduled_document")]
        public ScheduledDocument? ScheduledDocument { get; set; }
    }


    public class ScheduledDocument
    {
        [JsonProperty("document_number_finance")]
        public string? DocumentNumberFinance { get; set; }

        [JsonProperty("line_item_in_the_relevant_invoice")]
        public long? LineItemInTheRelevantInvoice { get; set; }

        [JsonProperty("fiscal_year_of_the_relevant_invoice")]
        public long? FiscalYearOfTheRelevantInvoice { get; set; }

        [JsonProperty("open_amount")]
        public decimal? OpenAmount { get; set; }

        [JsonProperty("amount_to_process")]
        public decimal? AmountToProcess { get; set; }

        [JsonProperty("currency_key")]
        public string? CurrencyKey { get; set; }

        [JsonProperty("reason_code")]
        public string? ReasonCode { get; set; }

        [JsonProperty("reference_number")]
        public string? ReferenceNumber { get; set; }
    }

}
