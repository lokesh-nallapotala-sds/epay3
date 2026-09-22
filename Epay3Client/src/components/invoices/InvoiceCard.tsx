import { useIntl } from 'react-intl';

import { Box, useTheme } from '@mui/system';
import EpayPdfIcon from 'shared/icons/EpayPdfIcon';
import { Invoice } from 'types/InvoicesSearchRequest';
import { useAppSelector } from 'redux/hooks';
import { regionalFormatSelector } from 'redux/reducers';
import { toCurrencyString, toFormattedDateString } from 'utilities/utilities';
import { Tooltip, Typography } from '@mui/material';
import EpayCheckBox from 'shared/components/EpayCheckBox';
import {
  MobileCardFieldGrid,
  MobileCardFieldRowProps,
  MobileCardHeader,
  MobileCardShell,
} from 'shared/components/common/MobileCardPrimitives';
import { mobileCardStyles } from 'shared/components/common/mobileCardStyles';
import EpayCalendarIcon from '../../shared/icons/EpayCalendarIcon';
import useEpayNavigate from '../../hooks/useEpayNavigate';

interface invoiceCardProps {
  currency: string;
  data: Invoice;
  width: string;
  showPdfActions: boolean;
  isScheduledpayment?: boolean;
  canMakePayment?: boolean;
  onSelect: (e: boolean, data: Invoice) => void;
  handleSubmit: (data: Invoice) => void;
  handlePdfDownload: (data: Invoice) => void;
}

export default function InvoiceCard(props: invoiceCardProps) {
  const intl = useIntl();
  const f = (id: string) => intl.formatMessage({ id: id });
  const theme = useTheme();
  const { navigate } = useEpayNavigate();
  const regionalFormat = useAppSelector(regionalFormatSelector);
  const isInvoice = !!props.data.totalAmount && props.data.totalAmount >= 0;
  const statusLabel =
    props.data.invoiceStatus === 'Open'
      ? f('invoices.status.invoice')
      : isInvoice
        ? f('invoices.status.invoice')
        : f('invoices.table.credit');
  const documentNumber = props.data.billingDocumentNumber
    ? props.data.billingDocumentNumber.replace(/^0+/, '')
    : props.data.documentNumberFinance?.replace(/^0+/, '');
  const dueDateIsOverdue =
    !!props.data.dueDate && new Date(props.data.dueDate) < new Date();
  const formattedDocumentDate = props.data.documentDate
    ? toFormattedDateString(props.data.documentDate, regionalFormat)
    : '';
  const formattedDueDate = props.data.dueDate
    ? toFormattedDateString(props.data.dueDate, regionalFormat)
    : '';
  const scheduledPaymentTooltip =
    !props.isScheduledpayment &&
    props.data.scheduledId &&
    props.data.scheduledDate
      ? `Payment Scheduled on ${toFormattedDateString(
          props.data.scheduledDate,
          regionalFormat,
        )}`
      : null;

  const leftRows: MobileCardFieldRowProps[] = [
    {
      label: `${f('invoices.table.date')}:`,
      value: formattedDocumentDate,
      testId: 'invoice-card-date',
    },
    ...(isInvoice || !!props.data.dueDate
      ? [
          {
            label: `${f('invoices.table.due')}:`,
            value: formattedDueDate,
            valueColor: dueDateIsOverdue ? theme.palette.error.main : undefined,
            testId: 'invoice-card-due',
          },
        ]
      : []),
  ];

  const rightRows: MobileCardFieldRowProps[] = [
    {
      label: `${f('invoices.table.total')}:`,
      value: toCurrencyString(
        props.currency,
        props.data.totalAmount || 0,
        true,
        regionalFormat,
      ),
      testId: 'invoice-card-total',
    },
    {
      label: `${f('invoices.table.paid')}:`,
      value: toCurrencyString(
        props.currency,
        props.data.paidAmount || 0,
        true,
        regionalFormat,
      ),
      testId: 'invoice-card-paid',
    },
    {
      label: `${f('invoices.table.open')}:`,
      value: toCurrencyString(
        props.currency,
        props.data.openAmount || 0,
        true,
        regionalFormat,
      ),
      emphasis: true,
      separatorTop: true,
      testId: 'invoice-card-open',
    },
  ];

  return (
    <MobileCardShell
      width={props.width}
      selected={props.data.isSelected || false}
    >
      <MobileCardHeader
        checkbox={
          <EpayCheckBox
            checked={props.data.isSelected || false}
            onClick={(e) => props.onSelect(e, props.data)}
            disabled={!props.canMakePayment}
            style={{ marginTop: 0, display: 'block' }}
            sx={{ marginTop: 0 }}
          />
        }
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
              {statusLabel}
            </Typography>
            {isInvoice ? (
              <Typography
                component="button"
                type="button"
                onClick={() => props.handleSubmit(props.data)}
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
            ) : (
              <Typography
                component="span"
                variant="body2"
                sx={{
                  fontSize: mobileCardStyles.typography.titleFontSize,
                  fontWeight: mobileCardStyles.typography.valueFontWeight,
                  lineHeight: 1.2,
                }}
              >
                {documentNumber}
              </Typography>
            )}
          </>
        }
        action={
          scheduledPaymentTooltip || props.showPdfActions ? (
            <>
              {scheduledPaymentTooltip && (
                <Tooltip
                  placement="bottom-start"
                  title={scheduledPaymentTooltip}
                  slotProps={{
                    tooltip: {
                      sx: {
                        backgroundColor: '#ffffff',
                        color: '#0D0D12',
                        fontSize: '0.75rem',
                        border: '1px solid #D1D5DB',
                        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontWeight: 500,
                      },
                    },
                  }}
                >
                  <Box
                    component="button"
                    type="button"
                    onClick={() => navigate('/scheduleddetails?tab=scheduled')}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '18px',
                      height: '18px',
                      padding: 0,
                      border: 0,
                      background: 'transparent',
                      cursor: 'pointer',
                      color: theme.palette.interactiveColor,
                      lineHeight: 1,
                      marginTop: '-1px',
                    }}
                  >
                    <EpayCalendarIcon
                      sx={{
                        color: 'inherit',
                        fontSize: '1rem',
                      }}
                    />
                  </Box>
                </Tooltip>
              )}
              {props.showPdfActions &&
                (props.data.hasKey ? (
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
                ))}
            </>
          ) : undefined
        }
      />

      <MobileCardFieldGrid left={leftRows} right={rightRows} />
    </MobileCardShell>
  );
}
