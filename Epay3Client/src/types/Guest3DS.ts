import { Address } from './Address';
import { PayerData } from './InvoicesSearchRequest';
import { PaymentDetail } from './Payment';

export interface Guest3DSContext {
  payer: PayerData;
  billingAddress?: Address;
  amount: number;
  currency: string;
  guestUserEmail?: string;
}

export interface GuestTransactionAccessTokenRequest {
  payer: PayerData;
  payment: PaymentDetail;
  billingAddress?: Address;
  amount: number;
  currency: string;
  redirectUri: string;
  guestUserEmail?: string;
}
