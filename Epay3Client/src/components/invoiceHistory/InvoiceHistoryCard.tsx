import { useIntl } from 'react-intl';

import { Box, useTheme } from '@mui/system';
import EpayPdfIcon from 'shared/icons/EpayPdfIcon';
import { Invoice } from 'types/InvoicesSearchRequest';
import { useAppSelector } from 'redux/hooks';
import { regionalFormatSelector } from 'redux/reducers';
import { Typography } from '@mui/material';
import {
  MobileCardFieldGrid,
  MobileCardFieldRowProps,
  MobileCardHeader,
  MobileCardShell,
} from 'shared/components/common/MobileCardPrimitives';
import { mobileCardStyles } from 'shared/components/common/mobileCardStyles';
import {
  formatDaysTillDue,
  formatDueDate,
  toCurrencyString,
  toFormattedDateString,
} from 'utilities/utilities';
import { selectShowInvoiceDaysTillDue } from '../../redux/selectors/configSelectors';

interface InvoiceHistoryCardProps {
  data: Invoice;
  width: string;
  showPdfActions: boolean;
  onSelect: (e: boolean, data: Invoice) => void;
  handlePdfDownload: (invoice: Invoice) => void;
  handleInvoicePreview: (invoice: Invoice) => void;
}

export default function InvoiceHistoryCard(props: InvoiceHistoryCardProps) {
  const intl = useIntl();
  const f = (id: string) => intl.formatMessage({ id: id });
  const theme = useTheme();
  const regionalFormat = useAppSelector(regionalFormatSelector);
  const showDaysTillDue = useAppSelector(selectShowInvoiceDaysTillDue);

  const isInvoice = !!props.data.totalAmount && props.data.totalAmount >= 0;
  const documentNumber = props.data.billingDocumentNumber
    ? props.data.billingDocumentNumber.replace(/^0+/, '')
    : props.data.documentNumberFinance?.replace(/^0+/, '');

  const formattedDueDate = formatDueDate(props.data, regionalFormat);
  const dueDateIsOverdue =
    !!props.data.dueDate && new Date(props.data.dueDate) < new Date();
  const daysTillDue = formatDaysTillDue(props.data);
  const daysTillDueColor =
    Number(daysTillDue) < 0 ? theme.palette.error.main : undefined;

  const leftRows: MobileCardFieldRowProps[] = [
    ...(props.data.documentNumberFinance
      ? [
          {
            label: `${f('mobile.card.doc')}:`,
            value: props.data.documentNumberFinance,
            testId: 'invoice-history-card-document',
          },
        ]
      : []),
    {
      label: `${f('invoices.table.date')}:`,
      value: props.data.documentDate
        ? toFormattedDateString(props.data.documentDate, regionalFormat)
        : '',
      testId: 'invoice-history-card-date',
    },
    ...(formattedDueDate
      ? [
          {
            label: `${f('invoices.table.due')}:`,
            value: formattedDueDate,
            valueColor: dueDateIsOverdue ? theme.palette.error.main : undefined,
            testId: 'invoice-history-card-due',
          },
        ]
      : []),
    ...(showDaysTillDue && daysTillDue !== ''
      ? [
          {
            label: `${f('mobile.card.days')}:`,
            value: String(daysTillDue),
            valueColor: daysTillDueColor,
            testId: 'invoice-history-card-days',
          },
        ]
      : []),
  ];

  const rightRows: MobileCardFieldRowProps[] = [
    {
      label: `${f('invoices.table.total')}:`,
      value: toCurrencyString(
        props.data?.currencyKey,
        props.data.totalAmount || 0,
        true,
        regionalFormat,
      ),
      testId: 'invoice-history-card-total',
    },
    {
      label: `${f('invoices.table.paid')}:`,
      value: toCurrencyString(
        props.data?.currencyKey,
        props.data.paidAmount || 0,
        true,
        regionalFormat,
      ),
      testId: 'invoice-history-card-paid',
    },
    {
      label: `${f('invoices.table.open')}:`,
      value: toCurrencyString(
        props.data?.currencyKey,
        props.data.openAmount || 0,
        true,
        regionalFormat,
      ),
      emphasis: true,
      separatorTop: true,
      testId: 'invoice-history-card-open',
    },
  ];

  return (
    <MobileCardShell width={props.width}>
      <MobileCardHeader
        content={
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
              {isInvoice
                ? f('invoices.table.invoice')
                : f('invoices.table.credit')}
            </Typography>
            <Typography
              component="button"
              type="button"
              onClick={() => props.handleInvoicePreview(props.data)}
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
        }
        action={
          props.showPdfActions ? (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {props.data.hasKey ? (
                <EpayPdfIcon
                  sx={{
                    color: theme.palette.error.main,
                  }}
                  onClick={() => props.handlePdfDownload(props.data)}
                />
              ) : (
                <EpayPdfIcon
                  sx={{
                    color: theme.palette.text.disabled,
                  }}
                />
              )}
            </Box>
          ) : undefined
        }
      />

      <MobileCardFieldGrid left={leftRows} right={rightRows} compact />
    </MobileCardShell>
  );
}
