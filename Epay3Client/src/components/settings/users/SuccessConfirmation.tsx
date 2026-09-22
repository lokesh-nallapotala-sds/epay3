import { useIntl } from 'react-intl';

import { Box, Grid, Link, Typography, useTheme } from '@mui/material';

import EpayBox from 'shared/components/EpayBox';
import useEpayNavigate from 'hooks/useEpayNavigate';

export default function SuccessConfirmation() {
  const intl = useIntl();
  const f = (id: string) =>
    intl.formatMessage({
      id: id,
    });
  const theme = useTheme();
  const { location } = useEpayNavigate();
  const pageName = location?.state?.page;
  return (
    <Grid container sm={6} md={6} lg={6} spacing={1} direction={'column'}>
      <Grid
        item
        container
        flexDirection="column"
        rowGap="2rem"
        marginTop={1}
        paddingBottom=".9rem"
      >
        <Grid item display="flex" flexDirection="column">
          <Typography variant="h1" mt="6px">
            {f('app.common.success')}
          </Typography>
        </Grid>
      </Grid>
      <Grid item sm={6} md={6} lg={6}>
        <EpayBox sx={{ p: 2.5, border: '1px solid', borderColor: '#0F973D' }}>
          {pageName && pageName == 'recoverysuccess' ? (
            <Typography variant="body2" color="#0F973D" align="left">
              {f('admin.recovery.success')}
            </Typography>
          ) : (
            <Typography variant="body2" color="#0F973D" align="left">
              {f('user.account.success')}
            </Typography>
          )}
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
