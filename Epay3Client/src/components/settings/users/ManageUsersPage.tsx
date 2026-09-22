import {
  ChangeEvent,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useIntl } from 'react-intl';

import { User, UserView } from 'types/User';
import Box from '@mui/material/Box';
import Ability from 'types/Ability';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import UserStatus from 'types/UserStatus';
import { useTheme } from '@mui/system';
import useEpayNavigate from 'hooks/useEpayNavigate';
import { handleUsersExport } from 'utilities/utilities';
import { useEpayToast } from 'providers/EpayToastProvider';
import { EpayUserService } from 'services/EpayUserService';
import { userHasAbility } from 'redux/reducers/userSlice';
import { useAppSelector } from 'redux/hooks';
import EpayPageHeaderText from 'shared/components/EpayPageHeaderText';
import { useImpersonation } from 'providers/EpayImpersonationProvider';
import EpayDataTable from 'shared/components/EpayDataTable';
import {
  selectImpersonatedAccountState as impersonatedUserSelector,
  selectUserState as userSelector,
} from 'redux/selectors/uiSelectors';

import UserCardList from './UserCardList';
import UserRole from '../../../types/UserRole';
import DeleteConfirmModal from '../users/DeleteConfirmModal';
import { buildUserColumns } from './UserTableColumns';
import { UserFilters, IUserFilterOptions } from './UserFilters';

const USER_LIST_DEFAULT_SORT = { field: 'login', direction: 'asc' } as const;

function ManageUsersPage() {
  const theme = useTheme();

  const { navigate } = useEpayNavigate();

  const intl = useIntl();
  const f = (id) => intl.formatMessage({ id: id });
  const [modalOpen, setModalOpen] = useState(false);
  const [userID, setUserID] = useState('');
  const handleDeleteClose = () => setModalOpen(false);
  const { showToastMessage } = useEpayToast();

  const getUsers = EpayUserService.useGetUsers();
  const deleteUser = EpayUserService.useDeleteUser();
  const { impersonate, unimpersonate } = useImpersonation();

  const roles = [
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
  ];

  const statuses = [
    {
      key: UserStatus.All,
      displayText: f(UserStatus.getResourceId(UserStatus.All)),
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

  const [usersAll, setUsersAll] = useState<UserView[]>([]);
  const [searchText, setSearchText] = useState<string>('');
  const userFilterInitial: IUserFilterOptions = {
    searchText: '',
    status: UserStatus.All,
    role: UserRole.Select,
  };
  const [userFilter, setUserFilter] =
    useState<IUserFilterOptions>(userFilterInitial);
  const deferredSearchText = useDeferredValue(searchText);

  const currentUser = useAppSelector(userSelector);
  const canViewUsers = userHasAbility(currentUser, Ability.ViewUsers);
  const canManageUsers = userHasAbility(currentUser, Ability.ManageUsers);
  const canImpersonate = userHasAbility(currentUser, Ability.Impersonate);
  const impersonatedUserId =
    useAppSelector(impersonatedUserSelector)?.userId ?? '';

  function loadUserList() {
    if (!canViewUsers) {
      return;
    }
    getUsers().then((userList: UserView[]) => {
      setUsersAll(userList);
    });
  }

  function handleUserSearchTextChange(e: ChangeEvent<HTMLInputElement>) {
    const s = e.currentTarget.value;
    setSearchText(s);
  }

  function handleStatusSelected(e: ChangeEvent<HTMLInputElement>) {
    const s = e.target.value;
    setUserFilter({ ...userFilter, status: s });
  }

  function handleRoleSelected(e: ChangeEvent<HTMLInputElement>) {
    const r = e.target.value;
    setUserFilter({ ...userFilter, role: r });
  }

  const usersFiltered = useMemo(() => {
    let filteredUsers = usersAll.slice();

    const theStatus = (userFilter.status || '').toLowerCase();
    if (!!theStatus && theStatus !== UserStatus.All) {
      filteredUsers = filteredUsers.filter((u) => u.status === theStatus);
    }

    const theRole = UserRole.normalize(userFilter.role);
    if (!!theRole && !UserRole.isEqual(theRole, UserRole.Select)) {
      filteredUsers = filteredUsers.filter((u) =>
        UserRole.isEqual(u.role, theRole),
      );
    }

    const terms = (deferredSearchText || '').toLowerCase().split(' ');
    for (const theTerm of terms) {
      if (!theTerm) continue;

      filteredUsers = filteredUsers.filter(
        (u) =>
          (u.lastName || '').toLowerCase().indexOf(theTerm) >= 0 ||
          (u.firstName || '').toLowerCase().indexOf(theTerm) >= 0 ||
          (u.login || '').toLowerCase().indexOf(theTerm) >= 0 ||
          (u.email || '').toLowerCase().indexOf(theTerm) >= 0 ||
          (u.role || '').toLowerCase().indexOf(theTerm) >= 0 ||
          (u.linkedAccounts || []).some(
            (sa) =>
              (sa.primaryAccount || '').toLowerCase().includes(theTerm) ||
              (sa.name || '').toLowerCase().includes(theTerm),
          ),
      );
    }

    return filteredUsers;
  }, [deferredSearchText, userFilter.role, userFilter.status, usersAll]);

  function handleAddUserClick() {
    navigate('/settings/users/add');
  }

  function handleExportData(option: string) {
    handleUsersExport(
      option as 'csv' | 'excel',
      usersFiltered as unknown as Record<string, unknown>[],
    );
  }

  function handleUserClick(user: UserView) {
    navigate('/settings/users/edit', { state: { userId: `${user.userId}` } });
  }

  function handleDeleteClick(userId: string) {
    setModalOpen(true);
    setUserID(userId);
  }

  const handleOk = () => {
    deleteUser(userID)
      .then(() => {
        loadUserList();
      })
      .catch((err) => {
        showToastMessage('error', err.message);
      });
  };

  function handleImpersonateClick(userId: string) {
    if (!!impersonatedUserId && impersonatedUserId === userId) {
      unimpersonate();
    } else {
      impersonate(userId);
    }
  }

  useEffect(() => {
    loadUserList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewUsers]);

  if (!currentUser) {
    return null;
  }

  const columnDefs = buildUserColumns({
    f,
    theme,
    currentUser,
    impersonatedUserId,
    canImpersonate,
    canManageUsers,
    handleUserClick,
    handleImpersonateClick,
    handleDeleteClick,
  });

  return (
    <Box display="flex" width="100%">
      <Grid container direction="column" rowGap="1rem">
        <Grid item>
          <Box display="flex" width="100%" paddingY="1rem">
            <Grid
              container
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Grid item>
                <EpayPageHeaderText
                  header={f('header.usermanagement')}
                  subheader={f('user.management.subheader')}
                />
              </Grid>
              <Grid item>
                <Button
                  variant="contained"
                  color="primary"
                  size="medium"
                  onClick={handleAddUserClick}
                  disabled={!canManageUsers}
                  sx={{
                    width: '180px',
                    ...(canManageUsers && {
                      border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                      '&:hover': {
                        border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                      },
                    }),
                  }}
                >
                  {f('user.action.add')}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Grid>
        <Grid item display={{ xs: 'none', md: 'block' }}>
          <Box>
            <EpayDataTable
              data={usersFiltered}
              colDefs={columnDefs}
              defaultSort={USER_LIST_DEFAULT_SORT}
              noDataMessage={f('app.common.nodata')}
              width="100%"
              filterSelectors={
                <UserFilters
                  searchText={searchText}
                  userFilter={userFilter}
                  statuses={statuses}
                  roles={roles}
                  onSearchChange={handleUserSearchTextChange}
                  onStatusChange={handleStatusSelected}
                  onRoleChange={handleRoleSelected}
                  onExport={handleExportData}
                />
              }
            />
          </Box>
        </Grid>
        <Grid item display={{ xs: 'block', md: 'none' }}>
          <UserCardList
            data={usersFiltered as unknown as User[]}
            width="100%"
            colDefs={columnDefs}
            noDataMessage={f('invoices.nodata')}
            filterSelectors={
              <UserFilters
                isMobile
                searchText={searchText}
                userFilter={userFilter}
                statuses={statuses}
                roles={roles}
                onSearchChange={handleUserSearchTextChange}
                onStatusChange={handleStatusSelected}
                onRoleChange={handleRoleSelected}
                onExport={handleExportData}
              />
            }
          />
        </Grid>
      </Grid>
      <DeleteConfirmModal
        open={modalOpen}
        onClose={handleDeleteClose}
        onOk={handleOk}
        message={f('user.confirm_delete_card_message')}
      />
    </Box>
  );
}

export default ManageUsersPage;
