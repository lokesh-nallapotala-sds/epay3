import { useEffect, useMemo, useState } from 'react';

import { useIntl } from 'react-intl';

import { Box } from '@mui/system';
import Grid from '@mui/material/Grid';
import UserRole from 'types/UserRole';
import { useTheme } from '@mui/system';
import Button from '@mui/material/Button';
import { useAppSelector } from 'redux/hooks';
import Typography from '@mui/material/Typography';
import { useAccountsLoader } from 'hooks/useAccountsLoader';
import { useEpayToast } from 'providers/EpayToastProvider';
import { EpayUserService } from 'services/EpayUserService';
import { Account } from 'types/Account';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import {
  impersonatedUserSelector,
  userSelector,
} from 'redux/reducers/userSlice';
import EpayDataTable, {
  EpayDataTableColumnDefinition,
} from 'shared/components/EpayDataTable';

import DeleteConfirmModal from './users/DeleteConfirmModal';
import AddEditUserLinkedAccountDialog from './users/AddEditUserLinkedAccountDialog';
import {
  selectCompanyCodes,
  selectSalesOrganizations,
} from '../../redux/selectors/configSelectors';

interface DeleteAccountHelperProps {
  account: Account;
  handleDeleteAccount: (accountId: string) => void;
}

const getDeleteAccountCellContent = (props: DeleteAccountHelperProps) => {
  const { account, handleDeleteAccount } = props;

  return (
    <Button onClick={() => handleDeleteAccount(account.accountId!)}>
      <DeleteOutlinedIcon />
    </Button>
  );
};

interface LinkedSapAccountsTableSectionProps {
  userId: string;
}

export default function LinkedSapAccountsTableSection(
  props: LinkedSapAccountsTableSectionProps,
) {
  const { userId } = props;

  const theme = useTheme();
  const intl = useIntl();
  const f = (id: string) => intl.formatMessage({ id: id });
  const { showToastMessage } = useEpayToast();

  // Service hooks
  const getUserAccounts = EpayUserService.useGetUserAccount();
  const deleteAccount = EpayUserService.useDeleteAccount();
  const { loadAccounts } = useAccountsLoader();

  // State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [accountID, setAccountID] = useState('');

  const companyCodes = useAppSelector(selectCompanyCodes);
  const salesOrganizations = useAppSelector(selectSalesOrganizations);
  const currentUser = useAppSelector(userSelector);

  const linkedAccountCompanyCodes = useMemo(() => {
    return (companyCodes ?? []).map((x) => ({
      key: x.companyCode,
      displayText: x.companyCode,
    }));
  }, [companyCodes]);

  const linkedAccountSalesOrgCodes = useMemo(() => {
    return (salesOrganizations ?? []).map((x) => ({
      key: x.salesOrganizationCode,
      displayText: x.salesOrganizationCode,
    }));
  }, [salesOrganizations]);

  // Role-based permission logic for impersonated users
  const impersonatedUser = useAppSelector(impersonatedUserSelector);
  const canManageAccounts = impersonatedUser
    ? UserRole.hasRole(
        impersonatedUser.role,
        UserRole.Admin,
        UserRole.Manager,
      )
    : true; // Default for non-impersonated users

  // Dynamic column widths based on whether delete column is present
  const columnWidth = canManageAccounts ? '18%' : '20%';
  const deleteColumnWidth = '10%';

  const accountColumnDefs: EpayDataTableColumnDefinition<Account>[] = [
    {
      header: f('user.account'),
      field: 'primaryAcct',
      sortable: false,
      alignment: 'center',
      width: columnWidth,
      display: { xs: 'none', sm: 'none', md: 'none', lg: 'table-cell' },
    },
    {
      header: f('user.account.companycode'),
      field: 'companyCode',
      sortable: false,
      alignment: 'center',
      width: columnWidth,
      display: { xs: 'none', sm: 'none', md: 'none', lg: 'table-cell' },
    },
    {
      header: f('user.account.salesorg'),
      field: 'salesOrganization',
      sortable: false,
      alignment: 'center',
      width: columnWidth,
      display: { xs: 'none', sm: 'none', md: 'none', lg: 'table-cell' },
    },
    {
      header: f('user.account.channel'),
      field: 'distributionChannel',
      sortable: false,
      alignment: 'center',
      width: columnWidth,
      display: { xs: 'none', sm: 'none', md: 'none', lg: 'table-cell' },
    },
    {
      header: f('user.account.division'),
      field: 'division',
      sortable: false,
      alignment: 'center',
      width: columnWidth,
      display: { xs: 'none', sm: 'none', md: 'none', lg: 'table-cell' },
    },
    // Conditionally include delete column based on role permissions
    ...(canManageAccounts
      ? [
          {
            header: '',
            field: null,
            sortable: false,
            alignment: 'center' as const,
            width: deleteColumnWidth,
            display: { xs: 'none', sm: 'none', md: 'none', lg: 'table-cell' },
            renderer: (account) =>
              getDeleteAccountCellContent({
                account: account,
                handleDeleteAccount: handleDeleteAccount,
              }),
          },
        ]
      : []),
  ];

  // Data fetching
  async function fetchAccounts(userId: string, forceRefresh = false) {
    try {
      const accountsResp =
        currentUser?.userId === userId
          ? await loadAccounts(userId, forceRefresh)
          : ((await getUserAccounts(userId, forceRefresh))?.accounts ?? []);
      setAccounts(accountsResp);

      if (accountsResp.length === 0) {
        showToastMessage('info', f('user.account.info.no_account_found'));
      }
    } catch (error: unknown) {
      showToastMessage(
        'error',
        error instanceof Error ? error.message : 'An unexpected error occurred',
      );
    }
  }

  function getAccounts(userid: string, account?: string, forceRefresh = false) {
    fetchAccounts(userid, forceRefresh);
  }

  // Event handlers
  function handleAddAccountClick() {
    const newAccount: Account = {
      userId: userId,
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

  function handleDeleteAccount(accountId: string): void {
    setModalOpen(true);
    setAccountID(accountId);
  }

  const handleDeleteClose = () => setModalOpen(false);

  const handleOk = () => {
    deleteAccount(userId, accountID).then(() => {
      getAccounts(userId, undefined, true);
      setAccountID('');
      setModalOpen(false);
    });
  };

  function onAccountSaved(userId: string, primaryAccount: string) {
    getAccounts(userId, primaryAccount, true);
  }

  // Effects
  useEffect(() => {
    if (userId) {
      fetchAccounts(userId);
    }
  }, [userId]);

  return (
    <>
      <Box
        sx={{
          '& > div': {
            borderRadius: '12px !important', // Match the existing top radius and apply to all corners
            overflow: 'hidden',
          },
        }}
      >
        <EpayDataTable
          colDefs={accountColumnDefs}
          data={accounts}
          showTotal={false}
          width="100%"
          noDataMessage={f('app.common.nodata')}
          filterSelectors={
            canManageAccounts ? (
              <Grid
                container
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                paddingX="0.375rem"
              >
                <Grid item>
                  <Typography variant="h5"></Typography>
                </Grid>
                <Grid item>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={handleAddAccountClick}
                    sx={{
                      width: 'auto',
                      border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                      '&:hover': {
                        border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                      },
                    }}
                  >
                    {f('user.action.addacct')}
                  </Button>
                </Grid>
              </Grid>
            ) : undefined
          }
        />
      </Box>
      <AddEditUserLinkedAccountDialog
        selectedAccount={selectedAccount}
        companyCodes={linkedAccountCompanyCodes}
        salesOrgCodes={linkedAccountSalesOrgCodes}
        isOpen={isAccountDialogOpen}
        onClose={closeLinkedAccountEditor}
        onAccountSaved={onAccountSaved}
        mode="user"
      />
      <DeleteConfirmModal
        open={modalOpen}
        onClose={handleDeleteClose}
        onOk={handleOk}
        message={f('user_account.confirm_delete_card_message')}
      />
    </>
  );
}
