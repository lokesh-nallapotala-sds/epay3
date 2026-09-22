import { Invoice } from 'types/InvoicesSearchRequest';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DepositDetails } from 'types/DepositDetails';
import { PaymentMethod } from 'types/Payment';
import {
  enrichPaymentMethodTypeFields,
  safeJsonParse,
} from 'utilities/utilities';

import { RootState } from '../EpayStore';

const PaymentDatum = {
  Payer: 'payment.payer',
  MappedInvoices: 'payment.mappedInvoices',
  SelectedPaymentMethod: 'payment.selectedPaymentMethod',
  DepositDetails: 'payment.depositDetails',
  ScheduleDate: 'payment.scheduleDate',
} as const;

function loadJson<T>(key: string, fallback: T): T {
  return safeJsonParse<T>(sessionStorage.getItem(key), fallback);
}

export function clearPaymentSession3DS(): void {
  sessionStorage.removeItem(PaymentDatum.Payer);
  sessionStorage.removeItem(PaymentDatum.MappedInvoices);
  sessionStorage.removeItem(PaymentDatum.SelectedPaymentMethod);
  sessionStorage.removeItem(PaymentDatum.DepositDetails);
  sessionStorage.removeItem(PaymentDatum.ScheduleDate);
}

export interface PaymentSliceState {
  paymentMethods: PaymentMethod[];
  guestPaymentMethods: PaymentMethod[];
  payer: string;
  paymentCurrency: string;
  mappedInvoices: Invoice[];
  selectedPaymentMethod: PaymentMethod | null;
  depositDetails: DepositDetails | null;
  defaultCard: string | null;
  scheduleDate: string | null;
}

function enrichNullablePaymentMethod(
  paymentMethod: PaymentMethod | null,
): PaymentMethod | null {
  return paymentMethod ? enrichPaymentMethodTypeFields(paymentMethod) : null;
}

export const paymentSliceInitialState: PaymentSliceState = {
  paymentMethods: [],
  guestPaymentMethods: [],
  payer: loadJson<string>(PaymentDatum.Payer, ''),
  paymentCurrency: '',
  mappedInvoices: loadJson<Invoice[]>(PaymentDatum.MappedInvoices, []),
  selectedPaymentMethod: enrichNullablePaymentMethod(
    loadJson<PaymentMethod | null>(PaymentDatum.SelectedPaymentMethod, null),
  ),
  depositDetails: loadJson<DepositDetails | null>(
    PaymentDatum.DepositDetails,
    null,
  ),
  defaultCard: null,
  scheduleDate: loadJson<string | null>(PaymentDatum.ScheduleDate, null),
};

export const paymentSlice = createSlice({
  name: 'payment',
  initialState: paymentSliceInitialState,
  reducers: {
    setMappedInvoices: (state, action) => {
      state.mappedInvoices = action.payload;
      sessionStorage.setItem(
        PaymentDatum.MappedInvoices,
        JSON.stringify(action.payload),
      );
    },
    setPaymentMethods: (state, action: PayloadAction<PaymentMethod[]>) => {
      state.paymentMethods = action.payload;
    },
    setGuestPaymentMethods: (state, action: PayloadAction<PaymentMethod[]>) => {
      state.guestPaymentMethods = action.payload;
    },
    setSelectedPayer: (state, action: PayloadAction<string>) => {
      state.payer = action.payload;
      if (action.payload) {
        sessionStorage.setItem(
          PaymentDatum.Payer,
          JSON.stringify(action.payload),
        );
      } else {
        sessionStorage.removeItem(PaymentDatum.Payer);
      }
    },
    setPaymentCurrency: (state, action) => {
      state.paymentCurrency = action.payload;
    },
    setSelectedPaymentMethod: (state, action: PayloadAction<PaymentMethod>) => {
      const enriched = enrichNullablePaymentMethod(action.payload);
      state.selectedPaymentMethod = enriched;
      if (enriched) {
        sessionStorage.setItem(
          PaymentDatum.SelectedPaymentMethod,
          JSON.stringify(enriched),
        );
      } else {
        sessionStorage.removeItem(PaymentDatum.SelectedPaymentMethod);
      }
    },
    setDepositDetails: (state, action) => {
      state.depositDetails = action.payload;
      if (action.payload) {
        sessionStorage.setItem(
          PaymentDatum.DepositDetails,
          JSON.stringify(action.payload),
        );
      } else {
        sessionStorage.removeItem(PaymentDatum.DepositDetails);
      }
    },
    setDefaultCard: (state, action: PayloadAction<string>) => {
      state.defaultCard = action.payload;
    },
    setScheduleDate: (state, action: PayloadAction<string>) => {
      state.scheduleDate = action.payload;
      if (action.payload) {
        sessionStorage.setItem(
          PaymentDatum.ScheduleDate,
          JSON.stringify(action.payload),
        );
      } else {
        sessionStorage.removeItem(PaymentDatum.ScheduleDate);
      }
    },
    clearDefaultCard: (state) => {
      state.defaultCard = null;
    },
    clearDepositDetails: (state) => {
      state.depositDetails = null;
      state.selectedPaymentMethod = null;
      sessionStorage.removeItem(PaymentDatum.SelectedPaymentMethod);
      sessionStorage.removeItem(PaymentDatum.DepositDetails);
    },
    clearSelectedPaymentMethod: (state) => {
      state.selectedPaymentMethod = null;
      sessionStorage.removeItem(PaymentDatum.SelectedPaymentMethod);
    },
    clearMappedInvoices: (state) => {
      state.mappedInvoices = [];
      sessionStorage.removeItem(PaymentDatum.MappedInvoices);
    },
    clearScheduleDate: (state) => {
      state.scheduleDate = null;
      sessionStorage.removeItem(PaymentDatum.ScheduleDate);
    },
  },
});

export const {
  setPaymentMethods,
  setGuestPaymentMethods,
  setSelectedPayer,
  setPaymentCurrency,
  setMappedInvoices,
  setSelectedPaymentMethod,
  setDepositDetails,
  setDefaultCard,
  clearDepositDetails,
  clearDefaultCard,
  clearSelectedPaymentMethod,
  clearMappedInvoices,
  setScheduleDate,
  clearScheduleDate,
} = paymentSlice.actions;

export const mappedInvoicesSelector = (state: RootState) =>
  state.payment.mappedInvoices;

export const paymentMethodsSelector = (state: RootState) =>
  state.payment.paymentMethods;

export const guestPaymentMethodsSelector = (state: RootState) =>
  state.payment.guestPaymentMethods;

export const payerSelector = (state: RootState) => state.payment.payer;

export const paymentCurrencySelector = (state: RootState) =>
  state.payment.paymentCurrency;

export const selectedPaymentMethodSelector = (state: RootState) =>
  state.payment.selectedPaymentMethod;

export const depositDetailsSelector = (state: RootState) =>
  state.payment.depositDetails;

export const defaultCardSelector = (state: RootState) =>
  state.payment.defaultCard;

export const scheduleDateSelector = (state: RootState) =>
  state.payment.scheduleDate;

export default paymentSlice.reducer;
