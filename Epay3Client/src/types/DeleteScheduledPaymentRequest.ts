export interface DeleteScheduledPaymentRequest {
  scheduleId: string;
  customerNumber: string;
  companyCode: string;
  payer: string;
  userId?: string;
}
