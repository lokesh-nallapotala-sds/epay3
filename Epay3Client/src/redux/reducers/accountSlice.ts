import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  enrichAccountPaymentCardTypes,
  safeJsonParse,
} from 'utilities/utilities';
import {
  saveSelectedAccountId,
  clearSelectedAccountId,
  saveSelectedAccount,
  loadSelectedAccount,
  clearSelectedAccount,
} from 'utilities/accountPersistence';

import { RootState } from '../EpayStore';
import { Account } from 'types/Account';

const AccountDatum = {
  ImpersonatedAccount: 'impersonatedUser.selectedAccount',
} as const;

const LegacyAccountDatum = {
  ImpersonatedAccountTypo: 'account.impresonatedAccount',
  ImpersonatedAccount: 'account.impersonatedAccount',
} as const;

const readSessionJsonWithMigration = <T>(
  key: string,
  legacyKeys: string[],
  fallback: T,
): T => {
  const value = sessionStorage.getItem(key);
  if (value) {
    return safeJsonParse<T>(value, fallback);
  }

  for (const legacyKey of legacyKeys) {
    const legacyValue = sessionStorage.getItem(legacyKey);
    if (legacyValue) {
      sessionStorage.setItem(key, legacyValue);
      sessionStorage.removeItem(legacyKey);
      return safeJsonParse<T>(legacyValue, fallback);
    }
  }

  return fallback;
};

function enrichNullableAccount(account: Account | null): Account | null {
  return account ? enrichAccountPaymentCardTypes(account) : account;
}

export const accountSliceInitialState = {
  selectedAccount: enrichNullableAccount(loadSelectedAccount<Account>()),
  impersonatedAccount: enrichNullableAccount(
    readSessionJsonWithMigration<Account | null>(
      AccountDatum.ImpersonatedAccount,
      [
        LegacyAccountDatum.ImpersonatedAccountTypo,
        LegacyAccountDatum.ImpersonatedAccount,
      ],
      null,
    ),
  ),
  accounts: [] as Account[],
};

export const accountSlice = createSlice({
  name: 'account',
  initialState: accountSliceInitialState,
  reducers: {
    setSelectedAccount: (state, action) => {
      const enrichedAccount = enrichNullableAccount(
        action.payload.selectedAccount,
      );
      state.selectedAccount = enrichedAccount;
      if (enrichedAccount) {
        saveSelectedAccountId(
          enrichedAccount.primaryAcct,
          enrichedAccount.companyCode,
        );
        saveSelectedAccount(enrichedAccount);
      } else {
        clearSelectedAccountId();
        clearSelectedAccount();
      }
    },
    setImpersonatedAccount: (state, action) => {
      const enrichedAccount = enrichNullableAccount(
        action.payload.impersonatedAccount,
      );
      state.impersonatedAccount = enrichedAccount;
      if (enrichedAccount) {
        sessionStorage.setItem(
          AccountDatum.ImpersonatedAccount,
          JSON.stringify(enrichedAccount),
        );
      } else {
        sessionStorage.removeItem(AccountDatum.ImpersonatedAccount);
        sessionStorage.removeItem(LegacyAccountDatum.ImpersonatedAccountTypo);
        sessionStorage.removeItem(LegacyAccountDatum.ImpersonatedAccount);
      }
    },
    setAccounts: (state, action: PayloadAction<Account[]>) => {
      state.accounts = action.payload.map((account) =>
        enrichAccountPaymentCardTypes(account),
      );
    },
  },
});

export const { setSelectedAccount, setImpersonatedAccount, setAccounts } =
  accountSlice.actions;

export const selectedAccountSelector = (state: RootState) =>
  state.account.selectedAccount;
export const impersonatedAccountSelector = (state: RootState) =>
  state.account.impersonatedAccount;
export const selectAllAccountsSelector = (state: RootState) =>
  state.account.accounts;

export default accountSlice.reducer;
