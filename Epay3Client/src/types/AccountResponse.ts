import { PaymentCard, PaymentCardSubmission } from './Payment';

export interface AccountResponse {
  companyCode: string;
  distributionChannel: string;
  division: string;
  name: string;
  name2: string | null;
  name3: string | null;
  name4: string | null;
  primaryAccount: string;
  salesOrganization: string;
  selected: boolean;
  subType: string;
}

export interface ObjFilters {
  selectedAccount: string;
  subAccounts: string;
  subType: string;
}

export interface TokenizationResponse {
  // Define properties that match the C# TokenizationResponse class
  // Example:
  paymentCard: PaymentCard;
  status: string;
  cardinal: Record<string, unknown>;
  vRef?: string;
  v_ref?: string;
  // other properties
}

export interface ThreeDSAuthenticationResultRequest {
  accessToken?: string;
  vRef?: string;
}

// Paymetric payment method entry token — returned by GET /api/payment/token
export interface TokenResponse {
  accessToken: string;
  paymetricUrl: string;
  merchantId: string;
}

// Paymetric tokenize response — returned after card tokenization
export interface TokenizeResponse {
  paymentCard?: PaymentCardSubmission & { type?: string };
  vRef?: string;
  v_ref?: string;
}

export interface ThreeDSCardinalData {
  secure3DSVersion?: string;
  enrolled?: string;
  eciFlag?: string;
  transactionId?: string;
  dsTransactionId?: string;
  cavv?: string;
  paresStatus?: string;
}

export interface ThreeDSAuthenticationResultResponse {
  cardinalData?: ThreeDSCardinalData;
  accessToken?: string;
  status?: {
    messageType?: string;
    messageIdentification?: string;
    messageNumber?: number;
    messageLineString?: string;
  };
  vRef?: string;
  v_ref?: string;
}

export interface PaymentAccessToken {
  merchantId: string;
  accessToken: string;
  paymetricUrl: string;
  vRef?: string;
}

export interface AvsVerificationResult {
  message: string;
  avsCode: string;
}
