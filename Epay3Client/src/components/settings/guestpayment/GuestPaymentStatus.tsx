import React, { useEffect } from 'react';

import { useIntl } from 'react-intl';
import { useNonce } from 'providers/NonceProvider';
import { useReactToPrint } from 'react-to-print';

import useEpayNavigate from 'hooks/useEpayNavigate';
import PaymentStatus from 'shared/components/common/PaymentStatus';
import { Box, Button, Grid, Link, Typography, useTheme } from '@mui/material';
import EpayPageHeaderText from 'shared/components/EpayPageHeaderText';
import AppLogo from 'components/logo/AppLogo';
import {
  clearPaymentSession,
  safeJsonParse,
} from '../../../utilities/utilities';
import { Invoice, paymentList } from 'types/InvoicesSearchRequest';
import { SapHttpStatus } from 'types/Payed';

function GuestPaymentStatus() {
  const nonce = useNonce();
  const { location } = useEpayNavigate();

  // Handle state persistence for refreshes
  useEffect(() => {
    if (location.state?.responseData) {
      sessionStorage.setItem(
        'guest_status_response',
        JSON.stringify(location.state.responseData),
      );
    }
    if (location.state?.payment) {
      sessionStorage.setItem(
        'guest_status_payment',
        JSON.stringify(location.state.payment),
      );
    }
    if (location.state?.invoices) {
      sessionStorage.setItem(
        'guest_status_invoices',
        JSON.stringify(location.state.invoices),
      );
    }
    if (location.state?.error) {
      sessionStorage.setItem(
        'guest_status_error',
        JSON.stringify(location.state.error),
      );
    } else if (location.state) {
      sessionStorage.removeItem('guest_status_error');
    }
  }, [location.state]);

  const responseData: {
    documents?: paymentList[];
    emailError?: { code: string };
    error?: SapHttpStatus;
  } =
    location.state?.responseData ||
    safeJsonParse(sessionStorage.getItem('guest_status_response'), {});
  const payment: {
    paymentCardType?: string;
    cardType?: string;
    paymentCardToken?: string;
    token?: string;
    cardLast4Digit?: string;
  } =
    location.state?.payment ||
    safeJsonParse(sessionStorage.getItem('guest_status_payment'), {});
  const invoices: Invoice[] =
    location.state?.invoices ||
    safeJsonParse<Invoice[]>(
      sessionStorage.getItem('guest_status_invoices'),
      [],
    );
  const routedIsError = Boolean(location.state?.error?.isError);
  const persistedError = safeJsonParse<{
    isError?: boolean;
    message?: string;
  }>(sessionStorage.getItem('guest_status_error'), {});
  const responseError = responseData.error;
  const hasResponseError = responseError?.messageType?.toLowerCase() === 'e';
  const isError =
    routedIsError || Boolean(persistedError.isError) || hasResponseError;

  const theme = useTheme();
  const intl = useIntl();
  const f = (id: string) => intl.formatMessage({ id: id });
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
  const componentRef = React.useRef(null);
  const hiddenPrintTitle = String.fromCharCode(8203);

  const handleAfterPrint = React.useCallback(() => {
    //Add any functionality if needed
  }, []);

  const handleBeforePrint = React.useCallback(() => {
    //Add any functionality if needed

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
  useEffect(() => {
    clearPaymentSession();
  }, []);
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
                showDetailUserId={false}
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
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: '2rem',
            displayPrint: 'none',
          }}
        >
          <Link
            href="/"
            sx={{
              textDecoration: 'none',
            }}
          >
            <Typography
              variant="body1"
              sx={{ color: theme.palette.interactiveColor }}
            >
              {f('user.go_back_login')}
            </Typography>
          </Link>
        </Box>
      </Box>
    </div>
  );
}

export default GuestPaymentStatus;
