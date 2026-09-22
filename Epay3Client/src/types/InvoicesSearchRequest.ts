import { EpayDocumentType } from './EpayDocumentType';
import { DateRangeOptionType } from './DateRangeOption';
import { InvoiceStatusType } from './InvoiceStatus';
import { ValidateInvoiceAccount } from './Invoice';

export interface InvoiceFilterState {
  subType?: string;
  selectedAccount?: string;
  subAccounts?: string[] | string | null;
  currencyType?: string;
  currencyKey?: string;
  show?: string;
  dueTill?: Date | null;
  selectedDatePeriod?: DateRangeOptionType;
  selectedDuePeriod?: DateRangeOptionType;
  from?: Date | null;
  to?: Date | null;
  dueDateFrom?: Date | null;
  dueDateTo?: Date | null;
}

export interface InvoicesSearchRequest {
  selectedAccount: string;
  companyCode?: string;
  salesOrganization?: string;
  subAccounts: string[];
  userId?: string; //for impersonation
  documentType?: EpayDocumentType;
  status?: InvoiceStatusType;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  dateFrom?: Date;
  dateTo?: Date;
  from?: Date;
  to?: Date;
  soldToSearchParams?: string[];
  filters?: SearchFilter[];
  currencyKey?: string;
  excludePayments?: boolean;
  excludeCredits?: boolean;
}

export interface InvoiceRequestBody {
  //TODO: do we need subAccounts or userId here?
  selectedAccount: string;
  searchParameters: InvoicesSearchRequest;
  soldToData?: SoldToData;
  payerData: PayerData;
  validatedAccounts?: ValidateInvoiceAccount[];
  documenttype?: EpayDocumentType;
  status?: InvoiceStatusType;
}

export interface Invoice {
  documentNumberFinance?: string;
  paymentAmount: number;
  reason?: string;
  description?: string;
  billingDocumentNumber?: string; // billingDocumentNumber
  billingDocumentType?: string; // billingDocumentType (e.g., "F2")
  currencyKey: string; // currencyKey (e.g., "USD")
  documentDate?: string; // documentDate (e.g., "2021-03-25T00:00:00")
  dueDate?: string | null; // dueDate (e.g., "2021-04-24T00:00:00")
  dueDateInternal?: string; // dueDateInternal (internal representation of due date)
  openAmount?: number; // openAmount (e.g., 5890)
  totalAmount?: number; // totalAmount (e.g., 5890)
  paidAmount?: number | null; // paidAmount (e.g., null if unpaid)
  discountAmount?: number | null; // discountAmount (e.g., null if no discount)
  invoiceStatus?: string; // invoiceStatus (e.g., "Open")
  hasKey?: boolean; // hasKey (e.g., true or false indicating PDF availability)
  financeDocumentType?: string; // financeDocumentType (e.g., "RV")
  fiscalYearOfTheRelevantInvoice?: number; // fiscalYearOfTheRelevantInvoice (e.g., 2021)
  salesOrganization?: string; // salesOrganization (e.g., "3000")
  distributionChannel?: string; // distributionChannel (e.g., "10")
  division?: string; // division (e.g., "00")
  referenceNumber?: string; // referenceNumber (e.g., "0090040497")
  soldtoNumber: string; // soldtoNumber (e.g., "0000005000")
  daysTillDue?: number | null; // daysTillDue (e.g., 1112)
  daysInArrears?: number | null; // daysInArrears (e.g., 1112)
  pdfDocumentAvailable?: string; // pdfDocumentAvailable (e.g., "X" indicating PDF availability)
  postingDate?: string; // postingDate (e.g., "2021-03-25T00:00:00")
  readOnlyFlag?: string | null; // readOnlyFlag (e.g., null or any other value)
  lineItemInTheRelevantInvoice?: number; // lineItemInTheRelevantInvoice (e.g., 1)
  itemIsAPayment?: string | null; // itemIsAPayment (e.g., null or other value)
  payerNumber?: string;
  isSelected?: boolean;
  overPayment?: number; //Incase the user pays over than due
  scheduledId?: string; //Incase the payment is scheduled
  scheduledDate?: string;
  scheduledIdDetails?: ScheduledIdDetails;
  uid?: string;
}

// nested types
export interface ScheduledIdDetails {
  scheduledStatus?: string;
  paymentDetail?: PaymentDetail;
  scheduledDocument?: ScheduledDocument;
}

export interface PaymentDetail {
  paymentMethod?: string;
  paymentCardType?: string;
  paymentCardToken?: string;
  paymentCardName?: string;
  cardLast4Digit?: string;
  validTo?: string;
  addressData?: AddressData;
}

export interface ScheduledDocument {
  documentNumberFinance?: string;
  lineItemInTheRelevantInvoice?: number;
  fiscalYearOfTheRelevantInvoice?: number;
  openAmount?: number;
  amountToProcess?: number;
  currencyKey?: string;
  reasonCode?: string;
  referenceNumber?: string;
}

export interface AddressData {
  name?: string;
  name2?: string;
  name3?: string;
  name4?: string;
  city?: string;
  district?: string;
  street?: string;
  postalCodeCity?: string;
  region?: string;
  country?: string;
}

export interface PaymentInvoice {
  paymentList: paymentList[];
  status: string; //TODO: InvoiceStatusType?
}

export interface paymentList {
  documentNumberFinance: string;
  billingDocumentNumber?: string;
  financeDocumentType: string;
  referenceNumber: string;
  fiscalYearOfTheRelevantInvoice: number;
  payerNumber: string;
  postingDate: string;
  documentDate: string;
  currencyKey: string;
  paidAmount: number;
  itemText: string;
  authorizationNumber: string;
  authorizationReferenceCode: string;
  authorizationAmount: number;
  paymentMethod: string;
  paymentCardType: string;
  paymentCardToken: string;
  paymentCardName: string;
  validTo: string;
  appliedCreditAmount?: number;
  sdInvoices?: SdInvoice[];
  soldtoNumber?: number;
  isSelected?: boolean;
  cardLast4Digit?: string;
}

export interface PaymentHistoryRow {
  documentNumberFinance: string;
  referenceNumber: string;
  billingDocumentNumber: string;
  documentDate: string;
  paidAmount: string;
  paymentCardType: string;
  paymentCardToken: string;
  soldtoNumber: string;
  currencyKey: string;
  paidAmountRaw: number;
  appliedCreditAmount: number;
  paymentData: paymentList;
  isSelected?: boolean;
  CardLast4Digit?: string;
}

export interface SdInvoice {
  billingDocumentNumber: string;
  billingDocumentType: string;
  salesOrganization: string;
  distributionChannel: string;
  division: string;
  referenceNumber: string;
  currencyKey: string;
  postingDate: string;
  documentDate: string;
  dueDate: string;
  daysInArrears: number;
  totalAmount: number;
  openAmount: number;
  paidAmount: number;
  pdfDocumentAvailable: string;
  soldtoNumber: string;
  currentPaidAmount: string;
}

export interface SearchFilter {
  filterType: string;
  value: string;
}

export interface InvoiceListRequest {
  payer_data: PayerData;
  soldto_data: SoldToData;
  search_parameters: InvoicesSearchRequest;
}

export interface SoldToData {
  customerNumber: string;
  salesArea: SalesArea;
}

export interface SoldToPayment {
  accountNumber: string;
}

export interface SalesArea {
  salesOrganization?: string;
  distributionChannel?: string;
  division?: string;
}

export interface PayerData {
  customerNumber?: string;
  companyCode?: string;
}
