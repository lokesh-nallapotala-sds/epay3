using AutoMapper;
using Epay3Service.Extensions;
using Epay3Service.Helpers;

namespace Epay3Service;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        this.CreateSapCustomConfigMappings();

        this.CreateEmailConfigMappings();

        this.CreatePaymentTypeMappings();
    }

    private void CreateSapCustomConfigMappings()
    {
        // note, AutoMapper will automatically handle snake-to-camel-case conversion;
        // but some of the field names on the SAP side are misspelled, or don't match
        // for some other reason.
        // so it seemed best to just be explicit about everything, at least for round 1
        this.CreateMap<DTOs.SapCustomData, Models.SapCustomData>()
            .ForMember(d => d.ApplicationId, opt => opt.MapFrom(s => s.application_id))
            .ForMember(d => d.Description, opt => opt.MapFrom(s => s.description))

            .ForMember(d => d.GeneralData, opt => opt.MapFrom(s => s.generel_data))

            .ForMember(d => d.CompanyCodes, opt => opt.MapFrom(s => s.company_codes.EmptyIfNull()))
            .ForMember(d => d.SalesOrganizations, opt => opt.MapFrom(s => s.sales_area_data.EmptyIfNull()))

            .ForMember(d => d.DocumentTypes, opt => opt.MapFrom(s => s.document_types.EmptyIfNull()))
            .ForMember(d => d.DocumentStatuses, opt => opt.MapFrom(s => s.document_status.EmptyIfNull()))

            .ForMember(d => d.PaymentTypes, opt => opt.MapFrom(s => s.payment_types.EmptyIfNull()))
            .ForMember(d => d.PaymentReasonCodes, opt => opt.MapFrom(s => s.payment_reason_codes.EmptyIfNull()))
            .ForMember(d => d.PaymentProviders, opt => opt.MapFrom(s => s.payment_provider.EmptyIfNull()))
            .ForMember(d => d.PaymentCards, opt => opt.MapFrom(s => s.payment_cards.EmptyIfNull()))
            .ForMember(d => d.PaymentMethods, opt => opt.MapFrom(s => s.payment_methodes.EmptyIfNull()))

            .ForMember(d => d.ReleaseInfo, opt => opt.MapFrom(s => s.release_information))
            .ForMember(d => d.FunctionModules, opt => opt.MapFrom(s => s.function_modules.EmptyIfNull()))
            .ForMember(d => d.Parameters, opt => opt.MapFrom(s => s.parameters.EmptyIfNull()))
            .ForMember(d => d.LogEvents, opt => opt.MapFrom(s => s.logging_events.EmptyIfNull()))

            .ForMember(d => d.SapCustomer, opt => opt.MapFrom(s => s.sapcust))
            ;

        this.CreateMap<DTOs.GeneralInfo, Models.GeneralConfigInfo>()
            .ForMember(d => d.IsPartialPaymentAllowed, opt => opt.MapFrom(s => s.partial_payments_allowed != null && (s.partial_payments_allowed.TrimSafe() == "X" || s.partial_payments_allowed.TrimSafe() == "R")))
            .ForMember(d => d.CvvUseControl, opt => opt.MapFrom(s => s.cvv_use_control.TrimSafe()))
            ;

        this.CreateMap<DTOs.CompanyInfo, Models.CompanyInfo>()
            .ForMember(d => d.CompanyCode, opt => opt.MapFrom(s => s.company_code))
            .ForMember(d => d.CurrencyKey, opt => opt.MapFrom(s => s.currency_key))
            .ForMember(d => d.Description, opt => opt.MapFrom(s => s.description))
            .ForMember(d => d.IsActive, opt => opt.MapFrom(s => s.active.TrimSafe() == "X"))
            .ForMember(d => d.Is3dsDisabled, opt => opt.MapFrom(s => s.disable_3ds.TrimSafe() == "X"))
            .ForMember(d => d.IsPaymentDisabled, opt => opt.MapFrom(s => s.disable_payments.TrimSafe() == "X"))
            .ForMember(d => d.IsDepositEnabled, opt => opt.MapFrom(s => s.enable_deposits.TrimSafe() == "X"))
            .ForMember(d => d.IsEcheckEnabled, opt => opt.MapFrom(s => s.enable_echeck.TrimSafe() == "X"))
           ;
        this.CreateMap<DTOs.SalesOrganizationInfo, Models.SalesOrganizationInfo>()
            .ForMember(d => d.SalesOrganizationCode, opt => opt.MapFrom(s => s.sales_organization))
            .ForMember(d => d.DivisionCode, opt => opt.MapFrom(s => s.division))
            .ForMember(d => d.DistributionChannelCode, opt => opt.MapFrom(s => s.distribution_channel))
            .ForMember(d => d.IsActive, opt => opt.MapFrom(s => s.active.TrimSafe() == "X"))
            ;

        this.CreateMap<DTOs.DocumentTypeInfo, Models.DocumentTypeInfo>()
            .ForMember(d => d.DocumentTypeId, opt => opt.MapFrom(s => s.document_type))
            .ForMember(d => d.Description, opt => opt.MapFrom(s => s.description))
            .ForMember(d => d.StatusId, opt => opt.MapFrom(s => s.status_id))
            .ForMember(d => d.TransactionTypeCode, opt => opt.MapFrom(s => s.trtyp))
            .ForMember(d => d.MaxReturnCount, opt => opt.MapFrom(s => s.maximum_documents_returned))
            .ForMember(d => d.IsPdfAvailable, opt => opt.MapFrom(s => s.pdf_document_available.TrimSafe() == "X"))
            ;
        this.CreateMap<DTOs.DocumentStatusInfo, Models.DocumentStatusInfo>()
            .ForMember(d => d.StatusId, opt => opt.MapFrom(s => s.status_id))
            .ForMember(d => d.Status, opt => opt.MapFrom(s => s.status))
            .ForMember(d => d.Description, opt => opt.MapFrom(s => s.description))
            ;

        this.CreateMap<DTOs.PaymentTypeInfo, Models.PaymentTypeInfo>()
            .ForMember(d => d.PaymentTypeCode, opt => opt.MapFrom(s => s.payment_type))
            .ForMember(d => d.Description, opt => opt.MapFrom(s => s.description))
            .ForMember(d => d.IsActive, opt => opt.MapFrom(s => s.active.TrimSafe() == "X"))
            .ForMember(d => d.IsReasonNotRequired, opt => opt.MapFrom(s => s.reason_not_required.TrimSafe() == "X"))
            .ForMember(d => d.IsOverpaymentAllowed, opt => opt.MapFrom(s => s.overpayment_allowed.TrimSafe() == "X"))
            ;
        this.CreateMap<DTOs.PaymentReasonCodeInfo, Models.PaymentReasonCodeInfo>()
            .ForMember(d => d.ReasonCode, opt => opt.MapFrom(s => s.reason_code))
            .ForMember(d => d.CompanyCode, opt => opt.MapFrom(s => s.company_code))
            .ForMember(d => d.PaymentTypeCode, opt => opt.MapFrom(s => s.payment_type))
            .ForMember(d => d.Description, opt => opt.MapFrom(s => s.description))
            .ForMember(d => d.IsNoteRequired, opt => opt.MapFrom(s => s.comments_required.TrimSafe() == "X"))
            ;
        this.CreateMap<DTOs.PaymentProviderInfo, Models.PaymentProviderInfo>()
            .ForMember(d => d.Provider, opt => opt.MapFrom(s => s.payment_provider))
            .ForMember(d => d.Description, opt => opt.MapFrom(s => s.description))
            .ForMember(d => d.ProviderKey, opt => opt.MapFrom(s => s.payment_provider_key))
            .ForMember(d => d.ProviderVersion, opt => opt.MapFrom(s => s.payment_provider_version))
            .ForMember(d => d.MerchantGuid, opt => opt.MapFrom(s => s.payment_provider_merchant_guide))
            .ForMember(d => d.IsSecure3dsEnabled, opt => opt.MapFrom(s => s.secure_3ds_enabled.TrimSafe() == "X"))
            .ForMember(d => d.Secure3dsVersion, opt => opt.MapFrom(s => s.secure_3ds_version))
            .ForMember(d => d.InitializationUrl, opt => opt.MapFrom(s => s.initialization_url))
            ;
        this.CreateMap<DTOs.PaymentCardInfo, Models.PaymentCardInfo>()
            .ForMember(d => d.PaymentCardType, opt => opt.MapFrom(s => s.payment_card_type))
            .ForMember(d => d.SapCardType, opt => opt.MapFrom(s => CardTypeMappingHelper.ToSapCardType(s.payment_card_type)))
            .ForMember(d => d.GatewayCardType, opt => opt.MapFrom(s => CardTypeMappingHelper.ToGatewayCardType(s.payment_card_type)))
            .ForMember(d => d.Provider, opt => opt.MapFrom(s => s.payment_provider))
            .ForMember(d => d.ExternalPaymentCardType, opt => opt.MapFrom(s => s.external_payment_card_type))
            .ForMember(d => d.UsesPreauthorization, opt => opt.MapFrom(s => s.preauthorization_active.TrimSafe() == "X"))
            .ForMember(d => d.PreauthorizationAmount, opt => opt.MapFrom(s => s.preauthorization_amount.GetValueOrDefault()))
            ;
        this.CreateMap<DTOs.PaymentMethodInfo, Models.PaymentMethodInfo>()
            .ForMember(d => d.PaymentTypeCode, opt => opt.MapFrom(s => s.payment_type))
            .ForMember(d => d.PaymentMethod, opt => opt.MapFrom(s => s.payment_method))
            .ForMember(d => d.Description, opt => opt.MapFrom(s => s.description))
            .ForMember(d => d.IsActive, opt => opt.MapFrom(s => s.active.TrimSafe() == "X"))
            ;

        this.CreateMap<DTOs.ReleaseInfo, Models.ReleaseInfo>()
            .ForMember(d => d.ReleaseVersion, opt => opt.MapFrom(s => s.releae_version))
            .ForMember(d => d.ServicePackVersion, opt => opt.MapFrom(s => s.service_pack))
            .ForMember(d => d.PublishDate, opt => opt.MapFrom(s => s.publishing_date))
            ;
        this.CreateMap<DTOs.FunctionModuleInfo, Models.FunctionModuleInfo>()
            .ForMember(d => d.ModuleName, opt => opt.MapFrom(s => s.function_module_name))
            ;
        this.CreateMap<DTOs.ParameterInfo, Models.ParameterInfo>()
            .ForMember(d => d.Name, opt => opt.MapFrom(s => s.parameter_name))
            .ForMember(d => d.Value, opt => opt.MapFrom(s => s.parameter_value))
            ;
        this.CreateMap<DTOs.LogEventInfo, Models.LogEventInfo>()
            .ForMember(d => d.EventId, opt => opt.MapFrom(s => s.id))
            .ForMember(d => d.Description, opt => opt.MapFrom(s => s.description))
            ;

        this.CreateMap<DTOs.SAPCustomer, Models.SAPCustomer>()
            .ForMember(d => d.CurrencyDecimals, opt => opt.MapFrom(s => s.currency_decimals.EmptyIfNull()))
            ;
        this.CreateMap<DTOs.CurrencyDecimalInfo, Models.CurrencyDecimalInfo>()
            .ForMember(d => d.CurrencyKey, opt => opt.MapFrom(s => s.currkey))
            .ForMember(d => d.DecimalPlaces, opt => opt.MapFrom(s => s.currdec.GetValueOrDefault()))
            ;
    }

    private void CreateEmailConfigMappings() => this.CreateMap<DTOs.EmailConfigRequestInfo, Models.EmailConfigRequest>();

    private void CreatePaymentTypeMappings() => this.CreateMap<DTOs.PayerDetailsRequestInfo, Models.PayerDetailsRequest>()
            .ForMember(d => d.CompanyCode, opt => opt.MapFrom(s => s.company_code))
            .ForMember(d => d.CustomerNumber, opt => opt.MapFrom(s => s.customer_number))
            .ForMember(d => d.SalesArea, opt => opt.MapFrom(s => s.sales_area_data))
        ;//CreateMap<DTOs.PaymentOptionInfo, Models.???>();
}
