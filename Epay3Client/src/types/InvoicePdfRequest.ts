export interface InvoicePdfRequest {
  documentNumber: string;
  customerNumber: string;
  primaryAccount: string;
  companyCode?: string;
  userId?: string; //for impersonation
}
