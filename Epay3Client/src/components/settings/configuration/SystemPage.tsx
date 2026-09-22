import { useEffect, useState } from 'react';

import { useIntl } from 'react-intl';

import Grid from '@mui/material/Grid';
import { Box, useTheme } from '@mui/system';
import { SystemConfig } from 'types/SystemConfig';
import { TextField, Typography } from '@mui/material';
import EpayButton from 'shared/components/EpayButton';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useEpayToast } from 'providers/EpayToastProvider';
import { EpayApplicationService } from 'services/EpayApplicationService';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

function SystemPage() {
  const intl = useIntl();
  const f = (id) => intl.formatMessage({ id: id });
  const theme = useTheme();
  const lgUp = useMediaQuery(theme.breakpoints.up('lg'));
  const getSystemConfig = EpayApplicationService.useGetSystemConfig();
  const initialSystemConfig: SystemConfig = {
    applicationUrl: '',
    companyName: '',
  };

  const [systemConfig, setSystemConfig] =
    useState<SystemConfig>(initialSystemConfig);
  const [applicationUrl, setApplicationUrl] = useState<string>('');
  const [applicationUrlError, setApplicationUrlError] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [companyNameError, setCompanyNameError] = useState<string>('');
  const { showToastMessage } = useEpayToast();

  useEffect(() => {
    getSystemConfig()
      .then((resp: SystemConfig) => {
        if (resp) {
          setSystemConfig(resp);
          setApplicationUrl(resp.applicationUrl);
          setCompanyName(resp.companyName);
        } else {
          showToastMessage('error', 'Failed to load system configuration.');
        }
      })
      .catch((error: Error) => {
        showToastMessage('error', error.message ?? error.toString());
      });
  }, []);

  const handleApplicationUrl = (e) => {
    const value = e;
    setApplicationUrl(value);
    if (value === '') {
      setApplicationUrlError('Application URL is required');
    } else {
      setApplicationUrlError('');
    }
  };

  const handleCompanyName = (e) => {
    const value = e;
    setCompanyName(value);
    if (value === '') {
      setCompanyNameError('Company Name is required');
    } else {
      setCompanyNameError('');
    }
  };

  const handleSubmit = () => {
    if (applicationUrl === '') {
      setApplicationUrlError('Application URL is required');
      return;
    }
    if (companyName === '') {
      setCompanyNameError('Company Name is required');
      return;
    }
  };

  return (
    <Box
      display="flex"
      width={lgUp ? 'calc(100% - 6rem)' : '100%'}
      justifyContent={lgUp ? 'flex-start' : 'center'}
      marginLeft={lgUp ? '3rem' : undefined}
      marginRight={lgUp ? '3rem' : undefined}
    >
      <Grid container direction="column" rowGap="2rem">
        <Grid item>
          <Typography variant="h4">
            {f('configuration.system.Parameters')}
          </Typography>
        </Grid>
        <Grid
          item
          container
          direction="column"
          rowGap="1.5rem"
          marginLeft="1.5rem"
          marginRight="1.5rem"
        >
          <Grid
            item
            container
            direction="row"
            alignItems="center"
            columnGap="4rem"
          >
            <Grid item lg={10}>
              <Grid
                container
                direction="row"
                alignItems="center"
                columnGap="1rem"
              >
                <Grid item lg={3}>
                  <Typography variant="body1">
                    {f('configuration.system.applicationurl')}
                  </Typography>
                </Grid>
                {systemConfig.applicationUrl && (
                  <Grid item lg={8}>
                    <TextField
                      type="text"
                      sx={(muiTheme) => ({
                        ...getCompactFilterFieldSx(muiTheme),
                      })}
                      placeholder={f('configuration.system.applicationurl')}
                      value={applicationUrl}
                      onChange={handleApplicationUrl}
                      helperText={applicationUrlError}
                      error={applicationUrlError !== ''}
                      required
                    />
                  </Grid>
                )}
              </Grid>
            </Grid>
          </Grid>

          <Grid
            item
            container
            direction="row"
            alignItems="center"
            columnGap="4rem"
          >
            <Grid item lg={10}>
              {systemConfig.companyName && (
                <Grid
                  container
                  direction="row"
                  alignItems="center"
                  columnGap="1rem"
                >
                  <Grid item lg={3}>
                    <Typography variant="body1">
                      {f('configuration.system.companyname')}
                    </Typography>
                  </Grid>
                  <Grid item lg={8}>
                    <TextField
                      type="text"
                      sx={(muiTheme) => ({
                        ...getCompactFilterFieldSx(muiTheme),
                      })}
                      placeholder={f('configuration.system.companyname')}
                      onChange={handleCompanyName}
                      value={companyName}
                      error={companyNameError !== ''}
                      helperText={companyNameError}
                      required
                    />
                  </Grid>
                </Grid>
              )}
            </Grid>
          </Grid>
        </Grid>

        <Grid
          item
          container
          width="100%"
          direction="row"
          height="auto"
          alignItems="center"
        >
          <Box
            sx={{
              marginTop: '1.5rem',
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <EpayButton
              variant="primary"
              type="submit"
              width="10rem"
              onClick={handleSubmit}
            >
              {f('configuration.application.saveconfiguration')}
            </EpayButton>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

export default SystemPage;
