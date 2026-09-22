import { DepositDetails } from './DepositDetails';
import { PaymentMethod } from './Payment';
import { ThreeDSCardinalData } from './AccountResponse';

export interface DepositRequest {
  selectedAccount: string;
  payer: string;
  depositDetails: DepositDetails;
  paymentMethod?: PaymentMethod | null;
  cardinalData?: ThreeDSCardinalData;
  cvv?: string;
  threeDSAccessToken?: string;
  userId?: string;
  companyCode?: string;
  vRef?: string;
}
