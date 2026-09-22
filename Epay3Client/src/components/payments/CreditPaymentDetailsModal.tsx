import { useMemo } from 'react';

import { useIntl } from 'react-intl';

import {
  Box,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useAppSelector } from 'redux/hooks';
import { regionalFormatSelector } from 'redux/reducers';
import EpayBox from 'shared/components/EpayBox';
import EpayDialog from 'shared/components/EpayDialog';
import {
  epayModalTableBodyCellSx,
  epayModalTableContainerSx,
  epayModalTableHeaderCellSx,
  epayModalTableSx,
} from 'shared/components/EpayModalLayout';
import { PaymentHistoryRow } from 'types/InvoicesSearchRequest';
import {
  removeLeadingZeros,
  toCurrencyString,
  toFormattedDateString,
  toPaymentCardType,
} from 'utilities/utilities';

interface CreditPaymentDetailsModalProps {
  open: boolean;
  onClose: () => void;
  selectedPayment?: PaymentHistoryRow;
}

type PaymentDetailRow = {
  invoiceNumber: string;
  amount: number;
  paymentMethod: string;
};

const columnWidths = {
  invoice: '33%',
  amount: '33%',
  method: '34%',
};

const CreditPaymentDetailsModal = ({
  open,
  onClose,
  selectedPayment,
}: CreditPaymentDetailsModalProps) => {
  const intl = useIntl();
  const regionalFormat = useAppSelector(regionalFormatSelector);
  const f = (id: string, defaultMessage: string) =>
    intl.formatMessage({ id, defaultMessage });
  const closeLabel = intl.formatMessage({
    id: 'app.common.close',
    defaultMessage: 'Close',
  });
  const title = intl.formatMessage({
    id: 'payment_history.payment_details',
    defaultMessage: 'Payment Details',
  });
  const paymentMethod = useMemo(() => {
    const payment = selectedPayment?.paymentData;

    if (!payment?.paymentCardType && !payment?.paymentCardToken) {
      return payment?.paymentMethod ?? '';
    }

    return toPaymentCardType(
      payment.paymentCardType ?? '',
      payment.cardLast4Digit ?? '',
    );
  }, [selectedPayment]);

  const detailRows = useMemo<PaymentDetailRow[]>(() => {
    if (!selectedPayment) {
      return [];
    }

    const invoiceNumber = removeLeadingZeros(
      selectedPayment.billingDocumentNumber,
    );
    const payment = selectedPayment.paymentData;

    return [
      {
        invoiceNumber,
        amount: Number(payment?.paidAmount ?? 0),
        paymentMethod,
      },
      {
        invoiceNumber,
        amount: Number(selectedPayment.appliedCreditAmount ?? 0),
        paymentMethod: f('payment_history.applied_credits', 'Applied Credits'),
      },
    ];
  }, [f, paymentMethod, selectedPayment]);

  const detailColumnTemplate = {
    xs: '1fr',
    sm: `${columnWidths.invoice} ${columnWidths.amount} ${columnWidths.method}`,
  };

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
      {closeLabel}
    </Button>,
  ];

  return (
    <EpayDialog
      open={open}
      onClose={onClose}
      title={title}
      actions={actions}
      maxWidth="sm"
      bodyVariant="form"
      paperSx={{
        width: {
          sm: '640px',
          md: '680px',
        },
      }}
    >
      <EpayBox sx={{ borderWidth: '0px' }}>
        <Grid container direction="column">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: detailColumnTemplate,
                rowGap: 1,
                width: '100%',
                alignItems: 'start',
              }}
            >
              <Box sx={{ gridColumn: { xs: '1', sm: '1' } }}>
                <Typography
                  variant="textHeader"
                  sx={{ marginBottom: '0.25rem', display: 'block' }}
                >
                  {f(
                    'payment_history.payment_document_number',
                    'Payment Document #:',
                  )}
                </Typography>
                <Typography variant="fieldValue">
                  {removeLeadingZeros(
                    selectedPayment?.documentNumberFinance ?? '',
                  )}
                </Typography>
              </Box>

              <Box sx={{ display: { xs: 'none', sm: 'block' } }} />

              <Box
                sx={{
                  gridColumn: { xs: '1', sm: '3' },
                  pl: { xs: 0, sm: '10px' },
                }}
              >
                <Typography
                  variant="textHeader"
                  sx={{ marginBottom: '0.25rem', display: 'block' }}
                >
                  {f('payment_history.date', 'Date:')}
                </Typography>
                <Typography variant="fieldValue">
                  {selectedPayment?.documentDate
                    ? toFormattedDateString(
                        selectedPayment.documentDate,
                        regionalFormat,
                      )
                    : ''}
                </Typography>
              </Box>
            </Box>

            <Box sx={epayModalTableContainerSx}>
              <Table size="small" sx={epayModalTableSx}>
                <TableHead
                  sx={{
                    '& .MuiTableCell-head': {
                      borderBottom: (theme) =>
                        `1px solid ${theme.mixins.border.color} !important`,
                    },
                  }}
                >
                  <TableRow>
                    <TableCell
                      sx={{
                        width: { sm: columnWidths.invoice },
                        borderBottom: (theme) =>
                          `1px solid ${theme.mixins.border.color} !important`,
                      }}
                    >
                      <Typography
                        variant="body2"
                        noWrap
                        sx={epayModalTableHeaderCellSx}
                      >
                        {f('payment_history.invoice_number', 'Invoice')}
                      </Typography>
                    </TableCell>
                    <TableCell
                      sx={{
                        width: { sm: columnWidths.amount },
                        borderBottom: (theme) =>
                          `1px solid ${theme.mixins.border.color} !important`,
                      }}
                    >
                      <Typography
                        variant="body2"
                        noWrap
                        sx={epayModalTableHeaderCellSx}
                      >
                        {f('payment_history.amount', 'Payment Amount')}
                      </Typography>
                    </TableCell>
                    <TableCell
                      sx={{
                        width: { sm: columnWidths.method },
                        borderBottom: (theme) =>
                          `1px solid ${theme.mixins.border.color} !important`,
                      }}
                    >
                      <Typography
                        variant="body2"
                        noWrap
                        sx={epayModalTableHeaderCellSx}
                      >
                        {f('payment.method', 'Payment Method')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detailRows.map((row, index) => (
                    <TableRow
                      key={`${row.invoiceNumber}-${index}`}
                      sx={{
                        '&:last-child .MuiTableCell-root': {
                          borderBottom: 'none',
                        },
                      }}
                    >
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={epayModalTableBodyCellSx}
                        >
                          {row.invoiceNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={epayModalTableBodyCellSx}
                        >
                          {toCurrencyString(
                            selectedPayment?.paymentData.currencyKey ??
                              selectedPayment?.currencyKey ??
                              'USD',
                            row.amount,
                            false,
                            regionalFormat,
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={epayModalTableBodyCellSx}
                        >
                          {row.paymentMethod}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Box>
        </Grid>
      </EpayBox>
    </EpayDialog>
  );
};

export default CreditPaymentDetailsModal;
