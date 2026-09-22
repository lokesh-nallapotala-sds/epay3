import { ChangeEvent } from 'react';

import { useIntl } from 'react-intl';

import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/system';
import { EmailConfigRequest } from 'types/AppConfigRequest';
import { Button, Switch, TextField, Typography } from '@mui/material';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

import { MASKED_PASSWORD } from './useSmtpConfigForm';

const flushEndSwitchSx = { marginRight: '-9px' } as const;

interface SmtpSectionProps {
  smtpConfig: EmailConfigRequest;
  smtpAddressError: string;
  smtpPortError: string;
  smtpUserError: string;
  smtpPasswordError: string;
  handleSmtpAddress: (event: ChangeEvent<HTMLInputElement>) => void;
  handleSmtpPort: (event: ChangeEvent<HTMLInputElement>) => void;
  handleEmailAuth: (event: ChangeEvent<HTMLInputElement>) => void;
  handleSmtpUser: (event: ChangeEvent<HTMLInputElement>) => void;
  handleSmtpPassword: (event: ChangeEvent<HTMLInputElement>) => void;
  sendTestEmail: () => void;
}

function SmtpSection({
  smtpConfig,
  smtpAddressError,
  smtpPortError,
  smtpUserError,
  smtpPasswordError,
  handleSmtpAddress,
  handleSmtpPort,
  handleEmailAuth,
  handleSmtpUser,
  handleSmtpPassword,
  sendTestEmail,
}: SmtpSectionProps) {
  const intl = useIntl();
  const f = (id) => intl.formatMessage({ id: id });
  const theme = useTheme();

  return (
    <>
      <Grid item container direction="row" alignItems="center">
        <Grid item xs={6}>
          <Typography variant="h6">
            {f('configuration.email.smtp_address_label')}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <TextField
            type="text"
            fullWidth
            required
            sx={(muiTheme) => ({
              ...getCompactFilterFieldSx(muiTheme),
            })}
            value={smtpConfig.smtpAddress}
            onChange={handleSmtpAddress}
            error={smtpAddressError !== ''}
            helperText={smtpAddressError}
          />
        </Grid>
      </Grid>
      <Grid item container direction="row" alignItems="center">
        <Grid item xs={6}>
          <Typography variant="h6">
            {f('configuration.email.smtp_port_label')}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <TextField
            type="text"
            fullWidth
            required
            sx={(muiTheme) => ({
              ...getCompactFilterFieldSx(muiTheme),
            })}
            value={smtpConfig.smtpPort}
            onChange={handleSmtpPort}
            error={smtpPortError !== ''}
            helperText={smtpPortError}
          />
        </Grid>
      </Grid>
      <Grid item container direction="row" alignItems="center">
        <Grid item xs={6}>
          <Typography variant="h6">
            {f('configuration.email_use_auth_user')}
          </Typography>
        </Grid>
        <Grid item xs={6} container justifyContent="flex-end">
          <Grid item>
            <Switch
              color="primary"
              checked={smtpConfig.smtpUseUser}
              onChange={(event) => handleEmailAuth(event)}
              sx={flushEndSwitchSx}
            />
          </Grid>
        </Grid>
      </Grid>
      {smtpConfig.smtpUseUser && (
        <>
          <Grid item container direction="row" alignItems="center">
            <Grid item xs={6}>
              <Typography variant="h6">
                {f('configuration.email.smtp_user_label')}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <TextField
                type="text"
                fullWidth
                required
                sx={(muiTheme) => ({
                  ...getCompactFilterFieldSx(muiTheme),
                })}
                value={smtpConfig.smtpUser}
                onChange={handleSmtpUser}
                error={!!smtpUserError}
                helperText={smtpUserError}
              />
            </Grid>
          </Grid>
          <Grid item container direction="row" alignItems="center">
            <Grid item xs={6}>
              <Typography variant="h6">
                {f('configuration.email.smtp_password_label')}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <TextField
                type="password"
                fullWidth
                required
                sx={(muiTheme) => ({
                  ...getCompactFilterFieldSx(muiTheme),
                })}
                value={
                  smtpConfig.smtpPassword === ''
                    ? MASKED_PASSWORD
                    : smtpConfig.smtpPassword
                }
                onChange={handleSmtpPassword}
                error={!!smtpPasswordError}
                helperText={smtpPasswordError}
              />
            </Grid>
          </Grid>
        </>
      )}
      <Grid item container direction="row" alignItems="center">
        <Grid item xs={6}>
          {''}
        </Grid>
        <Grid item xs={6} container justifyContent="flex-end">
          <Grid item>
            <Button
              type="button"
              variant="contained"
              color="primary"
              size="small"
              onClick={sendTestEmail}
              sx={{
                border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                '&:hover': {
                  border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                },
              }}
            >
              {f('configuration.email.smtp_test_email_button')}
            </Button>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
}

export default SmtpSection;
