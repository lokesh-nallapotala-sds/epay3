import { useState } from 'react';

import {
  Box,
  Button,
  Grid,
  Link,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';

import EpayBox from 'shared/components/EpayBox';
import { validateEmail } from 'utilities/utilities';
import { EpayUserService } from 'services/EpayUserService';
import { useEpayToast } from 'providers/EpayToastProvider';
import useEpayNavigate from 'hooks/useEpayNavigate';
import { useFormat } from 'hooks/useFormat';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

function ForgotPassword() {
  const { navigate } = useEpayNavigate();
  const f = useFormat();
  const theme = useTheme();
  const resetPassword = EpayUserService.useResetPassword();
  const { showToastMessage } = useEpayToast();
  const [email, setEmail] = useState<string>('');
  const [emailError, setEmailError] = useState('');
  function handleEmailChange(event): void {
    setEmail(event.target.value);
    const email = event.target.value;
    if (email.trim() === '') {
      setEmailError(f('user.error.email'));
    } else if (!validateEmail(email.trim())) {
      setEmailError(f('user.error.email.bad'));
    } else {
      setEmailError('');
    }
  }

  const handleResetPassword = (e) => {
    e.preventDefault();
    if (email.trim() === '') {
      setEmailError(f('user.error.email'));
      return;
    }
    if (!validateEmail(email.trim())) {
      setEmailError(f('user.error.email.bad'));
      return;
    }

    try {
      resetPassword(email).then((resp) => {
        const respData = resp?.data as any;
        if (respData?.emailError) {
          showToastMessage(
            'warning',
            respData.emailError.message ?? f(respData.emailError.code),
          );
        }
        if (resp?.code === 200) {
          navigate('/reset-password-confirmation');
        } else {
          showToastMessage('error', f('app.common.error.message'));
        }
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      showToastMessage('error', errorMessage);
    }
  };
  return (
    <Grid
      container
      item
      sm={6}
      md={6}
      lg={6}
      spacing={2}
      direction={'column'}
      sx={{ mt: '20px' }}
    >
      <Grid item>
        <EpayBox sx={{ padding: '20px' }}>
          <Grid container spacing={1} direction={'column'}>
            <Grid item>
              <Typography
                variant="body2"
                fontWeight="500"
                sx={{
                  '&::after': {
                    content: '" *"',
                    color: 'red',
                    marginTop: '4px',
                  },
                }}
              >
                {f('user.forgotpassword.emailheader')}
              </Typography>
            </Grid>
            <Grid item>
              <TextField
                type="text"
                fullWidth
                value={email}
                onChange={handleEmailChange}
                error={!!emailError}
                helperText={emailError}
                sx={(muiTheme) => ({
                  ...getCompactFilterFieldSx(muiTheme),
                })}
              />
            </Grid>
            <Grid
              item
              marginTop=".75rem"
              sx={{ display: 'flex', justifyContent: 'flex-end' }}
            >
              <Button
                variant="contained"
                onClick={handleResetPassword}
                sx={{
                  border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                  '&:hover': {
                    border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                  },
                }}
              >
                {f('user.forgotpassword.submit')}
              </Button>
            </Grid>
          </Grid>
        </EpayBox>
      </Grid>
      <Grid item sm={3} md={3} lg={6}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
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

export default ForgotPassword;
