import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Account } from 'types/Account';
import EpayDataTable, {
  EpayDataTableColumnDefinition,
} from 'shared/components/EpayDataTable';

import LinkedAccountsCardList from '../LinkedAccountsCardList';

interface LinkedAccountsSectionProps {
  f: (id: string) => string;
  userId: string;
  accounts: Account[];
  accountColumnDefs: EpayDataTableColumnDefinition<Account>[];
  canManageLinkedAccounts: boolean;
  onAddAccountClick: () => void;
  onAccountCardSelect: (account: Account) => void;
  onDeleteAccount: (accountId: string) => void;
}

export default function LinkedAccountsSection({
  f,
  userId,
  accounts,
  accountColumnDefs,
  canManageLinkedAccounts,
  onAddAccountClick,
  onAccountCardSelect,
  onDeleteAccount,
}: LinkedAccountsSectionProps) {
  const theme = useTheme();

  const linkedAccountsHeader = (
    <Grid
      container
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      paddingX="0.375rem"
    >
      <Grid item>
        <Typography variant="h5">{f('user.linkedaccounts')}</Typography>
      </Grid>
      <Grid item>
        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={onAddAccountClick}
          disabled={!canManageLinkedAccounts}
          sx={{
            width: 'auto',
            ...(canManageLinkedAccounts && {
              border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
              '&:hover': {
                border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
              },
            }),
          }}
        >
          {f('user.action.addacct')}
        </Button>
      </Grid>
    </Grid>
  );

  if (!userId) {
    return null;
  }

  return (
    <>
      <Grid item display={{ xs: 'none', lg: 'block' }}>
        <EpayDataTable
          colDefs={accountColumnDefs}
          data={accounts}
          showTotal={false}
          width="100%"
          noDataMessage={f('app.common.nodata')}
          filterSelectors={linkedAccountsHeader}
        />
      </Grid>
      <Grid item display={{ xs: 'block', lg: 'none' }}>
        <LinkedAccountsCardList
          accounts={accounts}
          header={linkedAccountsHeader}
          noDataMessage={f('app.common.nodata')}
          canManageAccounts={canManageLinkedAccounts}
          onAccountSelect={onAccountCardSelect}
          onAccountDelete={onDeleteAccount}
        />
      </Grid>
    </>
  );
}
