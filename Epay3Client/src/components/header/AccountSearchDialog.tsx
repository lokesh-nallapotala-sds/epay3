import { Button, Grid } from '@mui/material';
import Waiter from 'components/waiter/Waiter';
import EpayBox from 'shared/components/EpayBox';
import EpayDialog from 'shared/components/EpayDialog';
import { useAppSelector } from 'redux/hooks';
import { userSelector } from 'redux/reducers';
import { ReactNode } from 'react';
import AccountSearchPage from './AccountSearchPage';
import { Account } from '../../types/Account';
import { useFormat } from 'hooks/useFormat';

interface AccountSearchDialogProps {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
  onAccountSelect: (account: Account) => void;
}

const AccountSearchDialog = ({
  open,
  onClose,
  accounts,
  onAccountSelect,
}: AccountSearchDialogProps) => {
  const f = useFormat();
  const user = useAppSelector(userSelector);
  if (!user) {
    return null;
  }

  const getActions = (): ReactNode[] => {
    const actions = [
      <Button
        variant="outlined"
        color="secondary"
        sx={{
          width: {
            xs: '9rem',
            sm: '12rem',
          },
        }}
        onClick={onClose}
      >
        {f('app.common.cancel')}
      </Button>,
    ];

    return actions;
  };

  return (
    <EpayDialog
      open={open}
      onClose={onClose}
      title={f('header.accountsearch')}
      actions={getActions()}
      titleAsH1
      bodyVariant="form"
      fullScreenOnMobile={false}
      paperSx={{
        width: { xs: 'calc(100% - 32px)', sm: 'auto' },
        maxHeight: { xs: 'calc(100dvh - 32px)', sm: 'none' },
        margin: { xs: '16px auto', sm: '32px' },
      }}
    >
      <EpayBox
        sx={{
          borderWidth: '0px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Waiter />
        <Grid
          container
          direction={'column'}
          sx={{
            height: '100%',
            width: '100%',
            marginRight: { xs: 0, sm: '-10px' },
            marginLeft: { xs: 0, sm: '-10px' },
          }}
        >
          <AccountSearchPage
            accountData={accounts ?? []}
            onAccountSelect={onAccountSelect}
          />
        </Grid>
      </EpayBox>
    </EpayDialog>
  );
};

export default AccountSearchDialog;
