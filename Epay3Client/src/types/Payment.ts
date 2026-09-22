import { Address } from './Address';
import PaymentProviderDetail from './SapConfig/PaymentProviderDetail';
import { DepositDetails } from './DepositDetails';
import { Invoice, SalesArea } from './InvoicesSearchRequest';
import { ThreeDSCardinalData } from './AccountResponse';

export interface PaymentState {
  disablePay: boolean;
  showManagePayments: boolean;
  cvvValidationMessage: string;
  cvvValue: string;
  paymentMethod: string;
}

export interface PaymentParameters {
  payTotal: number;
  currencyKey?: string;
  isDeposit?: boolean;
  payer: string;
  data: Invoice[];
  depositDetails?: DepositDetails | null;
  validateInvoiceData?: () => boolean;
  setPaymentMethodType?: (type: string) => void;
}

export interface PaymentSchedulerParameters {
  data: Invoice[];
  config?: PaymentConfig;
  payer: string;
  payTotal?: number;
  currencyKey?: string;
  validateInvoiceData?: () => boolean;
  selectedAccount?: string;
  userId?: string;
}

export interface PaymentConfig {
  isPaymentDisabled: boolean;
  maximumAllowedCCAmount: number;
  maximumAllowedECAmount: number;
}

export interface PaymentMethod {
  name: string;
  dropDownDisplayName: string;
  key: string; // was `string | ''` - was `string | null` intended?
  cardType: string;
  sapCardType?: string;
  gatewayCardType?: string;
  default: boolean;
  token?: string;
  validFrom?: string; // Optional field for validity start date
  validTo?: string; // Optional field for validity end date
  isSession?: boolean;
  cardLast4Digit?: string;
}

export interface AutoPayStatus {
  companyCode: string;
  enrolled: boolean;
  paymentMethod: string;
  paymentCardToken: string;
  cardLast4Digit?: string;
}

export interface PayerDetails {
  customerNumber: string;
  companyCode: string;
  isAutoPayEnrolled?: boolean;
  paymentCards: Array<PaymentCard>;
  payerAutoPayStatus?: Array<AutoPayStatus>;
}

export interface PayerDetailsResponse {
  payerDetails: PayerDetails;
  status: {
    messageType: string;
    messageIdentification: string;
    messageNumber: string;
    messageLineString: string;
  };
}

export interface PayerDetailsRequest {
  customerNumber: string;
  companyCode: string;
  action: string;
  salesArea: SalesArea;
}
export interface PaymentCard {
  paymentCardType: string;
  sapCardType?: string;
  gatewayCardType?: string;
  paymentCardToken: string;
  paymentCardName: string;
  validFrom?: string;
  validTo?: string;
  electronicCheckAccountType?: string;
  electronicCheckRdfiNumber?: string;
  isSession?: boolean;
  default?: string;
  isDefault?: boolean;
  isCardAutoPayEnabled?: boolean;
  cardLast4Digit?: string;
  cardinalData?: ThreeDSCardinalData;
  threeDSAccessToken?: string;
  vRef?: string;
}

export interface PaymentCardSubmission extends PaymentCard {
  cardValidationCode?: string;
}

export interface GuestPaymentCardSubmission extends PaymentCardSubmission {
  vRef?: string;
}

export interface PaymentDetail {
  paymentMethod: string;
  paymentCardType: string;
  paymentCardToken: string;
  paymentCardName: string;
  validFrom: string;
  validTo: string;
  electronicCheckAccountType: string;
  electronicCheckRdfiNumber: string;
  companyAddress?: Address;
  cardValidationCode: string;
  cardinalData?: ThreeDSCardinalData;
  cardinal?: ThreeDSCardinalData;
  vRef?: string;
}

export const PaymentMethodAction = {
  Add: '01',
  Update: '02',
  Delete: '03',
  PreAuthenticate: '04',
} as const;
export type PaymentMethodActionType =
  (typeof PaymentMethodAction)[keyof typeof PaymentMethodAction];
//TODO: resource ID lookup fn?

export type { PaymentProviderDetail };

export interface AddressData {
  name: string;
  name2: string;
  city: string;
  district: string;
  street: string;
  postalCodeCity: string;
  region: string;
  country: string;
}
