import { useCallback, useRef } from 'react';
import { useIntl } from 'react-intl';
import { useNonce } from 'providers/NonceProvider';
import { useReactToPrint } from 'react-to-print';
import useEpayNavigate from 'hooks/useEpayNavigate';
import { useAppSelector } from 'redux/hooks';
import { Box, Button, Grid, Typography } from '@mui/material';
import DepositStatus from 'shared/components/common/DepositStatus';
import EpayPageHeaderText from 'shared/components/EpayPageHeaderText';
import { impersonatedUserSelector, userSelector } from 'redux/reducers';
import AppLogo from '../logo/AppLogo';
import { useTheme } from '@mui/material/styles';

export default function PaymentReceipt() {
  const printContentWidth = '186mm';
  const nonce = useNonce();
  const intl = useIntl();
  const theme = useTheme();
  const f = (id: string) => intl.formatMessage({ id, defaultMessage: id });
  const user = useAppSelector(userSelector);
  const impersonatedUser = useAppSelector(impersonatedUserSelector);

  const { location } = useEpayNavigate();
  const depositDetails = location.state?.depositDetails || {};
  const responseData = location.state?.responseData || null;
  const payment = location.state?.payment || {};
  const isError = location.state?.error?.isError || false;
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
          '@media print': {
            width: printContentWidth,
            minWidth: printContentWidth,
            maxWidth: printContentWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        <Grid
          container
          direction="column"
          rowGap="2rem"
          sx={{
            width: '100%',
            '@media print': {
              width: '100%',
              minWidth: '100%',
              maxWidth: '100%',
            },
          }}
        >
          <Grid
            container
            alignItems="flex-start"
            sx={{
              minHeight: '56px',
              width: '100%',
              '@media print': {
                flexWrap: 'nowrap',
                alignItems: 'flex-start',
                width: '100%',
                minWidth: '100%',
              },
            }}
          >
            <Grid
              item
              xs
              sx={{
                minWidth: 0,
                '@media print': {
                  flexGrow: 1,
                  flexShrink: 1,
                  flexBasis: 0,
                  width: 'calc(100% - 112px)',
                  maxWidth: 'calc(100% - 112px)',
                },
              }}
            >
              <EpayPageHeaderText
                header={f('header.deposit_confirmation')}
                subheader=""
              />
            </Grid>
            <Grid
              item
              sx={{
                display: 'none',
                '@media print': {
                  display: 'flex',
                  flexShrink: 0,
                  width: '112px',
                  justifyContent: 'flex-end',
                },
              }}
            >
              <Box
                alignItems="center"
                justifyContent="flex-end"
                sx={{
                  width: '100%',
                  minHeight: '40px',
                  display: 'none',
                  '@media print': {
                    display: 'flex',
                    '& img': {
                      display: 'block',
                      width: '96px',
                      maxWidth: '100%',
                      height: 'auto',
                    },
                  },
                }}
              >
                <AppLogo />
              </Box>
            </Grid>
          </Grid>

          <Grid item>
            <Box sx={{ width: '100%' }}>
              <Box my="2rem" sx={{ display: 'none', displayPrint: 'block' }} />
              <DepositStatus
                depositDetails={depositDetails}
                response={responseData}
                payment={payment}
                isError={isError}
                detailUserId={detailUserId}
                printFullWidthCards
              />
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
