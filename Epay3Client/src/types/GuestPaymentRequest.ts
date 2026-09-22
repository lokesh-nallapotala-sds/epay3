import { Invoice, PayerData, SoldToPayment } from './InvoicesSearchRequest';
import {
  AddressData,
  GuestPaymentCardSubmission,
  PayerDetails,
  PaymentDetail,
} from './Payment';
import { ThreeDSCardinalData } from './AccountResponse';

export interface GuestPaymentRequest {
  payer: PayerData;
  payment: PaymentDetail;
  soldTo: SoldToPayment;
  invoices: Invoice[];
  guestUserEmail?: string;
  threeDSAccessToken?: string;
  cardinalData?: ThreeDSCardinalData;
  vRef?: string;
}

export interface GuestPaymentPreAuthorizeCardRequest {
  payerData: PayerDetails;
  paymentCard: GuestPaymentCardSubmission;
  userId?: string;
  addressData?: AddressData;
  vRef?: string;
}
