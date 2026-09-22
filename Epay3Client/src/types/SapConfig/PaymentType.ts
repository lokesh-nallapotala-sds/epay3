import PaymentTypeCode from './PaymentTypeCode';

export default interface PaymentType {
  paymentTypeCode: PaymentTypeCode;
  description: string;
  isActive: boolean;
  isReasonNotRequired?: boolean;
  isOverpaymentAllowed?: boolean;
}
