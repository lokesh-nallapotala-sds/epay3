import { useIntl } from 'react-intl';
import { Box, Typography, useTheme } from '@mui/material';
import EpayBox from '../EpayBox';
import { toCurrencyString, toPaymentCardType } from 'utilities/utilities';

interface PaymentReceiptSummaryCardProps {
  statusLabel?: string;
  invoicePaidAmount: number;
  creditAppliedAmount: number;
  totalChargedAmount: number;
  currencyKey: string;
  paymentMethodType?: string;
  paymentMethodToken?: string;
  paymentMethodLabel?: string;
  regionalFormat?: string | null;
  isError?: boolean;
  printFullWidth?: boolean;
}

interface SummaryItem {
  label: string;
  value: string;
  isSuccess?: boolean;
  isBold?: boolean;
  alignRight?: boolean;
  divider?: boolean;
  gapAfter?: boolean;
}

export default function PaymentReceiptSummaryCard({
  statusLabel,
  invoicePaidAmount,
  creditAppliedAmount,
  totalChargedAmount,
  currencyKey,
  paymentMethodType,
  paymentMethodToken,
  paymentMethodLabel,
  regionalFormat,
  isError = false,
  printFullWidth = false,
}: PaymentReceiptSummaryCardProps) {
  const theme = useTheme();
  const intl = useIntl();

  const getOptionalMessage = (id: string, fallback: string) =>
    intl.messages[id]
      ? intl.formatMessage({ id, defaultMessage: fallback })
      : fallback;
  const formatLabel = (label: string) =>
    label.endsWith(':') ? label : `${label}:`;

  const formattedPaymentMethod =
    paymentMethodLabel ||
    (paymentMethodType && paymentMethodToken
      ? toPaymentCardType(paymentMethodType, paymentMethodToken)
      : paymentMethodType || '');
  const formattedCreditAppliedAmount = `-${toCurrencyString(
    currencyKey || 'USD',
    Math.abs(creditAppliedAmount || 0),
    false,
    regionalFormat,
  )}`;

  const summaryItems: SummaryItem[] = [
    {
      label: getOptionalMessage('invoices.table.status', 'Status'),
      value:
        statusLabel ||
        getOptionalMessage(
          isError
            ? 'payment.summary.payment_error'
            : 'payment.summary.payment_successful',
          isError ? 'Payment Error' : 'Payment Successful',
        ),
      isSuccess: true,
      isBold: true,
    },
    {
      label: getOptionalMessage('payment.method', 'Payment Method'),
      value: formattedPaymentMethod,
      gapAfter: true,
    },
    {
      label: getOptionalMessage(
        'payment.summary.invoices_paid',
        'Invoices Paid',
      ),
      value: toCurrencyString(
        currencyKey || 'USD',
        invoicePaidAmount || 0,
        false,
        regionalFormat,
      ),
      alignRight: true,
    },
    {
      label: getOptionalMessage(
        'payment.summary.credits_applied',
        'Credits Applied',
      ),
      value: formattedCreditAppliedAmount,
      alignRight: true,
    },
    {
      label: getOptionalMessage(
        'payment.summary.total_charged',
        'Total Charged',
      ),
      value: toCurrencyString(
        currencyKey || 'USD',
        totalChargedAmount || 0,
        false,
        regionalFormat,
      ),
      isBold: true,
      alignRight: true,
      divider: true,
    },
  ];

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
      <EpayBox
        sx={{
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          padding: '0px',
          overflow: 'hidden',
          border: '1px solid #DFE1E6',
          borderBottom: `4px solid ${
            isError ? theme.palette.error.label : '#15B938'
          }`,
          ...(printFullWidth && {
            '@media print': {
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              pageBreakInside: 'avoid',
              breakInside: 'avoid',
            },
          }),
        }}
      >
        <Box
          sx={{
            padding: '16px 20px',
            borderBottom: '1px solid',
            borderBottomColor: '#E6E8ED',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {getOptionalMessage('payment.summary.title', 'Summary')}
          </Typography>
        </Box>

        <Box sx={{ padding: '16px 20px 20px' }}>
          {summaryItems.map((item, index) => (
            <Box
              key={item.label}
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'minmax(112px, 42%) minmax(0, 1fr)',
                  sm: '165px minmax(0, 1fr)',
                },
                alignItems: 'start',
                columnGap: '1rem',
                rowGap: '0.35rem',
                minWidth: 0,
                paddingTop: item.divider ? '12px' : 0,
                marginTop: item.divider ? '8px' : 0,
                borderTop: item.divider ? '1px solid #E6E8ED' : 'none',
                marginBottom:
                  index === summaryItems.length - 1
                    ? 0
                    : item.gapAfter
                      ? '32px'
                      : '12px',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: '#8B93A5',
                }}
              >
                {formatLabel(item.label)}
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  color: item.isSuccess
                    ? isError
                      ? theme.palette.error.label
                      : '#0F973D'
                    : '#0D0D12',
                  fontWeight: item.isBold ? 700 : 400,
                  textAlign: item.alignRight ? 'right' : 'left',
                  justifySelf: 'stretch',
                  minWidth: 0,
                  overflowWrap: 'anywhere',
                }}
              >
                {item.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </EpayBox>
    </Box>
  );
}
