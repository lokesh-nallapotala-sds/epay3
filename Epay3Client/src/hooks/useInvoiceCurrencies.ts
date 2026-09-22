import { useMemo } from 'react';

import { useAppSelector } from 'redux/hooks';
import { Invoice } from 'types/InvoicesSearchRequest';
import { selectCompanyCodes } from 'redux/selectors/configSelectors';
import { getConfiguredCurrenciesForAccounts } from 'utilities/currency';
import {
  useEffectiveAccount,
  useRelatedAccounts,
} from 'hooks/usePaymentHelpers';

interface UseInvoiceCurrenciesParams {
  invoices: Invoice[];
  subAccounts?: string[];
}

export function useInvoiceCurrencies({
  invoices,
  subAccounts,
}: UseInvoiceCurrenciesParams) {
  const companyCodes = useAppSelector(selectCompanyCodes);
  const effectiveAccount = useEffectiveAccount();
  const relatedAccountsLoaded = useRelatedAccounts();

  const configuredCurrencies = useMemo(
    () =>
      getConfiguredCurrenciesForAccounts(
        companyCodes,
        effectiveAccount,
        relatedAccountsLoaded,
        subAccounts,
      ),
    [companyCodes, effectiveAccount, relatedAccountsLoaded, subAccounts],
  );

  const invoiceCurrencyTypes = useMemo(
    () =>
      [...new Set((invoices ?? []).map((invoice) => invoice.currencyKey))]
        .filter(Boolean)
        .sort(),
    [invoices],
  );

  const currencyTypes = useMemo(
    () =>
      invoiceCurrencyTypes.length > 0
        ? invoiceCurrencyTypes
        : configuredCurrencies.map((currency) => currency.code),
    [configuredCurrencies, invoiceCurrencyTypes],
  );

  const currencyOptions = useMemo(
    () => currencyTypes.map((currency) => ({ key: currency, value: currency })),
    [currencyTypes],
  );

  return { configuredCurrencies, currencyTypes, currencyOptions };
}
