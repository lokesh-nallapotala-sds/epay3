import { ValidateInvoiceAccount } from './Invoice';

export interface InvoiceDetailRequest {
  documentNumber: string;
  documentType: string;
  customerNumber: string;
  validatedAccounts?: ValidateInvoiceAccount[];
}
