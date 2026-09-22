import PaymentTypeCode from './PaymentTypeCode';

export default interface PaymentMethodDetail {
  paymentMethod: string;
  paymentTypeCode: PaymentTypeCode;
  description: string;
  isActive: boolean;
}
