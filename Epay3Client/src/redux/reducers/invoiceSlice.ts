import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { safeJsonParse } from 'utilities/utilities';

import { RootState } from '../EpayStore';
import { Invoice } from 'types/InvoicesSearchRequest';
import { ValidateInvoiceAccount } from 'types/Invoice';

const InvoiceDatum = {
  SelectedInvoices: 'invoices',
  SoldTo: 'SOLD_TO',
  Payer: 'PAYER',
  ValidatedAccounts: 'VALIDATED_ACCOUNTS',
} as const;

function loadJson<T>(key: string, fallback: T): T {
  return safeJsonParse<T>(sessionStorage.getItem(key), fallback);
}

export function clearInvoiceSession(): void {
  sessionStorage.removeItem(InvoiceDatum.SelectedInvoices);
  sessionStorage.removeItem(InvoiceDatum.SoldTo);
  sessionStorage.removeItem(InvoiceDatum.Payer);
  sessionStorage.removeItem(InvoiceDatum.ValidatedAccounts);
}

export interface InvoiceState {
  selectedInvoices: Invoice[];
  soldTo: string | null;
  payer: string | null;
  validatedAccounts: ValidateInvoiceAccount[];
}

export const invoiceSliceInitialState: InvoiceState = {
  selectedInvoices: loadJson<Invoice[]>(InvoiceDatum.SelectedInvoices, []),
  soldTo: sessionStorage.getItem(InvoiceDatum.SoldTo),
  payer: sessionStorage.getItem(InvoiceDatum.Payer),
  validatedAccounts: loadJson<ValidateInvoiceAccount[]>(
    InvoiceDatum.ValidatedAccounts,
    [],
  ),
};

export const invoiceSlice = createSlice({
  name: 'invoice',
  initialState: invoiceSliceInitialState,
  reducers: {
    setSelectedInvoices: (state, action: PayloadAction<Invoice[]>) => {
      state.selectedInvoices = action.payload;
      if (action.payload.length > 0) {
        sessionStorage.setItem(
          InvoiceDatum.SelectedInvoices,
          JSON.stringify(action.payload),
        );
      } else {
        sessionStorage.removeItem(InvoiceDatum.SelectedInvoices);
      }
    },
    setSoldTo: (state, action: PayloadAction<string | null>) => {
      state.soldTo = action.payload;
      if (action.payload) {
        sessionStorage.setItem(InvoiceDatum.SoldTo, action.payload);
      } else {
        sessionStorage.removeItem(InvoiceDatum.SoldTo);
      }
    },
    setPayer: (state, action: PayloadAction<string | null>) => {
      state.payer = action.payload;
      if (action.payload) {
        sessionStorage.setItem(InvoiceDatum.Payer, action.payload);
      } else {
        sessionStorage.removeItem(InvoiceDatum.Payer);
      }
    },
    addValidatedAccount: (
      state,
      action: PayloadAction<ValidateInvoiceAccount>,
    ) => {
      const nextAccount = action.payload;
      const remainingAccounts = state.validatedAccounts.filter(
        (account) =>
          !(
            account.accountNumber === nextAccount.accountNumber &&
            account.invoiceNumber === nextAccount.invoiceNumber &&
            account.invoiceDetail?.headerData?.companyCode ===
              nextAccount.invoiceDetail?.headerData?.companyCode
          ),
      );

      state.validatedAccounts = [...remainingAccounts, nextAccount];
      sessionStorage.setItem(
        InvoiceDatum.ValidatedAccounts,
        JSON.stringify(state.validatedAccounts),
      );
    },
    clearValidatedAccounts: (state) => {
      state.validatedAccounts = [];
      sessionStorage.removeItem(InvoiceDatum.ValidatedAccounts);
    },
  },
});

export const {
  setSelectedInvoices,
  setSoldTo,
  setPayer,
  addValidatedAccount,
  clearValidatedAccounts,
} = invoiceSlice.actions;

export const selectedInvoicesSelector = (state: RootState) =>
  state.invoice.selectedInvoices;
export const soldToSelector = (state: RootState) => state.invoice.soldTo;
export const invoicePayerSelector = (state: RootState) => state.invoice.payer;
export const validatedAccountsSelector = (state: RootState) =>
  state.invoice.validatedAccounts;

export default invoiceSlice.reducer;
