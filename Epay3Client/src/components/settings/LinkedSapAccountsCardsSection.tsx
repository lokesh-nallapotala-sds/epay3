import { useEffect, useMemo, useState } from 'react';

import { useIntl } from 'react-intl';

import UserRole from 'types/UserRole';
import { useTheme } from '@mui/system';
import { useAppSelector } from 'redux/hooks';
import AddIcon from '@mui/icons-material/Add';
import { useAccountsLoader } from 'hooks/useAccountsLoader';
import useMediaQuery from '@mui/material/useMediaQuery';
import { userSelector } from 'redux/reducers/userSlice';
import { useEpayToast } from 'providers/EpayToastProvider';
import { EpayUserService } from 'services/EpayUserService';
import { Account } from 'types/Account';
import { Card, CardContent, Grid, Stack, Typography } from '@mui/material';

import AddEditUserLinkedAccountDialog from './users/AddEditUserLinkedAccountDialog';
import {
  selectCompanyCodes,
  selectSalesOrganizations,
} from '../../redux/selectors/configSelectors';

interface LinkedSapAccountsCardsSectionProps {
  userId: string;
}

export default function LinkedSapAccountsCardsSection(
  props: LinkedSapAccountsCardsSectionProps,
) {
  const { userId } = props;

  const theme = useTheme();
  const lgUp = useMediaQuery(theme.breakpoints.up('lg'));
  const intl = useIntl();
  const f = (id: string) => intl.formatMessage({ id: id });
  const { showToastMessage } = useEpayToast();

  const currentUser = useAppSelector(userSelector);

  const canManageAccounts = currentUser
    ? UserRole.hasRole(
        currentUser.role,
        UserRole.Admin,
        UserRole.Manager,
      )
    : false;

  const getUserAccounts = EpayUserService.useGetUserAccount();
  const { loadAccounts } = useAccountsLoader();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);

  const companyCodes = useAppSelector(selectCompanyCodes);
  const salesOrganizations = useAppSelector(selectSalesOrganizations);

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

  function onAccountSaved(userId: string, primaryAccount: string) {
    getAccounts(userId, primaryAccount, true);
    setIsAccountDialogOpen(false);
  }

  useEffect(() => {
    if (userId) {
      fetchAccounts(userId);
    }
  }, [userId]);

  const uniqueAccounts = accounts.reduce((acc: Account[], current) => {
    const exists = acc.find((item) => item.primaryAcct === current.primaryAcct);
    if (!exists) {
      acc.push(current);
    }
    return acc;
  }, []);

  return (
    <>
      <Grid item container>
        <Grid item xs={lgUp ? 6 : 12}>
          {/* Empty left column for spacing - matches ManagePaymentMethodsPage layout */}
        </Grid>
        <Grid item xs={lgUp ? 6 : 12}>
          <Stack direction="column" spacing={1} alignItems="flex-start">
            {uniqueAccounts.length > 0 ? (
              uniqueAccounts.map((account) => (
                <Card
                  key={account.primaryAcct}
                  sx={{
                    width: '100%',
                    border: '1px solid',
                    borderColor: (
                      theme.mixins as { border?: { color?: string } }
                    )?.border?.color,
                    borderRadius: `${theme.shape.borderRadius}px`,
                    boxShadow: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <CardContent
                    sx={{
                      padding: '1rem',
                      '&:last-child': { paddingBottom: '1rem' },
                    }}
                  >
                    <Grid
                      item
                      sx={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        lineHeight: '1.1',
                        marginBottom: '0.4rem',
                      }}
                    >
                      {account.primaryAcct}
                    </Grid>
                    <Grid item>
                      <Typography
                        sx={{
                          alignItems: 'center',
                          fontSize: '14px',
                          lineHeight: '1.1',
                        }}
                      >
                        {account.address?.name || ''}
                      </Typography>
                    </Grid>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                {f('app.common.nodata')}
              </Typography>
            )}
            {canManageAccounts && (
              <Stack
                direction="row"
                alignItems="center"
                sx={{
                  cursor: 'pointer',
                  color: theme.palette.interactiveColor,
                  marginLeft: '.58rem !important',
                }}
                spacing={1}
                onClick={handleAddAccountClick}
              >
                <AddIcon />
                <Typography variant="body2">
                  {f('user.action.addacct')}
                </Typography>
              </Stack>
            )}
          </Stack>
        </Grid>
      </Grid>
      <AddEditUserLinkedAccountDialog
        selectedAccount={selectedAccount}
        companyCodes={linkedAccountCompanyCodes}
        salesOrgCodes={linkedAccountSalesOrgCodes}
        isOpen={isAccountDialogOpen}
        onClose={closeLinkedAccountEditor}
        onAccountSaved={onAccountSaved}
        mode="user"
      />
    </>
  );
}
