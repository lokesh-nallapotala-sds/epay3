import PaymentTypeCode from './PaymentTypeCode';

export default interface PaymentReasonCode {
  reasonCode: string;
  companyCode: string;
  paymentTypeCode: PaymentTypeCode;
  description: string;
  isNoteRequired: boolean;
}
