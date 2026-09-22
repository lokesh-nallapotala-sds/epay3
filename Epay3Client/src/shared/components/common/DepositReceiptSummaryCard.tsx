import { useIntl } from 'react-intl';
import { Box, Typography, useTheme } from '@mui/material';
import { toCurrencyString, toPaymentCardType } from 'utilities/utilities';
import EpayBox from '../EpayBox';

interface DepositReceiptSummaryCardProps {
  totalChargedAmount: number;
  currencyKey: string;
  paymentMethodType?: string;
  paymentMethodToken?: string;
  regionalFormat?: string | null;
  statusLabel?: string;
  isError?: boolean;
  printFullWidth?: boolean;
}

interface SummaryItem {
  label: string;
  value: string;
  isStatus?: boolean;
  isBold?: boolean;
  divider?: boolean;
  alignRight?: boolean;
}

export default function DepositReceiptSummaryCard({
  totalChargedAmount,
  currencyKey,
  paymentMethodType,
  paymentMethodToken,
  regionalFormat,
  statusLabel,
  isError = false,
  printFullWidth = false,
}: DepositReceiptSummaryCardProps) {
  const theme = useTheme();
  const intl = useIntl();

  const getOptionalMessage = (id: string, fallback: string) =>
    intl.messages[id]
      ? intl.formatMessage({ id, defaultMessage: fallback })
      : fallback;
  const formatLabel = (label: string) =>
    label.endsWith(':') ? label : `${label}:`;

  const formattedPaymentMethod =
    paymentMethodType && paymentMethodToken
      ? toPaymentCardType(paymentMethodType, paymentMethodToken)
      : paymentMethodType || '';

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
      isStatus: true,
      isBold: true,
    },
    {
      label: getOptionalMessage('payment.method', 'Payment Method'),
      value: formattedPaymentMethod,
    },
  ];

  const footerItem: SummaryItem = {
    label: getOptionalMessage('payment.summary.total_charged', 'Total Charged'),
    value: toCurrencyString(
      currencyKey || 'USD',
      totalChargedAmount || 0,
      false,
      regionalFormat,
    ),
    isBold: true,
    divider: true,
    alignRight: true,
  };

  const renderSummaryItem = (item: SummaryItem, index?: number) => (
    <Box
      key={item.label}
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '145px minmax(0, 1fr)',
          sm: '165px minmax(0, 1fr)',
        },
        alignItems: 'start',
        columnGap: '1rem',
        rowGap: '0.35rem',
        paddingTop: item.divider ? '12px' : 0,
        marginTop: item.divider ? '8px' : 0,
        borderTop: item.divider ? '1px solid #E6E8ED' : 'none',
        marginBottom:
          index == null || index === summaryItems.length - 1 ? 0 : '12px',
      }}
    >
      <Typography variant="body2" sx={{ color: '#8B93A5' }}>
        {formatLabel(item.label)}
      </Typography>

      <Typography
        variant="body2"
        sx={{
          color: item.isStatus
            ? isError
              ? theme.palette.error.label
              : '#0F973D'
            : '#0D0D12',
          fontWeight: item.isBold ? 700 : 400,
          textAlign: item.alignRight ? 'right' : 'left',
          justifySelf: 'stretch',
          wordBreak: 'break-word',
        }}
      >
        {item.value}
      </Typography>
    </Box>
  );

  return (
    <EpayBox
      sx={{
        width: '100%',
        maxWidth: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '0px',
        overflow: 'hidden',
        border: '1px solid #DFE1E6',
        borderBottom: `4px solid ${
          isError ? theme.palette.error.label : '#15B938'
        }`,
        display: 'flex',
        flexDirection: 'column',
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

      <Box
        sx={{
          padding: '16px 20px 20px',
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
        }}
      >
        <Box>
          {summaryItems.map((item, index) => renderSummaryItem(item, index))}
        </Box>
        <Box sx={{ marginTop: 'auto', paddingTop: '32px' }}>
          {renderSummaryItem(footerItem)}
        </Box>
      </Box>
    </EpayBox>
  );
}
