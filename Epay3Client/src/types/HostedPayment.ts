import { PaymentCard } from './Payment';

export type HostedPaymentMessageType =
  | 'HOSTED_PAYMENT_COMPLETE'
  | 'HOSTED_PAYMENT_ERROR'
  | 'HOSTED_PAYMENT_CANCELLED';

export interface HostedPaymentMessage {
  type: HostedPaymentMessageType;
  sessionId: string;
  nonce: string;
  payload?: {
    accessToken?: string;
    paymentCard?: PaymentCard;
  };
  error?: string;
}

export interface HostedPaymentSession {
  sessionId: string;
  paymentMethod: 'CC' | 'EC';
  accountType?: string;
  isGuest: boolean;
  saveOnFile?: boolean;
  defaultCard?: boolean;
  timestamp: number;
  nonce: string;
  returnUrl?: string;
}

export interface HostedPaymentResult {
  success: boolean;
  paymentCard?: PaymentCard;
  accessToken?: string;
  error?: string;
}
