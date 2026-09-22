import { Invoice } from 'types';
import { useIntl } from 'react-intl';

import Ability from 'types/Ability';
import { Button, Grid } from '@mui/material';
import Waiter from 'components/waiter/Waiter';
import EpayBox from 'shared/components/EpayBox';
import EpayDialog from 'shared/components/EpayDialog';
import { useAppSelector } from 'redux/hooks';
import { userHasAbility, userSelector } from 'redux/reducers';
import { useTheme } from '@mui/material/styles';
import InvoiceDetailPage from './InvoiceDetailPage';
import { ReactNode } from 'react';

interface InvoiceDialogProps {
  open: boolean;
  onClose: () => void;
  onPayInvoice?: () => void;
  payInvoiceLabelId?: string;
  selectedInvoice?: Invoice;
}

const InvoiceDialog = ({
  open,
  onClose,
  onPayInvoice,
  payInvoiceLabelId = 'invoice.detail.payinvoice',
  selectedInvoice,
}: InvoiceDialogProps) => {
  const intl = useIntl();
  const theme = useTheme();
  const f = (id: string) => intl.formatMessage({ id, defaultMessage: id });
  const user = useAppSelector(userSelector);
  if (!user) {
    return null;
  }
  const canMakePayment = userHasAbility(user, Ability.MakePayment);
  const isInvoiceOpen =
    selectedInvoice?.invoiceStatus?.toLowerCase() === 'open';
  const showPrimaryAction =
    Boolean(onPayInvoice) && canMakePayment && isInvoiceOpen;

  const getActions = (showPayInvoiceBtn: boolean): ReactNode[] => {
    const actions = [
      <Button
        variant="outlined"
        color="secondary"
        sx={{
          width: {
            xs: '100%',
            sm: '14rem',
          },
          minWidth: 0,
          px: { xs: 1.5, sm: 2 },
          fontSize: { xs: '0.875rem', sm: '1rem' },
          whiteSpace: 'nowrap',
        }}
        onClick={onClose}
      >
        {showPayInvoiceBtn ? f('app.common.cancel') : f('app.common.close')}
      </Button>,
    ];
    if (showPayInvoiceBtn && onPayInvoice) {
      actions.push(
        <Button
          variant="contained"
          color="primary"
          sx={{
            width: {
              xs: '100%',
              sm: '14rem',
            },
            minWidth: 0,
            px: { xs: 1.5, sm: 2 },
            fontSize: { xs: '0.875rem', sm: '1rem' },
            border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
            '&:hover': {
              border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
            },
            whiteSpace: 'nowrap',
          }}
          onClick={onPayInvoice}
        >
          {f(payInvoiceLabelId)}
        </Button>,
      );
    }
    return actions;
  };

  return (
    <EpayDialog
      open={open}
      onClose={onClose}
      title={f('header.invoicedetails')}
      actions={getActions(showPrimaryAction)}
      actionsSx={{
        gap: { xs: 1, sm: 2 },
        px: { xs: 2, sm: 3 },
        '& > .MuiBox-root': {
          flex: { xs: '1 1 0', sm: '0 0 auto' },
          minWidth: 0,
        },
      }}
      bodyVariant="form"
      fullScreenOnMobile={false}
      scrollMode="paper"
      paperSx={{
        width: { xs: 'calc(100% - 32px)', sm: 'auto' },
        maxHeight: { xs: 'calc(100dvh - 48px)', sm: 'none' },
        margin: { xs: '24px auto', sm: '32px' },
      }}
    >
      <EpayBox sx={{ borderWidth: '0px' }}>
        <Waiter />
        <Grid container direction={'column'}>
          <InvoiceDetailPage invoiceData={selectedInvoice as Invoice} />
        </Grid>
      </EpayBox>
    </EpayDialog>
  );
};

export default InvoiceDialog;
