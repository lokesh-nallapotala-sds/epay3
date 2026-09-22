import { useIntl } from 'react-intl';

import { Box, Button, Grid, Link, Typography, useTheme } from '@mui/material';

import EpayBox from 'shared/components/EpayBox';
import { EpayUserService } from 'services/EpayUserService';
import { useEpayToast } from '../../../providers/EpayToastProvider';

export default function WaitingConfirmation() {
  const intl = useIntl();
  const f = (id) => intl.formatMessage({ id: id });
  const { showToastMessage } = useEpayToast();
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email') || '';
  const theme = useTheme();
  const resendConfirmationEmail = EpayUserService.useResendEmail();
  async function resendEmail() {
    const response = await resendConfirmationEmail(email);
    if (response?.emailError) {
      showToastMessage(
        'warning',
        response.emailError.message ?? f(response.emailError.code),
      );
    }
  }

  return (
    <Grid container sm={6} md={6} lg={6} spacing={1} direction={'column'}>
      <Grid item paddingBottom=".9rem">
        <Typography
          variant="h1"
          sx={{ textTransform: 'capitalize' }}
          align="left"
        >
          {f('user.account.waitingtext')}
        </Typography>
      </Grid>
      <Grid item sm={6} md={6} lg={6}>
        <EpayBox sx={{ padding: '20px' }}>
          <Typography variant="body2" align="left">
            {f('user.account.waiting.confirmation')}
          </Typography>
          <Button
            variant="contained"
            sx={{
              marginTop: '10px',
              border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
              '&:hover': {
                border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
              },
            }}
            onClick={resendEmail}
          >
            {f('user.register.resend.confirmation.email')}
          </Button>
        </EpayBox>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: '20px' }}>
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
      </Grid>
    </Grid>
  );
}
