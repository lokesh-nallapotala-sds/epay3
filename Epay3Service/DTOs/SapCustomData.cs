using System.Text.Json.Serialization;

namespace Epay3Service.DTOs;

internal class SapCustomData
{
    // general info
    public string application_id { get; set; }

    public string? description { get; set; }

    public GeneralInfo? generel_data { get; set; }  //2.x TS code has `general_date`

    // related company / account info
    public List<CompanyInfo>? company_codes { get; set; }

    public List<SalesOrganizationInfo>? sales_area_data { get; set; }

    // document info
    public List<DocumentTypeInfo>? document_types { get; set; }

    public List<DocumentStatusInfo> document_status { get; set; }

    // payment info
    public List<PaymentTypeInfo>? payment_types { get; set; }

    public List<PaymentReasonCodeInfo>? payment_reason_codes { get; set; }
    public List<PaymentProviderInfo>? payment_provider { get; set; }
    public List<PaymentCardInfo>? payment_cards { get; set; }
    public List<PaymentMethodInfo>? payment_methodes { get; set; }

    // misc / system info
    public ReleaseInfo? release_information { get; set; }

    public List<FunctionModuleInfo>? function_modules { get; set; }
    public List<ParameterInfo>? parameters { get; set; }
    public List<LogEventInfo>? logging_events { get; set; }

    public SAPCustomer? sapcust { get; set; }

    [JsonPropertyName("parameters")]
    public List<Parameter>? Parameters { get; set; }
}

// general info
internal class GeneralInfo
{
    public string? partial_payments_allowed { get; set; }
    public string? cvv_use_control { get; set; }
}

#region related company / account info
internal class CompanyInfo
{
    public string company_code { get; set; }
    public string currency_key { get; set; }
    public string? description { get; set; }
    public string? active { get; set; }
    public string? disable_3ds { get; set; }
    public string? disable_payments { get; set; }
    public string? enable_deposits { get; set; }
    public string? enable_echeck { get; set; }
}

internal class SalesOrganizationInfo
{
    public string? sales_organization { get; set; }
    public string division { get; set; }
    public string distribution_channel { get; set; }
    public string? active { get; set; }
}
#endregion related company / account info

#region document info
internal class DocumentTypeInfo
{
    public string? document_type { get; set; }
    public string? description { get; set; }
    public string? status_id { get; set; }
    public string? trtyp { get; set; }  // transaction type
    public int maximum_documents_returned { get; set; } = 0;
    public string? pdf_document_available { get; set; }
}

internal class DocumentStatusInfo
{
    public string status_id { get; set; }
    public string status { get; set; }
    public string? description { get; set; }
}
#endregion document info

#region payment info
internal class PaymentTypeInfo
{
    public string payment_type { get; set; }
    public string description { get; set; }
    public string? active { get; set; }
    public string? reason_not_required { get; set; }
    public string? overpayment_allowed { get; set; }
}

internal class PaymentReasonCodeInfo
{
    public string reason_code { get; set; }
    public string? company_code { get; set; }
    public string? payment_type { get; set; }
    public string? description { get; set; }
    public string? comments_required { get; set; }
}

internal class PaymentProviderInfo
{
    public string? payment_provider { get; set; }
    public string? description { get; set; }
    public string? payment_provider_key { get; set; }
    public string? payment_provider_version { get; set; }
    public string? payment_provider_merchant_guide { get; set; }
    public string? secure_3ds_enabled { get; set; }
    public string? secure_3ds_version { get; set; }
    public string? initialization_url { get; set; }
}

internal class PaymentCardInfo
{
    public string payment_card_type { get; set; }  // "AMEX" | "VISA" | "MC" | "EC"
    public string payment_provider { get; set; }
    public string? external_payment_card_type { get; set; }
    public string? preauthorization_active { get; set; }
    public decimal? preauthorization_amount { get; set; }
}

internal class PaymentMethodInfo
{
    public string payment_method { get; set; }
    public string payment_type { get; set; }
    public string? description { get; set; }
    public string? active { get; set; }
}
#endregion payment info

#region misc / system info
internal class ReleaseInfo
{
    public string releae_version { get; set; }
    public string service_pack { get; set; }
    public string publishing_date { get; set; }
}

internal class FunctionModuleInfo
{
    public string function_module_name { get; set; }
}

internal class ParameterInfo
{
    public string parameter_name { get; set; }
    public string? parameter_value { get; set; }
}

internal class LogEventInfo
{
    public string id { get; set; }
    public string description { get; set; }
}
#endregion misc / system info

#region "SAP customer"
internal class SAPCustomer
{
    public List<CurrencyDecimalInfo>? currency_decimals { get; set; }
}
internal class CurrencyDecimalInfo
{
    public string? currkey { get; set; }
    public int? currdec { get; set; }
}
#endregion "SAP customer"

#region parameters
internal class Parameter
{
    [JsonPropertyName("parameter_name")]
    public string ParameterName { get; set; }

    [JsonPropertyName("parameter_value")]
    public string ParameterValue { get; set; }
}
#endregion parameters
