import PaymentType from './PaymentType';
import SapCustomer from './SapCustomer';
import ReleaseDetail from './ReleaseDetail';
import SalesOrgDetail from './SalesOrgDetail';
import LogEventDetail from './LogEventDetail';
import ParameterDetail from './ParameterDetail';
import GeneralConfigData from './GeneralConfigData';
import CompanyCodeDetail from './CompanyCodeDetail';
import PaymentReasonCode from './PaymentReasonCode';
import PaymentCardDetail from './PaymentCardDetail';
import DocumentTypeDetail from './DocumentTypeDetail';
import PaymentMethodDetail from './PaymentMethodDetail';
import DocumentStatusDetail from './DocumentStatusDetail';
import PaymentProviderDetail from './PaymentProviderDetail';

export interface SapConfig {
  applicationId: string;
  description: string;
  generalData: GeneralConfigData;
  companyCodes: CompanyCodeDetail[];
  salesOrganizations: SalesOrgDetail[];
  documentTypes: DocumentTypeDetail[];
  documentStatuses: DocumentStatusDetail[];
  paymentTypes: PaymentType[];
  //paymentProvider: any[];
  paymentReasonCodes: PaymentReasonCode[];
  paymentProviders: PaymentProviderDetail[];
  paymentCards: PaymentCardDetail[];
  paymentMethods: PaymentMethodDetail[];
  releaseInfo?: ReleaseDetail;
  functionModules: Array<{ moduleName: string }>;
  parameters: ParameterDetail[];
  logEvents: LogEventDetail[];
  sapCustomer: SapCustomer;
  status: string;
}
