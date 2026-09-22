import { useEffect, useState } from 'react';

import { useIntl } from 'react-intl';
import { useParams } from 'react-router';

import { Box, Grid, Link, Typography, useTheme } from '@mui/material';

import EpayBox from 'shared/components/EpayBox';
import { EpayUserService } from 'services/EpayUserService';

export default function ConfirmEmailChange() {
  const [confirm, setConfirm] = useState<boolean | null>(null);
  const [processing, setProcessing] = useState<boolean>(true);
  const intl = useIntl();
  const f = (id: string) => intl.formatMessage({ id, defaultMessage: id });
  const theme = useTheme();
  const confirmEmailChange = EpayUserService.useConfirmEmailChange();
  const { token } = useParams<string>();

  useEffect(() => {
    if (token) {
      confirmEmailChange(token)
        .then((resp: { code?: number }) => {
          setConfirm(resp?.code === 200);
        })
        .catch(() => {
          setConfirm(false);
        })
        .finally(() => {
          setProcessing(false);
        });
    } else {
      setConfirm(false);
      setProcessing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <Grid container sm={6} md={6} lg={6} spacing={1} direction="column">
      <Grid item container flexDirection="column" rowGap="2rem" marginY="1rem">
        <Grid item display="flex" flexDirection="column">
          <Typography variant="h1" sx={{ textTransform: 'capitalize' }}>
            {confirm
              ? f('settings.account.email_change.confirm_success_header')
              : f('settings.account.email_change.confirm_unsuccess_header')}
          </Typography>
        </Grid>
      </Grid>

      {!processing && (
        <Grid item sm={6} md={6} lg={6}>
          <EpayBox sx={{ p: 2.5 }}>
            {confirm ? (
              <Typography variant="body2" align="left">
                {f('settings.account.email_change.confirm_success')}
              </Typography>
            ) : (
              <Typography variant="body2" align="left" color="error">
                {f('settings.account.email_change.confirm_error')}
              </Typography>
            )}
          </EpayBox>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: '20px' }}>
            <Link href="/" sx={{ textDecoration: 'none' }}>
              <Typography
                variant="body1"
                sx={{ color: theme.palette.interactiveColor }}
              >
                {f('user.go_back_login')}
              </Typography>
            </Link>
          </Box>
        </Grid>
      )}

      {processing && (
        <Typography variant="body1" align="center">
          {f('loading')}
        </Typography>
      )}
    </Grid>
  );
}
