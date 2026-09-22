import { useCallback, useRef } from 'react';

import { useIntl } from 'react-intl';
import { useNonce } from 'providers/NonceProvider';
import { useReactToPrint } from 'react-to-print';

import useEpayNavigate from 'hooks/useEpayNavigate';
import { useAppSelector } from 'redux/hooks';
import { Box, Button, Grid, Typography, useTheme } from '@mui/material';
import PaymentStatus from 'shared/components/common/PaymentStatus';
import EpayPageHeaderText from 'shared/components/EpayPageHeaderText';
import { impersonatedUserSelector, userSelector } from 'redux/reducers';
import { SapHttpStatus } from 'types/Payed';
import AppLogo from '../logo/AppLogo';
import { Invoice, paymentList } from 'types/InvoicesSearchRequest';

export default function InvoicesPaymentReceipt() {
  const nonce = useNonce();
  const intl = useIntl();
  const theme = useTheme();
  const f = (id: string) => intl.formatMessage({ id, defaultMessage: id });
  const user = useAppSelector(userSelector);
  const impersonatedUser = useAppSelector(impersonatedUserSelector);

  const { location } = useEpayNavigate();
  const rawResponseData = location.state?.responseData;
  const responseData: {
    documents?: paymentList[];
    emailError?: { code: string };
    error?: SapHttpStatus;
  } = rawResponseData && !Array.isArray(rawResponseData) ? rawResponseData : {};
  const routedIsError = Boolean(location.state?.error?.isError);
  const responseError = responseData.error;
  const hasResponseError = responseError?.messageType?.toLowerCase() === 'e';
  const isError = routedIsError || hasResponseError;
  const payment: {
    paymentCardType?: string;
    cardType?: string;
    paymentCardToken?: string;
    token?: string;
  } = location.state?.payment || {};
  const invoices: Invoice[] = location.state?.invoices || [];
  const detailUserId =
    impersonatedUser?.email ||
    impersonatedUser?.userId ||
    user?.email ||
    user?.userId ||
    '';
  const printPageStyle = `
    @page {
      margin: 12mm;
      background: #ffffff;
    }

    @media print {
      html, body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        background: #ffffff !important;
      }
    }
  `;

  const componentRef = useRef(null);
  const hiddenPrintTitle = String.fromCharCode(8203);

  const handleAfterPrint = useCallback(() => {}, []);

  const handleBeforePrint = useCallback(() => {
    return Promise.resolve();
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: hiddenPrintTitle,
    onAfterPrint: handleAfterPrint,
    onBeforePrint: handleBeforePrint,
    nonce: nonce,
    pageStyle: printPageStyle,
  });

  return (
    <div ref={componentRef}>
      <Box
        sx={{
          flexGrow: 1,
          marginTop: '1rem',
          position: 'relative',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        <Grid container direction="column" rowGap="2rem">
          <Grid
            container
            alignItems="flex-start"
            sx={{ minHeight: '56px', width: '100%' }}
          >
            <Grid item xs>
              <EpayPageHeaderText
                header={f('header.payment_confirmation')}
                subheader=""
              />
            </Grid>
            <Grid item>
              <Box display="none" displayPrint="flex" alignItems="center">
                <AppLogo />
              </Box>
            </Grid>
          </Grid>

          <Grid item>
            <Box>
              <Box my="2rem" sx={{ display: 'none', displayPrint: 'block' }} />
              <PaymentStatus
                invoices={invoices}
                response={responseData}
                payment={payment}
                isError={isError}
                showReceiptSummary
                detailUserId={detailUserId}
                printFullWidthCards
              ></PaymentStatus>
            </Box>
          </Grid>
        </Grid>

        {!isError && (
          <Grid
            container
            alignItems="center"
            justifyContent="space-between"
            sx={{
              width: '100%',
              marginTop: '1.5rem',
              flexDirection: { xs: 'column', sm: 'row' },
              rowGap: { xs: '1rem', sm: 0 },
              displayPrint: 'none',
            }}
          >
            <Grid item sx={{ flex: 1, display: { xs: 'none', sm: 'block' } }} />
            <Grid item sx={{ width: { xs: '100%', sm: 'auto' } }}>
              <Typography
                variant="body2"
                sx={{
                  textAlign: 'center',
                  maxWidth: { xs: '320px', sm: 'none' },
                  margin: { xs: '0 auto', sm: 0 },
                }}
              >
                {f('payment.guest_payment.print_message')}
              </Typography>
            </Grid>
            <Grid
              item
              sx={{
                flex: { xs: 'none', sm: 1 },
                display: 'flex',
                justifyContent: { xs: 'center', sm: 'flex-end' },
                width: { xs: '100%', sm: 'auto' },
              }}
            >
              <Button
                variant="contained"
                sx={{
                  border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                  '&:hover': {
                    border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                  },
                  minWidth: '120px',
                  minHeight: '48px',
                  padding: '10px 28px',
                  lineHeight: 1.2,
                }}
                onClick={() => handlePrint()}
              >
                {f('payment.guest_payment.print')}
              </Button>
            </Grid>
          </Grid>
        )}
      </Box>
    </div>
  );
}
