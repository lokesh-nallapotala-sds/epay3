import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { Account } from 'types/Account';
import { useAccountSwitch } from 'hooks/useAccountSwitch';
import { useAccountsLoader } from 'hooks/useAccountsLoader';
import { useEpayToast } from 'providers/EpayToastProvider';
import { useAppSelector } from 'redux/hooks';
import { useImpersonation } from 'providers/EpayImpersonationProvider';
import {
  payerSelector,
  selectAllAccountsSelector,
  selectAccountState as selectedAccountSelector,
  selectUserState as userSelector,
} from 'redux/reducers';
import { selectCompanyCodes } from 'redux/selectors/configSelectors';
import { getAccountIdentity } from '../utilities/utilities';
import {
  loadSelectedAccountCompanyCode,
  loadSelectedAccountId,
} from '../utilities/accountPersistence';

export const normalizeCompanyCode = (companyCode?: string | number | null) =>
  String(companyCode ?? '');

export interface UseHeaderAccountsReturn {
  accounts: Account[];
  account: Account | null | undefined;
  accountSelectOpen: boolean;
  setAccountSelectOpen: (open: boolean) => void;
  openAccountSearch: boolean;
  setOpenAccountSearch: (open: boolean) => void;
  selectedPrimaryAcct: string;
  selectedCompanyCode: string;
  distinctAccounts: Account[];
  companyCodeOptions: Account[];
  changeSelectedAccount: (e: { target: { value: unknown } }) => void;
  changeSelectedCompanyCode: (e: {
    target: { value: unknown };
  }) => Promise<void>;
  applySelectedAccount: (
    selected: Account,
    options?: { closeSearchDialog?: boolean },
  ) => Promise<void>;
  handleAccountSearchClick: () => void;
  handleAccountSelectedFromSearch: (selected: Account) => void;
  getCompanyCodeDisplayParts: (
    option?: Account,
    fallbackCompanyCode?: string,
  ) => { companyCode: string; description: string };
}

export function useHeaderAccounts(): UseHeaderAccountsReturn {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToastMessage } = useEpayToast();
  const { impersonatedUser } = useImpersonation();
  const { loadAccounts } = useAccountsLoader();
  const { switchAccount } = useAccountSwitch();
  const user = useAppSelector(userSelector);
  const selectedAccount = useAppSelector(selectedAccountSelector);
  const selectedPayer = useAppSelector(payerSelector);
  const allAccounts = useAppSelector(selectAllAccountsSelector);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [account, setAccount] = useState(selectedAccount);
  const [accountSelectOpen, setAccountSelectOpen] = useState(false);
  const [openAccountSearch, setOpenAccountSearch] = useState(false);
  const [selectedPrimaryAcct, setSelectedPrimaryAcct] = useState(
    selectedAccount?.primaryAcct ?? '',
  );
  const [selectedCompanyCode, setSelectedCompanyCode] = useState(
    selectedAccount?.companyCode ?? '',
  );

  const companyCodeDisplayNames = useAppSelector(selectCompanyCodes);
  const companyCodeDescriptionByCode = useMemo(
    () =>
      new Map(
        companyCodeDisplayNames.map((cc) => [
          normalizeCompanyCode(cc.companyCode),
          cc.description,
        ]),
      ),
    [companyCodeDisplayNames],
  );

  const getCompanyCodeDisplayParts = (
    option?: Account,
    fallbackCompanyCode?: string,
  ) => {
    const companyCode = normalizeCompanyCode(
      option?.companyCode ?? option?.salesOrganization ?? fallbackCompanyCode,
    );
    const description =
      companyCodeDescriptionByCode.get(companyCode) ??
      option?.address?.name ??
      '';
    return { companyCode, description };
  };

  const isSameAccountAndCompanyCode = (
    candidate: Account,
    target: Account | null | undefined,
  ) =>
    !!target &&
    candidate.primaryAcct === target.primaryAcct &&
    normalizeCompanyCode(candidate.companyCode) ===
      normalizeCompanyCode(target.companyCode) &&
    normalizeCompanyCode(candidate.salesOrganization) ===
      normalizeCompanyCode(target.salesOrganization);

  useEffect(() => {
    setAccount(selectedAccount);
  }, [selectedAccount]);

  useEffect(() => {
    setAccounts(allAccounts ?? []);
  }, [allAccounts]);

  const impersonatedUserId = impersonatedUser?.userId;
  const prevEffectiveUserIdRef = useRef<string | null>(null);
  const inflightEffectiveUserIdRef = useRef<string | null>(null);

  const applySelectedAccount = async (
    selected: Account,
    options?: { closeSearchDialog?: boolean },
  ) => {
    try {
      setAccount(selected);
      await switchAccount(
        selected,
        impersonatedUserId,
        impersonatedUser?.primaryAccountType,
      );
      if (options?.closeSearchDialog) {
        setOpenAccountSearch(false);
      }
      const path = location.pathname.toLowerCase();
      if (
        path === '/makepaymentpage' ||
        path === '/payment/session' ||
        path === '/payment/session/receipt' ||
        path === '/payment/deposits/receipt'
      ) {
        navigate('/home');
      }
    } catch {
      // optional: surface via showToastMessage
    }
  };

  useEffect(() => {
    const effectiveUserId = impersonatedUser?.userId ?? user?.userId;

    if (!impersonatedUser?.userId && !selectedAccount?.primaryAcct) {
      prevEffectiveUserIdRef.current = null;
    }

    if (
      (prevEffectiveUserIdRef.current === effectiveUserId &&
        allAccounts?.length > 0) ||
      inflightEffectiveUserIdRef.current === effectiveUserId ||
      !effectiveUserId
    ) {
      return;
    }

    const fetchAccounts = async () => {
      inflightEffectiveUserIdRef.current = effectiveUserId;
      try {
        const fetchedAccounts = await loadAccounts(effectiveUserId, true);
        setAccounts(fetchedAccounts);
        prevEffectiveUserIdRef.current = effectiveUserId;

        if (fetchedAccounts.length > 0) {
          const storedAccountId = loadSelectedAccountId();
          const storedCompanyCode = loadSelectedAccountCompanyCode();
          const newSelAcct =
            (storedAccountId
              ? (fetchedAccounts.find(
                  (a) =>
                    a.primaryAcct === storedAccountId &&
                    (!storedCompanyCode || a.companyCode === storedCompanyCode),
                ) ??
                fetchedAccounts.find((a) => a.primaryAcct === storedAccountId))
              : null) ??
            (selectedPayer
              ? fetchedAccounts.find((x) => x.primaryAcct === selectedPayer)
              : null) ??
            fetchedAccounts[0];
          const canonicalSelectedAccount = selectedAccount
            ? (fetchedAccounts.find((a) =>
                isSameAccountAndCompanyCode(a, selectedAccount),
              ) ??
              fetchedAccounts.find(
                (a) =>
                  getAccountIdentity(a) === getAccountIdentity(selectedAccount),
              ) ??
              fetchedAccounts.find(
                (a) =>
                  a.primaryAcct === selectedAccount.primaryAcct &&
                  !selectedAccount.companyCode,
              ))
            : undefined;
          const isCurrentInList =
            selectedAccount &&
            fetchedAccounts.some((a) =>
              isSameAccountAndCompanyCode(a, selectedAccount),
            );

          if (!selectedAccount || !isCurrentInList) {
            setAccount(newSelAcct);
            await switchAccount(
              newSelAcct,
              impersonatedUserId,
              impersonatedUser?.primaryAccountType,
            );
          } else if (canonicalSelectedAccount) {
            setAccount(canonicalSelectedAccount);
            await switchAccount(
              canonicalSelectedAccount,
              impersonatedUserId,
              impersonatedUser?.primaryAccountType,
            );
          }
        }
      } catch (error) {
        showToastMessage(
          'error',
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        if (inflightEffectiveUserIdRef.current === effectiveUserId) {
          inflightEffectiveUserIdRef.current = null;
        }
      }
    };

    fetchAccounts();
  }, [
    user?.userId,
    impersonatedUser?.userId,
    selectedAccount,
    selectedPayer,
    allAccounts,
    loadAccounts,
  ]);

  useEffect(() => {
    if (selectedAccount) {
      setSelectedPrimaryAcct(selectedAccount.primaryAcct);
      setSelectedCompanyCode(selectedAccount.companyCode);
    }
  }, [selectedAccount]);

  const companyCodeOptions = useMemo(
    () => accounts.filter((item) => item.primaryAcct === selectedPrimaryAcct),
    [accounts, selectedPrimaryAcct],
  );

  const distinctAccounts = useMemo(() => {
    const accountByPrimaryAcct = new Map<string, Account>();
    accounts.forEach((item) => {
      if (!accountByPrimaryAcct.has(item.primaryAcct)) {
        accountByPrimaryAcct.set(item.primaryAcct, item);
      }
    });
    return Array.from(accountByPrimaryAcct.values());
  }, [accounts]);

  useEffect(() => {
    if (companyCodeOptions.length > 0) {
      const selectedCode = normalizeCompanyCode(selectedCompanyCode);
      const selectedAccountCode = normalizeCompanyCode(
        selectedAccount?.companyCode,
      );
      const match = companyCodeOptions.find(
        (item) => normalizeCompanyCode(item.companyCode) === selectedCode,
      );

      if (!match) {
        const defaultCompany =
          companyCodeOptions.find(
            (item) =>
              normalizeCompanyCode(item.companyCode) === selectedAccountCode,
          ) ?? companyCodeOptions[0];
        const defaultCompanyCode = normalizeCompanyCode(
          defaultCompany.companyCode,
        );
        setSelectedCompanyCode(defaultCompanyCode);

        if (
          getAccountIdentity(defaultCompany) !==
          getAccountIdentity(selectedAccount)
        ) {
          void applySelectedAccount(defaultCompany);
        }
      }
    }
  }, [companyCodeOptions, selectedAccount?.companyCode, selectedCompanyCode]);

  const handleAccountSearchClick = () => {
    setAccountSelectOpen(false);
    setOpenAccountSearch(true);
  };

  const handleAccountSelectedFromSearch = (selected: Account) => {
    applySelectedAccount(selected, { closeSearchDialog: true });
  };

  const changeSelectedAccount = (e: { target: { value: unknown } }) => {
    const accountNr = e.target.value;
    const selected = accounts.find((x) => x.primaryAcct === accountNr);

    if (selected) {
      const relatedCompanyCodes = accounts.filter(
        (a) => a.primaryAcct === selected.primaryAcct,
      );
      setSelectedPrimaryAcct(selected.primaryAcct);
      const defaultCompany =
        relatedCompanyCodes.find(
          (a) => a.companyCode === selected.companyCode,
        ) || relatedCompanyCodes[0];
      setSelectedCompanyCode(defaultCompany?.companyCode || '');
      applySelectedAccount(selected);
    }
  };

  const changeSelectedCompanyCode = async (e: {
    target: { value: unknown };
  }) => {
    const companyCode = normalizeCompanyCode(e.target.value as string);
    setSelectedCompanyCode(companyCode);

    const selected = accounts.find(
      (item) =>
        item.primaryAcct === selectedPrimaryAcct &&
        (normalizeCompanyCode(item.companyCode) === companyCode ||
          normalizeCompanyCode(item.salesOrganization) === companyCode),
    );

    if (
      selected &&
      getAccountIdentity(selected) !== getAccountIdentity(selectedAccount)
    ) {
      await applySelectedAccount(selected);
    }
  };

  return {
    accounts,
    account,
    accountSelectOpen,
    setAccountSelectOpen,
    openAccountSearch,
    setOpenAccountSearch,
    selectedPrimaryAcct,
    selectedCompanyCode,
    distinctAccounts,
    companyCodeOptions,
    changeSelectedAccount,
    changeSelectedCompanyCode,
    applySelectedAccount,
    handleAccountSearchClick,
    handleAccountSelectedFromSearch,
    getCompanyCodeDisplayParts,
  };
}
