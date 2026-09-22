import { useIntl } from 'react-intl';

import { useTheme } from '@mui/system';
import { Typography } from '@mui/material';
import { toFormattedDateString, toPaymentCardType } from 'utilities/utilities';
import { PaymentHistoryRow } from 'types/InvoicesSearchRequest';
import {
  MobileCardFieldGrid,
  MobileCardFieldRowProps,
  MobileCardHeader,
  MobileCardShell,
} from 'shared/components/common/MobileCardPrimitives';
import { mobileCardStyles } from 'shared/components/common/mobileCardStyles';

interface invoiceCardProps {
  data: PaymentHistoryRow;
  width: string;
  onSelect: (e: boolean, data: PaymentHistoryRow) => void;
  handlePreviewInvoice: (e: PaymentHistoryRow) => void;
  handlePreviewPayment: (e: PaymentHistoryRow) => void;
  regionalFormat?: string | null;
}

export default function PaymentHistoryCard(props: invoiceCardProps) {
  const intl = useIntl();
  const f = (id: string) => intl.formatMessage({ id: id });
  const theme = useTheme();

  const documentNumber = props.data.billingDocumentNumber
    ? props.data.billingDocumentNumber.replace(/^0+/, '')
    : props.data.documentNumberFinance?.replace(/^0+/, '');
  const isDeposit = props.data.billingDocumentNumber === 'Deposit';
  const hasAppliedCredit = props.data.appliedCreditAmount > 0;

  const leftRows: MobileCardFieldRowProps[] = [
    {
      label: `${f('invoices.table.date')}:`,
      value: props.data.documentDate
        ? toFormattedDateString(props.data.documentDate, props.regionalFormat)
        : '',
      testId: 'payment-history-card-date',
    },
    ...(props.data.referenceNumber
      ? [
          {
            label: `${f('mobile.card.ref')}:`,
            value: props.data.referenceNumber,
            truncate: true,
            testId: 'payment-history-card-reference',
          },
        ]
      : []),
    ...(props.data.documentNumberFinance
      ? [
          {
            label: `${f('mobile.card.doc')}:`,
            value: props.data.documentNumberFinance,
            testId: 'payment-history-card-document',
          },
        ]
      : []),
  ];

  const rightRows: MobileCardFieldRowProps[] = [
    {
      label: `${f('payment_history.account')}:`,
      value: props.data.soldtoNumber || '0',
      testId: 'payment-history-card-account',
    },
    {
      label: `${f('mobile.card.method')}:`,
      value: toPaymentCardType(
        props.data?.paymentCardType,
        props.data?.CardLast4Digit ?? '',
      ),
      testId: 'payment-history-card-method',
    },
    {
      label: `${f('mobile.card.amount')}:`,
      value: hasAppliedCredit ? (
        <Typography
          component="button"
          type="button"
          onClick={() => props.handlePreviewPayment(props.data)}
          sx={{
            padding: 0,
            border: 0,
            background: 'transparent',
            cursor: 'pointer',
            fontSize: mobileCardStyles.typography.valueFontSize,
            fontWeight: mobileCardStyles.typography.emphasisFontWeight,
            lineHeight: 1.25,
            color: theme.palette.text.link,
            textDecoration: 'underline',
            textUnderlineOffset: '2px',
            fontFamily: 'inherit',
          }}
        >
          {props.data.paidAmount}
        </Typography>
      ) : (
        props.data.paidAmount
      ),
      emphasis: true,
      testId: 'payment-history-card-amount',
    },
  ];

  return (
    <MobileCardShell
      width={props.width}
      selected={props.data.isSelected || false}
    >
      <MobileCardHeader
        content={
          isDeposit ? (
            <Typography
              component="span"
              variant="body2"
              sx={{
                fontSize: mobileCardStyles.typography.titleFontSize,
                fontWeight: mobileCardStyles.typography.titleFontWeight,
                lineHeight: 1.2,
              }}
            >
              {props.data.billingDocumentNumber}
            </Typography>
          ) : (
            <>
              <Typography
                component="span"
                variant="body2"
                sx={{
                  fontSize: mobileCardStyles.typography.titleFontSize,
                  fontWeight: mobileCardStyles.typography.titleFontWeight,
                  lineHeight: 1.2,
                }}
              >
                {f('invoices.table.invoice')}
              </Typography>
              <Typography
                component="button"
                type="button"
                onClick={() => props.handlePreviewInvoice(props.data)}
                sx={{
                  padding: 0,
                  border: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: mobileCardStyles.typography.titleFontSize,
                  fontWeight: mobileCardStyles.typography.valueFontWeight,
                  lineHeight: 1.2,
                  color: theme.palette.info.main,
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                  fontFamily: 'inherit',
                  verticalAlign: 'baseline',
                  '&:hover': {
                    color: theme.palette.info.main,
                  },
                }}
              >
                {documentNumber}
              </Typography>
            </>
          )
        }
      />

      <MobileCardFieldGrid left={leftRows} right={rightRows} compact />
    </MobileCardShell>
  );
}
