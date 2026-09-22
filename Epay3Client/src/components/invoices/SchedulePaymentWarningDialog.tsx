import {
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useIntl } from 'react-intl';
import EpayScheduleDialog from 'shared/components/EpayScheduleDialog';
import { Invoice } from '../../types';
import { useTheme } from '@mui/system';
import { useAppSelector } from 'redux/hooks';
import { regionalFormatSelector } from 'redux/reducers';
import {
  toCurrencyString,
  toFormattedDateString,
} from '../../utilities/utilities';
import {
  epayModalTableBodyCellSx,
  epayModalTableContainerSx,
  epayModalTableHeaderCellSx,
  epayModalTableSx,
} from 'shared/components/EpayModalLayout';

interface SchedulePaymentWarningDialogProps {
  open: boolean;
  onClose: () => void;
  onDeleteAndProceed: () => void;
  scheduledInvoices?: Invoice[];
  message1?: string;
  message2?: string;
  message3?: string;
}

const SchedulePaymentWarningDialog = ({
  open,
  onClose,
  onDeleteAndProceed,
  scheduledInvoices = [],
  message1,
  message2,
  message3,
}: SchedulePaymentWarningDialogProps) => {
  const intl = useIntl();
  const theme = useTheme();
  const regionalFormat = useAppSelector(regionalFormatSelector);
  const f = (id: string, defaultMessage?: string) =>
    intl.formatMessage({ id, defaultMessage: defaultMessage || id });
  const errorTableValueSx = {
    ...epayModalTableBodyCellSx,
    color: `${theme.palette.error.main} !important`,
  };

  const actions = [
    <Button key="cancel" variant="outlined" color="secondary" onClick={onClose}>
      {f('app.common.cancel', 'Cancel')}
    </Button>,
    <Button
      key="deleteProceed"
      variant="contained"
      color="primary"
      onClick={onDeleteAndProceed}
      sx={{
        border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
        '&:hover': {
          border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
        },
      }}
    >
      {f('schedule.warning.deleteProceed', 'Delete and Proceed')}
    </Button>,
  ];

  return (
    <EpayScheduleDialog
      open={open}
      onClose={onClose}
      title={f('schedule.warning.title', 'Scheduled Payments Warning')}
      actions={actions}
    >
      <Grid item container flex={'column'} sm={12} lg={12} spacing={1}>
        <Grid item xs={12} sm={12} lg={12}>
          <Typography variant="fieldHeader">
            {message1 ||
              f(
                'schedule.warning.message1',
                'You have selected one or more documents that are currently scheduled for payment. In order to make a manual payment, the related schedule ID(s) must be deleted.',
              )}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={12} lg={12}>
          <Typography variant="fieldHeader">
            {message2 ||
              f(
                'schedule.warning.message2',
                'The following documents are included in a related schedule ID:',
              )}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={12} lg={12}>
          <Grid sx={{ marginTop: 2 }}>
            <Grid sx={epayModalTableContainerSx}>
              <Table size="small" sx={epayModalTableSx}>
                <TableHead
                  sx={{
                    '& .MuiTableCell-head': {
                      borderBottom: (theme) =>
                        `1px solid ${theme.mixins.border.color}`,
                    },
                  }}
                >
                  <TableRow>
                    <TableCell
                      sx={{
                        width: '25%',
                        borderBottom: (theme) =>
                          `1px solid ${theme.mixins.border.color} !important`,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={epayModalTableHeaderCellSx}
                      >
                        {f('schedule.warning.table.schId', 'SchID')}
                      </Typography>
                    </TableCell>
                    <TableCell
                      sx={{
                        width: '25%',
                        borderBottom: (theme) =>
                          `1px solid ${theme.mixins.border.color} !important`,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={epayModalTableHeaderCellSx}
                      >
                        {f('schedule.warning.table.document', 'Document')}
                      </Typography>
                    </TableCell>
                    <TableCell
                      sx={{
                        width: '25%',
                        borderBottom: (theme) =>
                          `1px solid ${theme.mixins.border.color} !important`,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={epayModalTableHeaderCellSx}
                      >
                        {f('schedule.warning.table.date', 'Date')}
                      </Typography>
                    </TableCell>
                    <TableCell
                      sx={{
                        width: '25%',
                        borderBottom: (theme) =>
                          `1px solid ${theme.mixins.border.color} !important`,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={epayModalTableHeaderCellSx}
                      >
                        {f('schedule.warning.table.amount', 'Amount')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scheduledInvoices.map((invoice, idx) => {
                    const amountToProcess =
                      invoice.scheduledIdDetails?.scheduledDocument
                        ?.amountToProcess;

                    return (
                      <TableRow
                        key={`${invoice.scheduledId ?? 'schedule'}-${idx}`}
                      >
                        <TableCell>
                          <Typography variant="body2" sx={errorTableValueSx}>
                            {invoice.scheduledId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={errorTableValueSx}>
                            {invoice.billingDocumentNumber?.replace(/^0+/, '')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={errorTableValueSx}>
                            {invoice.scheduledDate
                              ? toFormattedDateString(
                                  invoice.scheduledDate,
                                  regionalFormat,
                                )
                              : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={errorTableValueSx}>
                            {amountToProcess !== undefined &&
                            amountToProcess !== null
                              ? toCurrencyString(
                                  invoice.currencyKey || 'USD',
                                  amountToProcess,
                                  false,
                                  regionalFormat,
                                )
                              : '-'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} sm={12} lg={12} sx={{ marginTop: '5px' }}>
          <Typography variant="fieldHeader">
            {message3 ||
              f(
                'schedule.warning.message3',
                'Would you like to delete the schedule ID(s) listed above and proceed to make a manual payment?',
              )}
          </Typography>
        </Grid>
      </Grid>
    </EpayScheduleDialog>
  );
};

export default SchedulePaymentWarningDialog;
