import { useCallback, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { DepositDetails } from 'types/DepositDetails';
import { useAppSelector } from 'redux/hooks';
import { regionalFormatSelector } from 'redux/reducers';
import { toFormattedDateString } from 'utilities/utilities';
import { Box } from '@mui/material';
import { useEpayToast } from '../../../providers/EpayToastProvider';
import DepositReceiptSummaryCard from './DepositReceiptSummaryCard';
import PaymentReceiptDetailsCard from './PaymentReceiptDetailsCard';

interface DepositResponse {
  payed?: {
    documentNumberFinance?: string;
    authorizationReferenceCode?: string;
    currencyKey?: string;
  }[];
  emailError?: { code: string };
}

function DepositStatus({
  depositDetails,
  response,
  payment,
  isError,
  detailUserId,
  printFullWidthCards = false,
}: {
  depositDetails: DepositDetails;
  response: DepositResponse;
  payment: {
    paymentCardType?: string;
    cardType?: string;
    paymentCardToken?: string;
    token?: string;
    cardLast4Digit?: string;
  };
  isError: boolean;
  detailUserId?: string;
  printFullWidthCards?: boolean;
}) {
  const printContentWidth = '186mm';
  const intl = useIntl();
  const regionalFormat = useAppSelector(regionalFormatSelector);
  const { showToastMessage } = useEpayToast();
  const f = useCallback(
    (id: string, defaultMessage?: string) =>
      intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const document = response?.payed?.[0] ?? {};
  const today = new Date();
  const totalChargedAmount = isError
    ? 0
    : Number(depositDetails?.amountToProcess ?? 0);
  const paymentMethodType = payment?.paymentCardType || payment?.cardType;
  const paymentMethodLast4 = payment?.cardLast4Digit;
  const formatDetailsLabel = (label: string) => label.replace(/\s*#\s*$/, '');
  const detailRows = [
    {
      label: f('payment.date', 'Date'),
      value: toFormattedDateString(today, regionalFormat),
    },
    {
      label: formatDetailsLabel(f('invoices.table.document', 'Document')),
      value: isError ? '' : (document.documentNumberFinance ?? ''),
    },
    {
      label: formatDetailsLabel(f('invoices.table.reference', 'Reference')),
      value: isError ? '' : (document.authorizationReferenceCode ?? ''),
    },
    {
      label: f('payment.summary.user_id', 'User ID'),
      value: detailUserId ?? '',
    },
  ];

  useEffect(() => {
    if (response?.emailError) {
      showToastMessage('warning', f(response.emailError.code));
    }
  }, [f, response?.emailError, showToastMessage]);

  return (
    <Box
      sx={{
        display: 'grid',
        width: '100%',
        maxWidth: '100%',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
        gap: { xs: 2, md: 3 },
        alignItems: 'stretch',
        ...(printFullWidthCards && {
          '@media print': {
            gridTemplateColumns: '1fr',
            gap: '1.25rem',
            width: printContentWidth,
            minWidth: printContentWidth,
            maxWidth: printContentWidth,
            boxSizing: 'border-box',
          },
        }),
      }}
    >
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          maxWidth: '100%',
          ...(printFullWidthCards && {
            '@media print': {
              width: '100%',
              minWidth: '100%',
              maxWidth: '100%',
            },
          }),
        }}
      >
        <DepositReceiptSummaryCard
          statusLabel={
            isError
              ? f('payment.summary.payment_error', 'Payment Error')
              : f('payment.summary.payment_successful', 'Payment Successful')
          }
          totalChargedAmount={totalChargedAmount}
          currencyKey={
            document.currencyKey || depositDetails?.currencyKey || 'USD'
          }
          paymentMethodType={paymentMethodType}
          paymentMethodToken={paymentMethodLast4}
          regionalFormat={regionalFormat}
          isError={isError}
          printFullWidth={printFullWidthCards}
        />
      </Box>

      <Box
        sx={{
          display: 'flex',
          width: '100%',
          maxWidth: '100%',
          ...(printFullWidthCards && {
            '@media print': {
              width: '100%',
              minWidth: '100%',
              maxWidth: '100%',
            },
          }),
        }}
      >
        <PaymentReceiptDetailsCard
          title={f('payment.details', 'Details')}
          rows={detailRows}
          printFullWidth={printFullWidthCards}
        />
      </Box>
    </Box>
  );
}

export default DepositStatus;
