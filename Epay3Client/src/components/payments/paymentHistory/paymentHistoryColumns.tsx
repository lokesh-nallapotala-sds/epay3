import { Button, Typography } from '@mui/material';
import { PaymentHistoryRow } from 'types/InvoicesSearchRequest';
import { EpayDataTableColumnDefinition } from 'shared/components/EpayDataTable';
import { toFormattedDateString, toPaymentCardType } from 'utilities/utilities';

const tableLinkButtonSx = {
  padding: 0,
  minWidth: 0,
  justifyContent: 'flex-start',
  textAlign: 'left',
  verticalAlign: 'top',
} as const;

interface BuildPaymentHistoryColumnsParams {
  f: (id: string) => string;
  regionalFormat?: string | null;
  handleSubmit: (data: PaymentHistoryRow) => void;
  handlePaymentDetailsOpen: (data: PaymentHistoryRow) => void;
}

export function buildPaymentHistoryColumns({
  f,
  regionalFormat,
  handleSubmit,
  handlePaymentDetailsOpen,
}: BuildPaymentHistoryColumnsParams): EpayDataTableColumnDefinition<PaymentHistoryRow>[] {
  return [
    {
      header: f('payment_history.doc_number'),
      field: 'documentNumberFinance',
      sortable: true,
      alignment: 'left',
    },
    {
      header: f('payment_history.reference_number'),
      field: 'referenceNumber',
      sortable: true,
      alignment: 'left',
      display: { xs: 'none', sm: 'none', md: 'table-cell' },
    },
    {
      header: f('payment_history.invoice_number'),
      field: 'billingDocumentNumber',
      sortable: true,
      alignment: 'left',
      renderer: (data) =>
        data.billingDocumentNumber === 'Deposit' ? (
          <Typography
            variant="body2"
            sx={{
              height: '32px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {data.billingDocumentNumber?.replace(/^0+/, '') ?? ''}
          </Typography>
        ) : (
          <Button
            variant="link"
            size="small"
            onClick={() => handleSubmit(data)}
            sx={tableLinkButtonSx}
          >
            {data.billingDocumentNumber?.replace(/^0+/, '') ?? ''}
          </Button>
        ),
    },
    {
      header: f('payment_history.date'),
      field: 'documentDate',
      sortable: true,
      alignment: 'left',
      renderer: (data) =>
        data.documentDate
          ? toFormattedDateString(data.documentDate, regionalFormat)
          : '',
    },
    {
      header: f('payment_history.amount'),
      field: 'paidAmount',
      sortable: true,
      alignment: 'left',
      renderer: (data) =>
        data.appliedCreditAmount > 0 ? (
          <Button
            variant="link"
            size="small"
            onClick={() => handlePaymentDetailsOpen(data)}
            sx={tableLinkButtonSx}
          >
            {data.paidAmount}
          </Button>
        ) : (
          data.paidAmount
        ),
    },
    {
      header: f('payment.method'),
      field: 'paymentCardType',
      sortable: true,
      alignment: 'left',
      renderer: (data) =>
        toPaymentCardType(data?.paymentCardType, data?.CardLast4Digit ?? ''),
    },
    {
      header: f('payment_history.account'),
      field: 'soldtoNumber',
      sortable: true,
      alignment: 'left',
    },
  ];
}
