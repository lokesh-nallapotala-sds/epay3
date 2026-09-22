import { Address } from './Address';

export interface InvoiceTable {
  billingDocumentType: string;
  referenceNumber: string;
  billingDocumentNumber: string;
  documentDate: number;
  totalAmount: number;
  paidAmount: string;
  openAmount: string;
  dueDate: string;
  daysInArrears: string;
  pdfDocumentAvailable: string;
  soldToNumber: string;
}
export interface InvoiceHeaderData {
  billingDocumentNumber: string;
  companyCode: string;
  billingDocumentType: string;
  soldtoNumber?: string;
  salesOrganization?: string;
  distributionChannel?: string;
  division?: string;
  currencyKey?: string;
  documentDate: string;
  totalAmount: number;
  documentStatus?: string;
  dueDate: string;
  openAmount?: number;
  paidAmount?: number;
  CustomFields: Record<string, unknown>;
}

export interface InvoiceItemData {
  itemNumber: number;
  materialNumber: string;
  description: string;
  billedQuantity: number;
  salesUnit?: string;
  baseUnit: string;
  PricingUnit?: string;
  currencyKey?: string;
  totalAmount: number;
}

export interface InvoicePartnerData {
  partnerFunction?: string;
  partnerNumber: string;
  soldtoNumber?: string;
  addressData?: Address;
}

export interface InvoiceDetail {
  headerData?: InvoiceHeaderData;
  itemData: InvoiceItemData[];
  partnerData: InvoicePartnerData[];
}

export interface ValidateInvoiceAccount {
  accountNumber: string;
  invoiceNumber: string;
  invoiceAmount: number;
  invoiceDetail?: InvoiceDetail;
}

export interface ValidateInvoiceAccountResponse {
  success?: boolean;
  invoice?: {
    detail?: InvoiceDetail;
    status?: {
      message_type?: string;
      message_identification?: string;
      message_number?: number;
      message_line_string?: string;
    };
  };
  account?: ValidateInvoiceAccount;
  message?: string;
}
