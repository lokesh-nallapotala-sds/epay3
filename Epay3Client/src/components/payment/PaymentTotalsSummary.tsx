import { useTheme } from '@mui/system';
import { useAppSelector } from 'redux/hooks';
import { toCurrencyString } from 'utilities/utilities';
import { regionalFormatSelector } from 'redux/reducers';
import { Button, Grid, Typography } from '@mui/material';
import EpayBox from 'shared/components/EpayBox';
import { useFormat } from 'hooks/useFormat';

interface PaymentTotalsSummaryProps {
  isDeposit: boolean;
  payTotal: number;
  paymentTotal: number;
  overPaymentTotal: number;
  creditAmount: number;
  currencyKey: string;
  amountToPay: number;
  canMakePayment: boolean;
  isProcessing: boolean;
  startPay: boolean;
  paymentConfigLoaded: boolean;
  onPay: () => void;
}

export default function PaymentTotalsSummary({
  isDeposit,
  payTotal,
  paymentTotal,
  overPaymentTotal,
  creditAmount,
  currencyKey,
  amountToPay,
  canMakePayment,
  isProcessing,
  startPay,
  paymentConfigLoaded,
  onPay,
}: PaymentTotalsSummaryProps) {
  const f = useFormat();
  const theme = useTheme();
  const regionalFormat = useAppSelector(regionalFormatSelector);
  const isOverPaymentAllowed = useAppSelector(
    (state) => state.config.overpaymentAllowed,
  );

  return (
    <Grid
      id="payment-action-box"
      sx={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        marginTop: '1rem',
      }}
    >
      <EpayBox>
        <Grid container item flexDirection="column" sm={12} md={12} lg={12}>
          <Grid item container sm={12} md={12} lg={12} p="1.3rem">
            {!isDeposit && (
              <Grid
                container
                justifyContent="space-between"
                alignItems="center"
              >
                <Grid item lg={9}>
                  <Typography
                    variant="fieldHeader"
                    sx={{
                      color: '#808897',
                    }}
                  >
                    {f('payment.pay_amount')}
                  </Typography>
                </Grid>

                <Grid item lg={3}>
                  <Typography variant="body2" sx={{ textAlign: 'right' }}>
                    {`${toCurrencyString(currencyKey, paymentTotal, false, regionalFormat)}`}
                  </Typography>
                </Grid>
              </Grid>
            )}
            {overPaymentTotal != 0 && isOverPaymentAllowed && (
              <Grid
                container
                mt="10px"
                justifyContent="space-between"
                alignItems="center"
              >
                <Grid item lg={9}>
                  <Typography
                    variant="fieldHeader"
                    sx={{
                      color: '#808897',
                    }}
                  >
                    {f('payment.overpaying')}
                  </Typography>
                </Grid>
                <Grid item lg={3}>
                  <Typography
                    variant="body2"
                    sx={{
                      textAlign: 'right',
                    }}
                  >
                    {`${toCurrencyString(currencyKey, overPaymentTotal, false, regionalFormat)}`}
                  </Typography>
                </Grid>
              </Grid>
            )}
            {creditAmount != 0 && (
              <Grid
                container
                mt="10px"
                justifyContent="space-between"
                alignItems="center"
              >
                <Grid item lg={9}>
                  <Typography
                    variant="fieldHeader"
                    sx={{
                      color: '#808897',
                    }}
                  >
                    {f('payment.credits')}
                  </Typography>
                </Grid>
                <Grid item lg={3}>
                  <Typography
                    variant="body2"
                    sx={{
                      textAlign: 'right',
                      color: 'green',
                    }}
                  >
                    {`${toCurrencyString(currencyKey, creditAmount, false, regionalFormat)}`}
                  </Typography>
                </Grid>
              </Grid>
            )}

            {isDeposit && (
              <Grid
                container
                sx={{
                  paddingBottom: '10px',
                }}
                justifyContent="space-between"
                alignItems="center"
              >
                <Grid item lg={9}>
                  <Typography
                    variant="fieldHeader"
                    sx={{
                      color: '#808897',
                    }}
                  >
                    {f('payment.deposit_total')}
                  </Typography>
                </Grid>
                <Grid item lg={3}>
                  <Typography variant="body2" sx={{ textAlign: 'right' }}>
                    {`${toCurrencyString(currencyKey, payTotal, false, regionalFormat)}`}
                  </Typography>
                </Grid>
              </Grid>
            )}

            <Grid
              container
              sx={{
                paddingTop: '10px',
                borderTop: '1px solid',
                borderTopColor: '#E0E0E0',
                marginTop: 2,
              }}
              justifyContent="space-between"
              alignItems="center"
            >
              <Grid item lg={9}>
                <Typography
                  variant="fieldHeader"
                  sx={{
                    color: '#808897',
                  }}
                >
                  {f('invoices.table.total')}
                </Typography>
              </Grid>
              <Grid item lg={3}>
                <Typography variant="body2" sx={{ textAlign: 'right' }}>
                  {`${toCurrencyString(currencyKey, amountToPay, false, regionalFormat)}`}
                </Typography>
              </Grid>
            </Grid>
          </Grid>

          <Grid
            item
            container
            sx={{
              padding: '1.3rem',
            }}
          >
            <Button
              variant="contained"
              color="primary"
              disabled={
                !canMakePayment ||
                amountToPay <= 0 ||
                isProcessing ||
                !startPay ||
                !paymentConfigLoaded
              }
              onClick={onPay}
              fullWidth
              sx={{
                ...(canMakePayment &&
                  amountToPay > 0 &&
                  !isProcessing &&
                  paymentConfigLoaded &&
                  startPay && {
                    border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                    '&:hover': {
                      border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                    },
                  }),
              }}
            >
              {f('payment.pay')}
            </Button>
          </Grid>
        </Grid>
      </EpayBox>
    </Grid>
  );
}
