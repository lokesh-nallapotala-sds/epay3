import { safeJsonParse } from './utilities';

const SELECTED_ACCOUNT_ID_KEY = 'selectedAccountId';
const SELECTED_ACCOUNT_COMPANY_CODE_KEY = 'selectedAccountCompanyCode';
const SELECTED_ACCOUNT_KEY = 'authenticatedUser.selectedAccount';

export const saveSelectedAccountId = (
  primaryAcct: string,
  companyCode?: string,
): void => {
  localStorage.setItem(SELECTED_ACCOUNT_ID_KEY, primaryAcct);
  if (companyCode) {
    localStorage.setItem(SELECTED_ACCOUNT_COMPANY_CODE_KEY, companyCode);
  } else {
    localStorage.removeItem(SELECTED_ACCOUNT_COMPANY_CODE_KEY);
  }
};

export const loadSelectedAccountId = (): string | null =>
  localStorage.getItem(SELECTED_ACCOUNT_ID_KEY);

export const loadSelectedAccountCompanyCode = (): string | null =>
  localStorage.getItem(SELECTED_ACCOUNT_COMPANY_CODE_KEY);

export const clearSelectedAccountId = (): void => {
  localStorage.removeItem(SELECTED_ACCOUNT_ID_KEY);
  localStorage.removeItem(SELECTED_ACCOUNT_COMPANY_CODE_KEY);
};

export const saveSelectedAccount = (account: object): void =>
  sessionStorage.setItem(SELECTED_ACCOUNT_KEY, JSON.stringify(account));

export const loadSelectedAccount = <T>(): T | null => {
  const value = sessionStorage.getItem(SELECTED_ACCOUNT_KEY);
  return safeJsonParse<T | null>(value, null);
};

export const clearSelectedAccount = (): void =>
  sessionStorage.removeItem(SELECTED_ACCOUNT_KEY);
