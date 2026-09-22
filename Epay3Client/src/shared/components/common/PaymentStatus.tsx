import { useIntl } from 'react-intl';
import { useCallback, useEffect } from 'react';
import { Invoice, paymentList } from 'types/InvoicesSearchRequest';
import { SapHttpStatus } from 'types/Payed';
import { useAppSelector } from 'redux/hooks';
import { regionalFormatSelector } from 'redux/reducers';
import {
  removeLeadingZeros,
  toCurrencyString,
  toFormattedDateString,
} from 'utilities/utilities';
import { Box, Grid, Typography, useTheme } from '@mui/material';
import EpayBox from '../EpayBox';
import { useEpayToast } from '../../../providers/EpayToastProvider';
import PaymentReceiptSummaryCard from './PaymentReceiptSummaryCard';
import PaymentReceiptDetailsCard from './PaymentReceiptDetailsCard';

interface PaymentStatusResponse {
  documents?: paymentList[];
  emailError?: { code: string };
  error?: SapHttpStatus;
}

interface PaymentInfo {
  paymentCardType?: string;
  cardType?: string;
  paymentCardToken?: string;
  token?: string;
  cardLast4Digit?: string;
}

interface PaymentStatusProps {
  invoices: Invoice[];
  response?: PaymentStatusResponse;
  payment: PaymentInfo;
  isError?: boolean;
  showReceiptSummary?: boolean;
  detailUserId?: string;
  showDetailUserId?: boolean;
  printFullWidthCards?: boolean;
}

const PaymentStatus = ({
  invoices,
  response,
  payment,
  isError,
  showReceiptSummary = false,
  detailUserId,
  showDetailUserId = true,
  printFullWidthCards = false,
}: PaymentStatusProps) => {
  const theme = useTheme();
  const intl = useIntl();
  const regionalFormat = useAppSelector(regionalFormatSelector);
  const { showToastMessage } = useEpayToast();
  const f = useCallback(
    (id: string, defaultMessage?: string) =>
      intl.formatMessage({ id, defaultMessage }),
    [intl],
  );

  const document: Partial<paymentList> = response?.documents?.[0] ?? {};
  const today = new Date();
  const hasPaymentError = !!isError;
  const isCreditInvoice = (invoice: Invoice) =>
    invoice.invoiceStatus === 'Credit' ||
    Number(invoice.openAmount) < 0 ||
    Number(invoice.paymentAmount) < 0;

  const receiptAmount = invoices.reduce(
    (total, invoice) => total + (Number(invoice.paymentAmount) || 0),
    0,
  );
  const receiptCurrency =
    document.currencyKey || invoices[0]?.currencyKey || 'USD';
  const receiptMethodType =
    document.paymentCardType || payment.paymentCardType || payment.cardType;
  const receiptMethodLast4 = payment.cardLast4Digit;
  const receiptMethodLabel =
    receiptMethodType && receiptMethodLast4
      ? `${receiptMethodType} **** ${receiptMethodLast4}`
      : undefined;
  const invoicePaidAmount = invoices
    .filter((invoice) => !isCreditInvoice(invoice))
    .reduce(
      (total, invoice) => total + (Number(invoice.paymentAmount) || 0),
      0,
    );
  const creditAppliedAmount =
    Number(document.appliedCreditAmount) ||
    Math.abs(
      invoices
        .filter((invoice) => isCreditInvoice(invoice))
        .reduce(
          (total, invoice) => total + (Number(invoice.paymentAmount) || 0),
          0,
        ),
    );
  const totalChargedAmount = invoicePaidAmount - creditAppliedAmount;
  const displayInvoicePaidAmount = hasPaymentError
    ? 0
    : invoicePaidAmount || receiptAmount;
  const displayCreditAppliedAmount = hasPaymentError ? 0 : creditAppliedAmount;
  const displayTotalChargedAmount = hasPaymentError
    ? 0
    : invoicePaidAmount || creditAppliedAmount
      ? totalChargedAmount
      : receiptAmount;
  const invoiceRows = invoices.filter((invoice) => !isCreditInvoice(invoice));
  const creditRows = invoices.filter((invoice) => isCreditInvoice(invoice));

  useEffect(() => {
    if (response?.emailError) {
      showToastMessage('warning', f(response.emailError.code));
    }
  }, [response?.emailError, showToastMessage, f]);

  const getPaymentReason = (reason: string) => {
    switch (reason) {
      case 'DG':
        return f('payment.damaged');
      case 'PP':
        return f('payment.partial');
      default:
        return f('payment.full');
    }
  };

  const formatDetailsLabel = (label: string) => label.replace(/\s*#\s*$/, '');
  const mobileDocumentGridTemplate =
    'minmax(0, 1fr) minmax(0, 1.25fr) minmax(0, 1.15fr)';
  const documentVisibleCellSx = {
    minWidth: 0,
    width: { xs: '100%', sm: 'auto' },
    maxWidth: { xs: 'none', sm: '16.666667%' },
  };

  const detailRows = [
    {
      label: f('payment.date', 'Date'),
      value: toFormattedDateString(today, regionalFormat),
    },
    {
      label: formatDetailsLabel(f('invoices.table.document', 'Document')),
      value: hasPaymentError ? '' : (document.documentNumberFinance ?? ''),
    },
    {
      label: formatDetailsLabel(f('invoices.table.reference', 'Reference')),
      value: hasPaymentError ? '' : (document.authorizationReferenceCode ?? ''),
    },
    ...(showDetailUserId
      ? [
          {
            label: f('payment.summary.user_id', 'User ID'),
            value: detailUserId ?? '',
          },
        ]
      : []),
  ];

  const renderTable = ({
    rows,
    firstColumnLabel,
    secondColumnLabel,
    thirdColumnLabel,
    isCreditTable = false,
  }: {
    rows: Invoice[];
    firstColumnLabel: string;
    secondColumnLabel: string;
    thirdColumnLabel: string;
    isCreditTable?: boolean;
  }) => {
    if (rows.length === 0) {
      return null;
    }

    return (
      <Box
        sx={{
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          borderRadius: `${theme.shape.borderRadius}px`,
          border: '1px solid #DFE1E6',
          overflowX: { xs: 'hidden', sm: 'auto' },
          overflowY: 'hidden',
          backgroundColor: '#FFFFFF',
          '@media print': {
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            overflow: 'hidden',
            padding: '1px',
            borderRadius: `${theme.shape.borderRadius}px`,
            pageBreakInside: 'avoid',
            breakInside: 'avoid',
          },
        }}
      >
        <Box
          sx={{
            width: '100%',
            minWidth: { xs: 0, sm: '760px' },
            '@media print': {
              minWidth: '100%',
              width: '100%',
              display: 'block',
            },
          }}
        >
          <Grid
            item
            container
            flexDirection="row"
            wrap="nowrap"
            sx={{
              display: { xs: 'grid', sm: 'flex' },
              gridTemplateColumns: {
                xs: mobileDocumentGridTemplate,
                sm: 'none',
              },
              width: '100%',
              backgroundColor: '#F8F9F9',
              color: '#0D0D12',
              borderBottom: '1px solid',
              borderBottomColor: '#E0E0E0',
              fontSize: '14px',
            }}
          >
            <Grid item xs={4} sm={2} md={2} lg={2} sx={documentVisibleCellSx}>
              <Typography
                variant="body2"
                align="left"
                sx={{
                  padding: { xs: '10px 4px', sm: '10px' },
                  color: '#0D0D12',
                  fontWeight: 500,
                  minWidth: { xs: 0, sm: '120px' },
                  fontSize: { xs: '13px', sm: '14px' },
                  overflowWrap: 'normal',
                  whiteSpace: 'nowrap',
                  '@media print': {
                    minWidth: 0,
                    padding: '6px',
                    fontSize: '12px',
                  },
                }}
              >
                {firstColumnLabel}
              </Typography>
            </Grid>
            <Grid item xs={4.5} sm={2} md={2} lg={2} sx={documentVisibleCellSx}>
              <Typography
                variant="body2"
                align="left"
                sx={{
                  padding: { xs: '10px 4px', sm: '10px' },
                  color: '#0D0D12',
                  fontWeight: 500,
                  minWidth: { xs: 0, sm: '130px' },
                  fontSize: { xs: '13px', sm: '14px' },
                  overflowWrap: 'normal',
                  whiteSpace: 'nowrap',
                  '@media print': {
                    minWidth: 0,
                    padding: '6px',
                    fontSize: '12px',
                  },
                }}
              >
                {secondColumnLabel}
              </Typography>
            </Grid>
            <Grid item xs={3.5} sm={2} md={2} lg={2} sx={documentVisibleCellSx}>
              <Typography
                variant="body2"
                align="left"
                sx={{
                  padding: { xs: '10px 4px', sm: '10px' },
                  color: '#0D0D12',
                  fontWeight: 500,
                  minWidth: { xs: 0, sm: '120px' },
                  fontSize: { xs: '13px', sm: '14px' },
                  overflowWrap: 'normal',
                  whiteSpace: 'nowrap',
                  '@media print': {
                    minWidth: 0,
                    padding: '6px',
                    fontSize: '12px',
                  },
                }}
              >
                {thirdColumnLabel}
              </Typography>
            </Grid>
            <Grid
              item
              sm={2}
              md={2}
              lg={2}
              sx={{ display: { xs: 'none', sm: 'block' } }}
            >
              <Typography
                variant="body2"
                align="left"
                sx={{
                  padding: '10px',
                  color: '#0D0D12',
                  fontWeight: 500,
                  minWidth: '110px',
                  wordBreak: 'break-word',
                  '@media print': {
                    minWidth: 0,
                    padding: '6px',
                    fontSize: '12px',
                  },
                }}
              >
                {f('payment.summary.payer_account', 'Payer Account')}
              </Typography>
            </Grid>
            <Grid
              item
              sm={2}
              md={2}
              lg={2}
              sx={{ display: { xs: 'none', sm: 'block' } }}
            >
              <Typography
                variant="body2"
                align="left"
                sx={{
                  padding: '10px',
                  color: '#0D0D12',
                  fontWeight: 500,
                  minWidth: '110px',
                  wordBreak: 'break-word',
                  '@media print': {
                    minWidth: 0,
                    padding: '6px',
                    fontSize: '12px',
                  },
                }}
              >
                {f('payment.summary.soldto_account', 'SoldTo Account')}
              </Typography>
            </Grid>
            <Grid
              item
              sm={2}
              md={2}
              lg={2}
              sx={{ display: { xs: 'none', sm: 'block' } }}
            >
              <Typography
                variant="body2"
                align="left"
                sx={{
                  padding: '10px',
                  color: '#0D0D12',
                  fontWeight: 500,
                  minWidth: '120px',
                  wordBreak: 'break-word',
                  '@media print': {
                    minWidth: 0,
                    padding: '6px',
                    fontSize: '12px',
                  },
                }}
              >
                {f('payment.code')}
              </Typography>
            </Grid>
          </Grid>

          {rows.map((invoice: Invoice, index: number) => {
            const amountValue = isCreditTable
              ? Math.abs(Number(invoice.openAmount) || 0)
              : Number(invoice.openAmount) || 0;
            const paidValue = isCreditTable
              ? Math.abs(Number(invoice.paymentAmount) || 0)
              : Number(invoice.paymentAmount) || 0;

            return (
              <Grid
                key={`${invoice.billingDocumentNumber}-${index}`}
                item
                container
                flexDirection="row"
                wrap="nowrap"
                sx={{
                  display: { xs: 'grid', sm: 'flex' },
                  gridTemplateColumns: {
                    xs: mobileDocumentGridTemplate,
                    sm: 'none',
                  },
                  width: '100%',
                  color: '#0D0D12',
                  borderBottom:
                    index === rows.length - 1 ? 'none' : '1px solid #EAECEF',
                }}
              >
                <Grid
                  item
                  xs={4}
                  sm={2}
                  md={2}
                  lg={2}
                  sx={documentVisibleCellSx}
                >
                  <Typography
                    variant="body2"
                    align="left"
                    sx={{
                      padding: { xs: '10px 4px', sm: '10px' },
                      color: '#0D0D12',
                      minWidth: { xs: 0, sm: '120px' },
                      fontSize: { xs: '13px', sm: '14px' },
                      overflowWrap: 'normal',
                      whiteSpace: 'nowrap',
                      '@media print': {
                        minWidth: 0,
                        padding: '6px',
                        fontSize: '12px',
                      },
                    }}
                  >
                    {removeLeadingZeros(invoice?.billingDocumentNumber ?? '')}
                  </Typography>
                </Grid>
                <Grid
                  item
                  xs={4.5}
                  sm={2}
                  md={2}
                  lg={2}
                  sx={documentVisibleCellSx}
                >
                  <Typography
                    variant="body2"
                    align="left"
                    sx={{
                      padding: { xs: '10px 4px', sm: '10px' },
                      color: '#0D0D12',
                      minWidth: { xs: 0, sm: '130px' },
                      fontSize: { xs: '13px', sm: '14px' },
                      overflowWrap: 'normal',
                      whiteSpace: 'nowrap',
                      '@media print': {
                        minWidth: 0,
                        padding: '6px',
                        fontSize: '12px',
                      },
                    }}
                  >
                    {toCurrencyString(
                      invoice.currencyKey,
                      amountValue,
                      false,
                      regionalFormat,
                    )}
                  </Typography>
                </Grid>
                <Grid
                  item
                  xs={3.5}
                  sm={2}
                  md={2}
                  lg={2}
                  sx={documentVisibleCellSx}
                >
                  <Typography
                    variant="body2"
                    align="left"
                    sx={{
                      padding: { xs: '10px 4px', sm: '10px' },
                      color: '#0D0D12',
                      minWidth: { xs: 0, sm: '120px' },
                      fontSize: { xs: '13px', sm: '14px' },
                      overflowWrap: 'normal',
                      whiteSpace: 'nowrap',
                      '@media print': {
                        minWidth: 0,
                        padding: '6px',
                        fontSize: '12px',
                      },
                    }}
                  >
                    {toCurrencyString(
                      invoice.currencyKey,
                      paidValue,
                      false,
                      regionalFormat,
                    )}
                  </Typography>
                </Grid>
                <Grid
                  item
                  sm={2}
                  md={2}
                  lg={2}
                  sx={{ display: { xs: 'none', sm: 'block' } }}
                >
                  <Typography
                    variant="body2"
                    align="left"
                    sx={{
                      padding: '10px',
                      color: '#0D0D12',
                      minWidth: '110px',
                      wordBreak: 'break-word',
                      '@media print': {
                        minWidth: 0,
                        padding: '6px',
                        fontSize: '12px',
                      },
                    }}
                  >
                    {invoice.payerNumber?.replace(/^0+/, '') ?? ''}
                  </Typography>
                </Grid>
                <Grid
                  item
                  sm={2}
                  md={2}
                  lg={2}
                  sx={{ display: { xs: 'none', sm: 'block' } }}
                >
                  <Typography
                    variant="body2"
                    align="left"
                    sx={{
                      padding: '10px',
                      color: '#0D0D12',
                      minWidth: '110px',
                      wordBreak: 'break-word',
                      '@media print': {
                        minWidth: 0,
                        padding: '6px',
                        fontSize: '12px',
                      },
                    }}
                  >
                    {invoice.soldtoNumber.replace(/^0+/, '')}
                  </Typography>
                </Grid>
                <Grid
                  item
                  sm={2}
                  md={2}
                  lg={2}
                  sx={{ display: { xs: 'none', sm: 'block' } }}
                >
                  <Typography
                    variant="body2"
                    align="left"
                    sx={{
                      padding: '10px',
                      color: '#0D0D12',
                      minWidth: '120px',
                      wordBreak: 'break-word',
                      '@media print': {
                        minWidth: 0,
                        padding: '6px',
                        fontSize: '12px',
                      },
                    }}
                  >
                    {isCreditTable
                      ? f('payment.summary.credit_applied', 'Credit Applied')
                      : getPaymentReason(invoice.reason ? invoice.reason : '')}
                  </Typography>
                </Grid>
              </Grid>
            );
          })}
        </Box>
      </Box>
    );
  };

  return (
    <Grid
      container
      direction="column"
      sx={{ width: '100%', maxWidth: '100%', minWidth: 0, overflowX: 'hidden' }}
    >
      <Grid item sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
        <Box
          sx={{
            display: 'grid',
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            gridTemplateColumns: {
              xs: '1fr',
              md: showReceiptSummary
                ? 'minmax(0, 5fr) minmax(0, 7fr)'
                : 'minmax(0, 4fr) minmax(0, 8fr)',
              lg: 'minmax(0, 4fr) minmax(0, 8fr)',
            },
            gap: { xs: 2, md: 2 },
            alignItems: 'stretch',
            ...(printFullWidthCards && {
              '@media print': {
                gridTemplateColumns: '1fr',
                gap: '1.25rem',
              },
            }),
          }}
        >
          <Box
            sx={{
              minWidth: 0,
              ...(printFullWidthCards && {
                '@media print': {
                  width: '100%',
                  maxWidth: '100%',
                },
              }),
            }}
          >
            <Grid
              container
              direction="column"
              rowGap="1.25rem"
              sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}
            >
              {showReceiptSummary && (
                <Grid item>
                  <PaymentReceiptSummaryCard
                    statusLabel={
                      hasPaymentError
                        ? f('payment.summary.payment_error', 'Payment Error')
                        : undefined
                    }
                    invoicePaidAmount={displayInvoicePaidAmount}
                    creditAppliedAmount={displayCreditAppliedAmount}
                    totalChargedAmount={displayTotalChargedAmount}
                    currencyKey={receiptCurrency}
                    paymentMethodType={receiptMethodType}
                    paymentMethodToken={receiptMethodLast4}
                    paymentMethodLabel={receiptMethodLabel}
                    regionalFormat={regionalFormat}
                    isError={hasPaymentError}
                    printFullWidth={printFullWidthCards}
                  />
                </Grid>
              )}

              <Grid item>
                <PaymentReceiptDetailsCard
                  title={f('payment.details', 'Details')}
                  rows={detailRows}
                  printFullWidth={printFullWidthCards}
                />
              </Grid>
            </Grid>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignSelf: 'stretch',
              minWidth: 0,
              ...(printFullWidthCards && {
                '@media print': {
                  width: '100%',
                  maxWidth: '100%',
                },
              }),
            }}
          >
            <EpayBox
              sx={{
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                flex: 1,
                boxSizing: 'border-box',
                padding: '0px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                ...(printFullWidthCards && {
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
                  {f('payment.summary.documents', 'Documents')}
                </Typography>
              </Box>

              <Box
                sx={{
                  padding: { xs: '20px 16px', sm: '20px' },
                  flexGrow: 1,
                  minWidth: 0,
                }}
              >
                {renderTable({
                  rows: invoiceRows,
                  firstColumnLabel: f('payment.summary.invoice', 'Invoice'),
                  secondColumnLabel: f(
                    'payment.summary.open_amount',
                    'Open Amount',
                  ),
                  thirdColumnLabel: f(
                    'payment.summary.paid_amount',
                    'Paid Amount',
                  ),
                })}

                {creditRows.length > 0 && (
                  <Box sx={{ marginTop: '24px' }}>
                    {renderTable({
                      rows: creditRows,
                      firstColumnLabel: f('payment.summary.credit', 'Credit'),
                      secondColumnLabel: f(
                        'payment.summary.credit_amount',
                        'Credit Amount',
                      ),
                      thirdColumnLabel: f(
                        'payment.summary.credit_applied_amount',
                        'Credit Applied',
                      ),
                      isCreditTable: true,
                    })}
                  </Box>
                )}
              </Box>
            </EpayBox>
          </Box>
        </Box>
      </Grid>
    </Grid>
  );
};

export default PaymentStatus;
