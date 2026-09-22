import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react';

import { PayerDetails } from 'types/Payment';
import { Account } from 'types/Account';
import { useAccountsLoader } from 'hooks/useAccountsLoader';
import { useAppDispatch, useAppSelector } from 'redux/hooks';
import {
  extractLastCardNumbers,
  getEffectivePayerFromAccount,
  getGatewayCardType,
} from 'utilities/utilities';
import {
  setImpersonatedAccount,
  selectImpersonatedAccountState as impersonatedAccountSelector,
  payerSelector,
  selectAllAccountsSelector,
  selectAccountState as selectedAccountSelector,
  setSelectedAccount,
  setSelectedPayer,
  selectUserState as userSelector,
  impersonatedUserSelector,
} from 'redux/reducers';
import { selectPaymentCards } from 'redux/selectors/configSelectors';

interface PayerDetailsContextType {
  payerDetails: PayerDetails | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  refreshPayerDetails: (forceRefreshAccounts?: boolean) => Promise<void>;
  effectivePayer: string;
  effectiveAccount: Account | null;
}

const PayerDetailsContext = createContext<PayerDetailsContextType | undefined>(
  undefined,
);

export const PayerDetailsProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useAppDispatch();

  // Selectors
  const activeUserAccount = useAppSelector(selectedAccountSelector);
  const impersonatedUserAccount = useAppSelector(impersonatedAccountSelector);

  const activeUser = useAppSelector(userSelector);
  const impersonatedUser = useAppSelector(impersonatedUserSelector);

  const selectedPayer = useAppSelector(payerSelector);
  const paymentCardsConfig = useAppSelector(selectPaymentCards);

  const allAccounts = useAppSelector(selectAllAccountsSelector) as Account[];

  // Derived State
  const isNonEmptyObject = (obj: unknown): boolean =>
    !!obj && typeof obj === 'object' && Object.keys(obj as object).length > 0;

  const hasImpersonatedAccount = isNonEmptyObject(impersonatedUserAccount);

  const effectiveAccount = hasImpersonatedAccount
    ? impersonatedUserAccount
    : activeUserAccount;

  const effectivePayer =
    getEffectivePayerFromAccount(effectiveAccount, selectedPayer) || '';

  // Note: helper.ts logic was: effectiveUserId = impersonatedUser?.userId ?? activeUser?.userId;
  // This meant if impersonating, use that ID, else use active.
  const effectiveUserId = impersonatedUser?.userId ?? activeUser?.userId;

  const { loadAccounts } = useAccountsLoader();

  // Local State
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'succeeded' | 'failed'
  >('idle');
  const [error, setError] = useState<string | null>(null);

  const normalizePayerDetails = useCallback(
    (details: PayerDetails) => {
      return {
        ...details,
        paymentCards: (details?.paymentCards || []).map((c) => ({
          ...c,
          paymentCardType: c.paymentCardType,
          sapCardType: c.sapCardType,
          gatewayCardType:
            c.gatewayCardType ||
            getGatewayCardType(c.paymentCardType, paymentCardsConfig),
          cardLast4Digit:
            c.cardLast4Digit ||
            extractLastCardNumbers(c.paymentCardType, c.paymentCardToken),
        })),
      } as PayerDetails;
    },
    [paymentCardsConfig],
  );

  const hydratePayerDetailsFromAccount = useCallback(
    (
      account: Account | null | undefined,
      payer: string,
    ): PayerDetails | null => {
      const source = account?.resolvedPayerDetails;
      if (!source || !payer) {
        return null;
      }

      return {
        ...source,
        customerNumber: source.customerNumber ?? payer,
        companyCode: source.companyCode ?? account.companyCode ?? '',
        paymentCards: (source.paymentCards ?? []).map((card) => ({
          ...card,
        })),
        payerAutoPayStatus: (source.payerAutoPayStatus ?? []).map((status) => ({
          ...status,
        })),
      } as PayerDetails;
    },
    [],
  );

  const findAccountByAccountAndCompanyCode = useCallback(
    (
      accounts: Account[] | undefined,
      target: Account | null | undefined,
    ): Account | undefined => {
      if (!target?.primaryAcct) {
        return undefined;
      }

      const exactMatch = accounts?.find(
        (account) =>
          account.primaryAcct === target.primaryAcct &&
          account.companyCode === target.companyCode,
      );

      return (
        exactMatch ??
        accounts?.find((account) => account.primaryAcct === target.primaryAcct)
      );
    },
    [],
  );

  const refreshPayerDetails = useCallback(
    async (forceRefreshAccounts = false) => {
      let currentAccount = effectiveAccount;

      if (
        currentAccount?.primaryAcct &&
        (!currentAccount.relatedAccounts ||
          currentAccount.relatedAccounts.length === 0)
      ) {
        const cached = findAccountByAccountAndCompanyCode(
          allAccounts,
          currentAccount,
        );
        if (cached) {
          currentAccount = cached;
        }
      }

      const accountId = currentAccount?.primaryAcct;
      const currentPayer = getEffectivePayerFromAccount(
        currentAccount,
        effectivePayer,
      );
      if (!accountId || !currentPayer) return;

      setStatus('loading');
      setError(null);

      try {
        const sourceAccounts: Account[] = forceRefreshAccounts
          ? await loadAccounts(effectiveUserId, true)
          : allAccounts?.length > 0
            ? allAccounts
            : currentAccount
              ? [currentAccount]
              : [];

        const refreshedAccount =
          findAccountByAccountAndCompanyCode(sourceAccounts, currentAccount) ??
          currentAccount;

        if (forceRefreshAccounts) {
          dispatch(setSelectedAccount({ selectedAccount: refreshedAccount }));
          if (hasImpersonatedAccount) {
            dispatch(
              setImpersonatedAccount({ impersonatedAccount: refreshedAccount }),
            );
          }
        }

        const refreshedPayer = getEffectivePayerFromAccount(
          refreshedAccount,
          currentPayer,
        );

        dispatch(setSelectedPayer(refreshedPayer));

        const payerDetails = hydratePayerDetailsFromAccount(
          refreshedAccount,
          refreshedPayer,
        );
        if (!payerDetails) {
          throw new Error(
            'Resolved payer details not found in accounts response',
          );
        }

        normalizePayerDetails(payerDetails);
        setStatus('succeeded');
      } catch (e: unknown) {
        setError(
          e instanceof Error ? e.message : 'Failed to load payer details',
        );
        setStatus('failed');
      }
    },
    [
      effectiveAccount,
      effectivePayer,
      effectiveUserId,
      hasImpersonatedAccount,
      dispatch,
      loadAccounts,
      allAccounts,
      normalizePayerDetails,
      hydratePayerDetailsFromAccount,
      findAccountByAccountAndCompanyCode,
    ],
  );

  return (
    <PayerDetailsContext.Provider
      value={{
        payerDetails:
          normalizePayerDetails(
            hydratePayerDetailsFromAccount(
              effectiveAccount,
              effectivePayer,
            ) ?? {
              customerNumber: '',
              companyCode: '',
              paymentCards: [],
            },
          ) || null,
        status,
        error,
        refreshPayerDetails,
        effectivePayer: effectivePayer || '',
        effectiveAccount: effectiveAccount || null,
      }}
    >
      {children}
    </PayerDetailsContext.Provider>
  );
};

export const usePayerDetails = () => {
  const context = useContext(PayerDetailsContext);
  if (context === undefined) {
    throw new Error(
      'usePayerDetails must be used within a PayerDetailsProvider',
    );
  }
  return context;
};
