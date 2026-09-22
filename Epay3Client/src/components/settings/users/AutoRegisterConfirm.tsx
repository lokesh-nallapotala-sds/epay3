import { useEffect, useState } from 'react';

import { useParams } from 'react-router';

import { Box, Grid, Link, Typography, useTheme } from '@mui/material';

import EpayBox from 'shared/components/EpayBox';
import { EpayUserService } from 'services/EpayUserService';
import { useFormat } from 'hooks/useFormat';

export default function AutoRegisterConfirm() {
  const [confirm, setConfirm] = useState<boolean | null>(null);
  const [processing, setProcessing] = useState<boolean>(true);
  const f = useFormat();
  const theme = useTheme();
  const confirmAccount = EpayUserService.useConfirmAccount();
  const { token } = useParams<string>();

  useEffect(() => {
    if (token) {
      confirmAccount(token)
        .then((resp: { code?: number }) => {
          if (resp?.code === 200) {
            setConfirm(true);
          } else {
            setConfirm(false);
          }
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
  }, [token]);

  return (
    <Grid container sm={6} md={6} lg={6} spacing={1} direction="column">
      <Grid item container flexDirection="column" rowGap="2rem" marginY="1rem">
        <Grid item display="flex" flexDirection="column">
          {confirm ? (
            <Typography variant="h1" sx={{ textTransform: 'capitalize' }}>
              {f('user.register.confirm_success_header')}
            </Typography>
          ) : (
            <Typography variant="h1" sx={{ textTransform: 'capitalize' }}>
              {f('user.register.confirm_unsuccess_header')}
            </Typography>
          )}
        </Grid>
      </Grid>

      {!processing && (
        <Grid item sm={6} md={6} lg={6}>
          <EpayBox sx={{ p: 2.5 }}>
            {processing ? (
              <Typography variant="body1" align="center"></Typography>
            ) : confirm ? (
              <Typography variant="body2" align="left">
                {f('user.register.confirm_success')}
              </Typography>
            ) : (
              <Typography variant="body2" align="left" color="error">
                {f('user.register.confirm_error') ||
                  f('user.register.validation_error')}
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
