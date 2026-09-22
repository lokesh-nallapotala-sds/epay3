namespace Epay3Service.Models;

//TODO: verify null(abil)ity on all the fields (at all levels)
public class SapCustomData
{
    // general info
    public string ApplicationId { get; set; }
    public string? Description { get; set; }

    public GeneralConfigInfo GeneralData { get; set; } = new GeneralConfigInfo();

    // related company / account info
    public List<CompanyInfo> CompanyCodes => this._companyCodes;
    private readonly List<CompanyInfo> _companyCodes = [];

    public List<SalesOrganizationInfo> SalesOrganizations => this._salesOrganizations;
    private readonly List<SalesOrganizationInfo> _salesOrganizations = [];

    // document info
    public List<DocumentTypeInfo> DocumentTypes => this._documentTypes;
    private readonly List<DocumentTypeInfo> _documentTypes = [];

    public List<DocumentStatusInfo> DocumentStatuses => this._documentStatuses;
    private readonly List<DocumentStatusInfo> _documentStatuses = [];

    // payment info
    public List<PaymentTypeInfo>? PaymentTypes => this._paymentTypes;
    private readonly List<PaymentTypeInfo> _paymentTypes = [];

    public List<PaymentReasonCodeInfo> PaymentReasonCodes => this._paymentReasonCodes;
    private readonly List<PaymentReasonCodeInfo> _paymentReasonCodes = [];

    public List<PaymentProviderInfo> PaymentProviders => this._paymentProviders;
    private readonly List<PaymentProviderInfo> _paymentProviders = [];

    public List<PaymentCardInfo> PaymentCards => this._paymentCards;
    private readonly List<PaymentCardInfo> _paymentCards = [];

    public List<PaymentMethodInfo> PaymentMethods => this._paymentMethods;
    private readonly List<PaymentMethodInfo> _paymentMethods = [];

    // misc / system
    public ReleaseInfo? ReleaseInfo { get; set; }

    public List<FunctionModuleInfo> FunctionModules => this._functionModules;
    private readonly List<FunctionModuleInfo> _functionModules = [];

    public List<ParameterInfo> Parameters => this._parameters;
    private readonly List<ParameterInfo> _parameters = [];

    public List<LogEventInfo> LogEvents => this._logEvents;
    private readonly List<LogEventInfo> _logEvents = [];

    //not sure why other structures aren't included in this one, or vice versa
    public SAPCustomer? SapCustomer { get; set; }
}

// general info
public class GeneralConfigInfo
{
    public bool IsPartialPaymentAllowed { get; set; } = false;
    public string CvvUseControl { get; set; } = string.Empty;

    public bool IsCvvUseControlEnabled => IsEnabled(this.CvvUseControl);

    private static bool IsEnabled(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        if (bool.TryParse(value, out bool enabled))
        {
            return enabled;
        }

        return string.Equals(value, "1", StringComparison.OrdinalIgnoreCase);
    }
}

#region related company / account info
public class CompanyInfo
{
    public string CompanyCode { get; set; }
    public string CurrencyKey { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public bool Is3dsDisabled { get; set; }
    public bool IsPaymentDisabled { get; set; }
    public bool IsDepositEnabled { get; set; }
    public bool IsEcheckEnabled { get; set; }
}

public class SalesOrganizationInfo
{
    public string SalesOrganizationCode { get; set; }
    public string DivisionCode { get; set; }
    public string DistributionChannelCode { get; set; }
    public bool IsActive { get; set; }
}
#endregion related company / account info

#region document info
public class DocumentTypeInfo
{
    public string DocumentTypeId { get; set; }
    public string? Description { get; set; }
    public string StatusId { get; set; }
    public string? TransactionTypeCode { get; set; }
    public int MaxReturnCount { get; set; } = 0;
    public bool IsPdfAvailable { get; set; }
}

public class DocumentStatusInfo
{
    public string StatusId { get; set; }
    public string Status { get; set; }
    public string? Description { get; set; }
}
#endregion document info

#region payment info
public class PaymentTypeInfo
{
    public string PaymentTypeCode { get; set; }  // 'D'[irect AR] or 'O'[pen AR]
    public string Description { get; set; }
    public bool IsActive { get; set; }
    public bool IsReasonNotRequired { get; set; }
    public bool IsOverpaymentAllowed { get; set; }
}

public class PaymentReasonCodeInfo
{
    public string ReasonCode { get; set; }
    public string? CompanyCode { get; set; }
    public string? PaymentTypeCode { get; set; }
    public string? Description { get; set; }
    public bool IsNoteRequired { get; set; }
}

public class PaymentProviderInfo
{
    public string? Provider { get; set; }
    public string? Description { get; set; }
    public string? ProviderKey { get; set; }
    public string? ProviderVersion { get; set; }
    public string? MerchantGuid { get; set; }
    public bool IsSecure3dsEnabled { get; set; }
    public string? Secure3dsVersion { get; set; }
    public string? InitializationUrl { get; set; }
}

public class PaymentCardInfo
{
    public string PaymentCardType { get; set; }  // "AMEX" | "VISA" | "MC" | "EC"
    public string SapCardType { get; set; }
    public string GatewayCardType { get; set; }
    public string Provider { get; set; }
    public string ExternalPaymentCardType { get; set; }
    public bool UsesPreauthorization { get; set; }
    public decimal PreauthorizationAmount { get; set; } = 0;
}

public class PaymentMethodInfo
{
    public string PaymentMethod { get; set; }
    public string PaymentTypeCode { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; }
}
#endregion payment info

#region misc / system info
public class ReleaseInfo
{
    public string ReleaseVersion { get; set; }
    public string ServicePackVersion { get; set; }
    public string PublishDate { get; set; }  //TODO: make this a DateTime
}

public class FunctionModuleInfo
{
    public string ModuleName { get; set; }
}

public class ParameterInfo
{
    public string Name { get; set; }
    public string? Value { get; set; }
}

public class LogEventInfo
{
    public string EventId { get; set; }
    public string Description { get; set; }
}
#endregion misc / system info

#region "SAP customer"
public class SAPCustomer
{
    public List<CurrencyDecimalInfo> CurrencyDecimals => this._currencyDecimals;
    private readonly List<CurrencyDecimalInfo> _currencyDecimals = [];
}

public class CurrencyDecimalInfo
{
    public string? CurrencyKey { get; set; }

    public int DecimalPlaces { get; set; } = 0;
}
#endregion "SAP customer"
