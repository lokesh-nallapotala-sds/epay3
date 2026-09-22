import {
  ChangeEvent,
  MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { User } from 'types/User';
import Ability from 'types/Ability';
import UserRole from 'types/UserRole';
import UserStatus from 'types/UserStatus';
import AccountType from 'types/AccountType';
import useEpayNavigate from 'hooks/useEpayNavigate';
import { useAccountsLoader } from 'hooks/useAccountsLoader';
import { EpayUserService } from 'services/EpayUserService';
import { useEpayToast } from 'providers/EpayToastProvider';
import { useAppDispatch, useAppSelector } from 'redux/hooks';
import { Account } from 'types/Account';
import { UserAddChangeRequest } from 'types/UserAddChangeRequest';
import { validatePassword, getSelectedSubAccount } from 'utilities/utilities';
import { userHasAbility, userSelector } from 'redux/reducers/userSlice';
import { useFormat } from 'hooks/useFormat';
import {
  selectCompanyCodes,
  selectSalesOrganizations,
} from 'redux/selectors/configSelectors';
import {
  selectUserState,
  setAccounts as setAccountArr,
  setSelectedAccount as setAccountSelected,
  setSelectedPayer,
} from 'redux/reducers';

const emailValidationRegex =
  /(?:[a-z0-9!#$%&"*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&"*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;

const PASSWORD_LENGTH_MIN = 8;

export function useUserAccountManagement() {
  const dispatch = useAppDispatch();
  const f = useFormat();

  const { navigate, location } = useEpayNavigate();
  const { showToastMessage } = useEpayToast();

  const getUserById = EpayUserService.useGetUserById();
  const saveUser = EpayUserService.useSaveUser();
  const deleteAccount = EpayUserService.useDeleteAccount();
  const { loadAccounts } = useAccountsLoader();

  const user = useAppSelector(selectUserState);
  const currentUser = useAppSelector(userSelector) ?? null;
  const companyCodes = useAppSelector(selectCompanyCodes);
  const salesOrganizations = useAppSelector(selectSalesOrganizations);

  const canMakePayment = userHasAbility(currentUser, Ability.MakePayment);
  const isAdmin = userHasAbility(currentUser, Ability.IsAdmin);
  const canManageLinkedAccounts = userHasAbility(
    currentUser,
    Ability.ManageLinkedSAPAccounts,
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [accountID, setAccountID] = useState('');
  const handleDeleteClose = () => setModalOpen(false);

  const userIdIn =
    location && location.state && location.state.userId
      ? (location.state.userId as string)
      : '';
  const [userId, setUserId] = useState(userIdIn);
  const [resolvedUserId, setResolvedUserId] = useState('');

  const [login, setLogin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [firstName, setFirstName] = useState('');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastName, setLastName] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [company, setCompany] = useState('');
  const [companyError, setCompanyError] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [status, setStatus] = useState(UserStatus.Select);
  const [statusError, setStatusError] = useState('');
  const [accountType, setAccountType] = useState(AccountType.Select);
  const [accountTypeError, setAccountTypeError] = useState('');
  const [role, setRole] = useState(UserRole.Select);
  const [roleError, setRoleError] = useState('');
  const [editingPassword, setEditingPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);

  const userLoadRequestIdRef = useRef(0);
  const accountsLoadRequestIdRef = useRef(0);

  const statuses = [
    {
      key: UserStatus.Select,
      displayText: f(UserStatus.getResourceId(UserStatus.Select)),
    },
    {
      key: UserStatus.Active,
      displayText: f(UserStatus.getResourceId(UserStatus.Active)),
    },
    {
      key: UserStatus.DeActive,
      displayText: f(UserStatus.getResourceId(UserStatus.DeActive)),
    },
    {
      key: UserStatus.Locked,
      displayText: f(UserStatus.getResourceId(UserStatus.Locked)),
    },
    {
      key: UserStatus.WaitingConfirmation,
      displayText: f(UserStatus.getResourceId(UserStatus.WaitingConfirmation)),
    },
  ];

  const roles = isAdmin
    ? [
        {
          key: UserRole.Select,
          displayText: f(UserRole.getResourceId(UserRole.Select)),
        },
        {
          key: UserRole.Admin,
          displayText: f(UserRole.getResourceId(UserRole.Admin)),
        },
        {
          key: UserRole.Manager,
          displayText: f(UserRole.getResourceId(UserRole.Manager)),
        },
        {
          key: UserRole.Internal,
          displayText: f(UserRole.getResourceId(UserRole.Internal)),
        },
        {
          key: UserRole.User,
          displayText: f(UserRole.getResourceId(UserRole.User)),
        },
      ]
    : [
        {
          key: UserRole.Select,
          displayText: f(UserRole.getResourceId(UserRole.Select)),
        },
        {
          key: UserRole.Manager,
          displayText: f(UserRole.getResourceId(UserRole.Manager)),
        },
        {
          key: UserRole.Internal,
          displayText: f(UserRole.getResourceId(UserRole.Internal)),
        },
        {
          key: UserRole.User,
          displayText: f(UserRole.getResourceId(UserRole.User)),
        },
      ];

  const accountTypes = [
    {
      key: AccountType.Select,
      displayText: f(AccountType.getResourceId(AccountType.Select)),
    },
    {
      key: AccountType.Payer,
      displayText: f(AccountType.getResourceId(AccountType.Payer)),
    },
    {
      key: AccountType.SoldTo,
      displayText: f(AccountType.getResourceId(AccountType.SoldTo)),
    },
  ];

  const linkedAccountCompanyCodes = useMemo(
    () =>
      (companyCodes ?? []).map((x) => ({
        key: x.companyCode,
        displayText: x.companyCode,
      })),
    [companyCodes],
  );

  const linkedAccountSalesOrgCodes = useMemo(
    () =>
      (salesOrganizations ?? []).map((x) => ({
        key: x.salesOrganizationCode,
        displayText: x.salesOrganizationCode,
      })),
    [salesOrganizations],
  );

  function handleLoginChange(e: ChangeEvent<HTMLInputElement>) {
    const s = e.currentTarget.value;
    setLogin(s);
    if (s.length > 0) setLoginError('');
  }
  function handleFirstNameChange(e: ChangeEvent<HTMLInputElement>) {
    const s = e.currentTarget.value;
    setFirstName(s);
    if (s.length > 0) setFirstNameError('');
  }
  function handleLastNameChange(e: ChangeEvent<HTMLInputElement>) {
    const s = e.currentTarget.value;
    setLastName(s);
    if (s.length > 0) setLastNameError('');
  }
  function handleEmailChange(e: ChangeEvent<HTMLInputElement>) {
    const s = e.currentTarget.value;
    setEmail(s);
    if (s.length > 0) setEmailError('');
  }
  function handleCompanyChange(e: ChangeEvent<HTMLInputElement>) {
    const s = e.currentTarget.value;
    setCompany(s);
    if (s.length > 0) setCompanyError('');
  }
  function handleStatusChange(e: ChangeEvent<HTMLInputElement>) {
    const s = e.target.value;
    setStatus(s);
    if (s !== UserStatus.Select) setStatusError('');
  }
  function handleAccountTypeChange(e: ChangeEvent<HTMLInputElement>) {
    const s = e.target.value;
    setAccountType(s);
    if (s !== AccountType.Select) setAccountTypeError('');
  }
  function handleRoleChange(e: ChangeEvent<HTMLInputElement>) {
    const s = e.target.value;
    setRole(s);
    if (!UserRole.isEqual(s, UserRole.Select)) setRoleError('');
  }
  function handleEditingPasswordChange(e: ChangeEvent<HTMLInputElement>) {
    const isChecked = e.target.checked;
    setEditingPassword(isChecked);
    if (!isChecked) {
      setPassword('');
      setPasswordError('');
    }
  }
  function handlePasswordChange(e: ChangeEvent<HTMLInputElement>) {
    const s = e.currentTarget.value;
    setPassword(s);
    if (s.length > 0) setPasswordError('');
  }
  function handlePasswordVisibilityMouseDown(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
  }
  function handlePasswordVisibilityClick() {
    setPasswordVisible((visible) => !visible);
  }

  async function fetchAccounts(
    effectiveUserId: string,
    selectedPrimaryAccount?: string,
    forceRefresh = false,
  ) {
    try {
      const requestId = ++accountsLoadRequestIdRef.current;
      const primaryAccountType = user?.primaryAccountType;
      const shouldSyncGlobalState = currentUser?.userId === effectiveUserId;
      const accountsResp = await loadAccounts(
        effectiveUserId,
        forceRefresh,
        shouldSyncGlobalState,
      );

      if (accountsLoadRequestIdRef.current !== requestId) {
        return;
      }

      if (!accountsResp || accountsResp.length === 0) {
        setAccounts([]);
        if (shouldSyncGlobalState) {
          dispatch(setAccountArr([]));
        }
        showToastMessage('info', f('user.account.info.no_account_found'));
        if (shouldSyncGlobalState) {
          dispatch(setAccountSelected({ selectedAccount: null }));
        }
        return;
      }

      setAccounts(accountsResp);
      if (shouldSyncGlobalState) {
        dispatch(setAccountArr(accountsResp));
      }

      const matchedAccount = selectedPrimaryAccount
        ? accountsResp.find((x) => x.primaryAcct === selectedPrimaryAccount)
        : undefined;

      const finalSelectedAccount = matchedAccount ?? accountsResp[0];

      if (!finalSelectedAccount) {
        return;
      }
      if (shouldSyncGlobalState) {
        dispatch(setAccountSelected({ selectedAccount: finalSelectedAccount }));
      }

      const relatedAccounts = finalSelectedAccount.relatedAccounts ?? [];

      if (canMakePayment) {
        const payerAcct = getSelectedSubAccount(
          relatedAccounts,
          primaryAccountType ?? '',
          finalSelectedAccount.primaryAcct,
        );

        if (payerAcct) {
          if (shouldSyncGlobalState) {
            dispatch(setSelectedPayer(payerAcct));
          }
        }
      }
    } catch (error) {
      if (accountsLoadRequestIdRef.current === 0) {
        return;
      }
      showToastMessage(
        'error',
        error instanceof Error ? error.message : 'An unexpected error occurred',
      );
    }
  }

  function getAccounts(
    targetUserId: string,
    selectedPrimaryAccount?: string,
    forceRefresh = false,
  ) {
    return fetchAccounts(targetUserId, selectedPrimaryAccount, forceRefresh);
  }

  async function handleAccountSaved(
    savedUserId: string,
    primaryAccount: string,
  ) {
    await getAccounts(savedUserId, primaryAccount, true);
  }

  function handleAddAccountClick() {
    const effectiveUserId = resolvedUserId || userId;
    const newAccount: Account = {
      userId: effectiveUserId,
      accountId: null,
      primaryAcct: '',
      accountTypeId: 'both',
      companyCode: '',
      division: '',
      salesOrganization: '',
      distributionChannel: '',
    };
    setSelectedAccount(newAccount);
    setIsAccountDialogOpen(true);
  }

  function closeLinkedAccountEditor() {
    setIsAccountDialogOpen(false);
  }

  function handleAccountClick(e: MouseEvent<HTMLButtonElement>): void {
    const existingAccountId: string = e.currentTarget
      .getAttribute('data-id')!
      .valueOf();
    const existingAccount = accounts.filter(
      (a) => a.accountId === existingAccountId,
    )[0];
    setSelectedAccount(existingAccount);
    setIsAccountDialogOpen(true);
  }

  function handleAccountCardSelect(account: Account): void {
    setSelectedAccount(account);
    setIsAccountDialogOpen(true);
  }

  function handleDeleteAccount(accountId: string): void {
    setModalOpen(true);
    setAccountID(accountId);
  }

  const handleOk = async () => {
    const effectiveUserId = resolvedUserId || userId;
    await deleteAccount(effectiveUserId, accountID);
    await getAccounts(effectiveUserId, undefined, true);
    setAccountID('');
  };

  function handleUserSubmit(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();

    let hasError = false;

    if (login.trim().length === 0) {
      setLoginError(f('user.error.loginid'));
      hasError = true;
    }
    if (firstName.trim().length === 0) {
      setFirstNameError(f('user.error.givenname'));
      hasError = true;
    }
    if (lastName.trim().length === 0) {
      setLastNameError(f('user.error.surname'));
      hasError = true;
    }
    if (email.trim().length === 0) {
      setEmailError(f('user.error.email'));
      hasError = true;
    } else if (!emailValidationRegex.test(email.trim().toLowerCase())) {
      setEmailError(f('user.error.email.bad'));
      hasError = true;
    }
    if (company.trim().length === 0) {
      setCompanyError(f('user.error.company'));
      hasError = true;
    }
    if (status === UserStatus.Select) {
      setStatusError(f('user.error.status'));
      hasError = true;
    }
    if (accountType === AccountType.Select) {
      setAccountTypeError(f('user.error.accounttype'));
      hasError = true;
    }
    if (UserRole.isEqual(role, UserRole.Select)) {
      setRoleError(f('user.error.role'));
      hasError = true;
    }

    if (editingPassword) {
      if (password.trim().length === 0) {
        setPasswordError(f('user.error.password'));
        hasError = true;
      } else if (password.trim().length < 8) {
        setPasswordError(
          f('user.password.invalid.message').replace(
            '{minLength}',
            PASSWORD_LENGTH_MIN.toString(),
          ),
        );
        hasError = true;
      } else if (!validatePassword(password)) {
        setPasswordError(
          f('user.password.invalid.message').replace(
            '{minLength}',
            PASSWORD_LENGTH_MIN.toString(),
          ),
        );
        hasError = true;
      }
    }

    if (hasError) return;

    const req: UserAddChangeRequest = {
      userId: resolvedUserId || userId,
      login: login.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      company: company.trim(),
      primaryAccountType: accountType,
      status: status,
      role: role,
      password: password.trim(),
    };

    saveUser(req)
      .then((resp) => {
        if (resp?.emailError) {
          showToastMessage(
            'warning',
            resp.emailError.message ?? f(resp.emailError.code),
          );
        }
        setUserId(resp.userId);
        showToastMessage('success', f('user.action.save.success'));
      })
      .catch((err) => {
        const errMsg = (err.message as string)?.replace('\n', '; ');
        showToastMessage('error', errMsg);
      });
  }

  function handleUserCancel() {
    navigate(-1);
  }

  useEffect(() => {
    const routeUserId =
      location && location.state && location.state.userId
        ? (location.state.userId as string)
        : '';

    setUserId(routeUserId);
    setResolvedUserId('');
    setAccounts([]);
    setSelectedAccount(null);
  }, [location]);

  useEffect(() => {
    if (userId) {
      const requestId = ++userLoadRequestIdRef.current;

      getUserById(userId).then((resp) => {
        if (userLoadRequestIdRef.current !== requestId) {
          return;
        }

        const user = resp as User;
        const effectiveUserId = user.userId || userId;

        setLogin(user.login || '');
        setFirstName(user.firstName || '');
        setLastName(user.lastName || '');
        setCompany(user.company || '');
        setEmail(user.email || '');
        setStatus(user.status || UserStatus.Select);
        setAccountType(user.primaryAccountType || AccountType.Select);
        setRole(UserRole.normalize(user.role) || UserRole.Select);
        setResolvedUserId(effectiveUserId);

        getAccounts(effectiveUserId, undefined, true);
      });
    } else {
      setLogin('');
      setFirstName('');
      setLastName('');
      setCompany('');
      setEmail('');
      setStatus(UserStatus.Select);
      setAccountType(AccountType.Select);
      setRole(
        UserRole.isManager(currentUser?.role)
          ? UserRole.User
          : UserRole.Select,
      );
      setEditingPassword(false);
      setPassword('');
      setResolvedUserId('');
      setAccounts([]);

      setLoginError('');
      setFirstNameError('');
      setLastNameError('');
      setEmailError('');
      setCompanyError('');
      setStatusError('');
      setAccountTypeError('');
      setRoleError('');
      setPasswordError('');
    }
  }, [userId, location, currentUser]);

  return {
    f,
    user,
    userId,
    canManageLinkedAccounts,
    login,
    loginError,
    handleLoginChange,
    firstName,
    firstNameError,
    handleFirstNameChange,
    lastName,
    lastNameError,
    handleLastNameChange,
    email,
    emailError,
    handleEmailChange,
    company,
    companyError,
    handleCompanyChange,
    status,
    statusError,
    handleStatusChange,
    accountType,
    accountTypeError,
    handleAccountTypeChange,
    role,
    roleError,
    handleRoleChange,
    editingPassword,
    handleEditingPasswordChange,
    password,
    passwordError,
    handlePasswordChange,
    passwordVisible,
    handlePasswordVisibilityClick,
    handlePasswordVisibilityMouseDown,
    statuses,
    roles,
    accountTypes,
    handleUserSubmit,
    handleUserCancel,
    accounts,
    selectedAccount,
    isAccountDialogOpen,
    linkedAccountCompanyCodes,
    linkedAccountSalesOrgCodes,
    handleAddAccountClick,
    closeLinkedAccountEditor,
    handleAccountClick,
    handleAccountCardSelect,
    handleDeleteAccount,
    handleAccountSaved,
    modalOpen,
    handleDeleteClose,
    handleOk,
  };
}
