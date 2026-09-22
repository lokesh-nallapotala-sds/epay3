import { DepositDetails } from 'types/DepositDetails';
import { PaymentMethod } from 'types/Payment';

import { enrichPaymentMethodTypeFields } from './utilities';

const DEPOSIT_3DS_REDIRECT_SESSION_KEY = 'payment.deposit3dsRedirect';

interface Deposit3dsRedirectSessionState {
  depositDetails: DepositDetails;
  payer: string;
  paymentMethod: PaymentMethod | null;
  vRef?: string;
}

export class Deposit3dsRedirectSession {
  static save(state: Deposit3dsRedirectSessionState): void {
    sessionStorage.setItem(
      DEPOSIT_3DS_REDIRECT_SESSION_KEY,
      JSON.stringify(state),
    );
  }

  static load(): Deposit3dsRedirectSessionState | null {
    try {
      const raw = sessionStorage.getItem(DEPOSIT_3DS_REDIRECT_SESSION_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as Deposit3dsRedirectSessionState;
      return {
        ...parsed,
        paymentMethod: parsed.paymentMethod
          ? enrichPaymentMethodTypeFields(parsed.paymentMethod)
          : null,
      };
    } catch {
      return null;
    }
  }

  static clear(): void {
    sessionStorage.removeItem(DEPOSIT_3DS_REDIRECT_SESSION_KEY);
  }
}
