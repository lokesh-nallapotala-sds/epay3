export interface InvoiceBulkPdfRequest {
  documentNumber: string;
  customerNumber: string;
  primaryAccount: string;
  billingDocs: string;
}
