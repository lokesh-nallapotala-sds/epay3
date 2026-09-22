export default interface DocumentTypeDetail {
  documentTypeId: string;
  description?: string;
  statusId: string;
  transactionTypeCode?: string;
  maxReturnCount: number;
  isPdfAvailable: boolean;
}
