import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
} from 'react';

import { useIntl } from 'react-intl';

import { UserView } from 'types/User';
import { PayerDetails } from 'types/Payment';
import { LoggedInUser } from 'types/LoggedInUser';
import { useAccountSwitch } from 'hooks/useAccountSwitch';
import { useAccountsLoader } from 'hooks/useAccountsLoader';
import { EpayUserService } from 'services/EpayUserService';
import { useAppDispatch, useAppSelector } from 'redux/hooks';
import { Account } from 'types/Account';
import { getEffectivePayerFromAccount } from 'utilities/utilities';
import {
  impersonatedUserSelector,
  impersonateUser,
  unimpersonateUser,
  userSelector,
} from 'redux/reducers/userSlice';
import {
  impersonatedAccountSelector,
  selectedAccountSelector,
  setImpersonatedAccount,
  setSelectedAccount,
} from 'redux/reducers/accountSlice';
import { payerSelector, setSelectedPayer } from 'redux/reducers/paymentSlice';

import { useEpayToast } from './EpayToastProvider';

interface ImpersonationContextType {
  // State
  impersonatedUser: UserView | null;
  impersonatedAccount: Account | null;
  impersonatedPayer: string;
  impersonatedPayerDetails: PayerDetails;
  isImpersonating: boolean;

  // Computed effective values
  effectiveUser: LoggedInUser | UserView | null;
  effectiveAccount: Account | null;
  effectivePayer: string;
  effectivePayerDetails: PayerDetails;
  effectiveUserId: string | undefined;

  // Actions
  impersonate: (userId: string) => void;
  unimpersonate: () => void;
}

const EpayImpersonationContext = createContext<
  ImpersonationContextType | undefined
>(undefined);

interface Props {
  children: ReactNode;
}

export default function EpayImpersonationProvider(props: Props) {
  const dispatch = useAppDispatch();
  const { showToastMessage } = useEpayToast();
  const intl = useIntl();
  const f = useCallback(
    (id: string) => intl.formatMessage({ id, defaultMessage: id }),
    [intl],
  );

  // Service hooks
  const getUserById = EpayUserService.useGetUserById();
  const { loadAccounts } = useAccountsLoader();
  const { switchAccount } = useAccountSwitch();

  // Read impersonation state from Redux
  const impersonatedUser = useAppSelector(impersonatedUserSelector);
  const impersonatedAccount = useAppSelector(impersonatedAccountSelector);

  // Read regular state for effective values
  const user = useAppSelector(userSelector);
  const selectedAccount = useAppSelector(selectedAccountSelector);
  const payer = useAppSelector(payerSelector);

  // Compute isImpersonating
  const isImpersonating = useMemo(
    () => !!impersonatedUser && Object.keys(impersonatedUser).length > 0,
    [impersonatedUser],
  );

  // Compute effective values
  const effectiveUser = useMemo(
    () => (impersonatedUser ? impersonatedUser : (user ?? null)),
    [impersonatedUser, user],
  );

  const effectiveAccount = useMemo(() => {
    const isValidImpersonatedAccount =
      impersonatedAccount &&
      typeof impersonatedAccount === 'object' &&
      Object.keys(impersonatedAccount).length > 0;
    return isValidImpersonatedAccount ? impersonatedAccount : selectedAccount;
  }, [impersonatedAccount, selectedAccount]);

  const effectivePayerDetails = useMemo(() => {
    const hasImpersonatedAccount =
      impersonatedAccount &&
      typeof impersonatedAccount === 'object' &&
      Object.keys(impersonatedAccount).length > 0;
    const sourceAccount = hasImpersonatedAccount
      ? impersonatedAccount
      : selectedAccount;
    const source = sourceAccount?.resolvedPayerDetails;
    const payerNumber = payer;

    if (!source) {
      return {
        customerNumber: '',
        companyCode: '',
        paymentCards: [],
      };
    }

    return {
      ...source,
      customerNumber: source.customerNumber ?? payerNumber ?? '',
      companyCode: source.companyCode ?? sourceAccount.companyCode ?? '',
      paymentCards: (source.paymentCards ?? []).map((card) => ({
        ...card,
      })),
      payerAutoPayStatus: (source.payerAutoPayStatus ?? []).map((status) => ({
        ...status,
      })),
    };
  }, [impersonatedAccount, selectedAccount, payer]);

  const effectivePayer = useMemo(
    () => getEffectivePayerFromAccount(effectiveAccount, payer),
    [effectiveAccount, payer],
  );

  const effectiveUserId = useMemo(
    () => impersonatedUser?.userId ?? user?.userId,
    [impersonatedUser, user],
  );

  // Actions
  const impersonate = useCallback(
    async (userId: string) => {
      try {
        const otherUser = await getUserById(userId);
        const accounts = await loadAccounts(userId);

        if (!accounts || accounts.length === 0) {
          showToastMessage('error', f('error.user.accounts.none'));
          return;
        }

        dispatch(impersonateUser(otherUser));
        const newSelAcct = accounts[0]; //TODO: should we always select the first?

        await switchAccount(newSelAcct, userId, otherUser.primaryAccountType);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        showToastMessage('error', errorMessage);
      }
    },
    [getUserById, loadAccounts, dispatch, showToastMessage, f, switchAccount],
  );

  const unimpersonate = useCallback(() => {
    // state info for the logged-on user should still be in place,
    // so we shouldn't need to do anything other than unset the impersonated bits
    dispatch(unimpersonateUser());
    dispatch(setImpersonatedAccount({ impersonatedAccount: null }));
    dispatch(setSelectedAccount({ selectedAccount: null }));
    dispatch(setSelectedPayer(''));
  }, [dispatch]);

  const contextValue: ImpersonationContextType = useMemo(
    () => ({
      // State
      impersonatedUser: impersonatedUser || null,
      impersonatedAccount: impersonatedAccount || null,
      impersonatedPayer: effectivePayer,
      impersonatedPayerDetails: effectivePayerDetails,
      isImpersonating,

      // Computed
      effectiveUser,
      effectiveAccount,
      effectivePayer,
      effectivePayerDetails,
      effectiveUserId,

      // Actions
      impersonate,
      unimpersonate,
    }),
    [
      impersonatedUser,
      impersonatedAccount,
      isImpersonating,
      effectiveUser,
      effectiveAccount,
      effectivePayer,
      effectivePayerDetails,
      effectiveUserId,
      impersonate,
      unimpersonate,
    ],
  );

  return (
    <EpayImpersonationContext.Provider value={contextValue}>
      {props.children}
    </EpayImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const ctx = useContext(EpayImpersonationContext);
  if (!ctx) {
    throw new Error(
      'useImpersonation must be used within EpayImpersonationProvider',
    );
  }
  return ctx;
}
