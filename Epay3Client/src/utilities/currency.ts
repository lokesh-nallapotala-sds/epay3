import { CurrencySymbols } from 'constants/CurrencySymbols';
import { Account } from 'types/Account';
import { AccountResponse } from 'types/AccountResponse';
import { CurrencySymbol } from 'types/CurrencySymbol';
import CompanyCodeDetail from 'types/SapConfig/CompanyCodeDetail';

const createFallbackCurrency = (code: string): CurrencySymbol => ({
  code,
  symbol: code,
  symbolNative: code,
  name: code,
  namePlural: code,
  decimalDigits: 2,
  rounding: 0,
});

export const getConfiguredCurrenciesForAccounts = (
  companyCodes: CompanyCodeDetail[] | undefined,
  selectedAccount: Pick<Account, 'companyCode'> | null | undefined,
  relatedAccounts: AccountResponse[] | undefined,
  selectedSubAccounts?: string[] | string | null,
): CurrencySymbol[] => {
  const companyCodeMap = new Map(
    (companyCodes ?? []).map((companyCode) => [
      companyCode.companyCode,
      companyCode,
    ]),
  );

  const selectedAccounts = Array.isArray(selectedSubAccounts)
    ? selectedSubAccounts.filter(Boolean)
    : selectedSubAccounts
      ? [selectedSubAccounts]
      : [];

  const relevantCompanyCodes = new Set<string>();

  if (selectedAccount?.companyCode) {
    relevantCompanyCodes.add(selectedAccount.companyCode);
  }

  const candidateRelatedAccounts =
    selectedAccounts.length > 0
      ? (relatedAccounts ?? []).filter((account) =>
          selectedAccounts.includes(account.primaryAccount),
        )
      : (relatedAccounts ?? []);

  candidateRelatedAccounts.forEach((account) => {
    if (account.companyCode) {
      relevantCompanyCodes.add(account.companyCode);
    }
  });

  return [...relevantCompanyCodes]
    .map((companyCode) => companyCodeMap.get(companyCode)?.currencyKey)
    .filter((currencyKey): currencyKey is string => !!currencyKey)
    .filter((currencyKey, index, array) => array.indexOf(currencyKey) === index)
    .map(
      (currencyKey) =>
        CurrencySymbols[currencyKey] ?? createFallbackCurrency(currencyKey),
    );
};
