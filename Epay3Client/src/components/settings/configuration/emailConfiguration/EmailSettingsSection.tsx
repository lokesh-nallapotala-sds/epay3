import { ChangeEvent, FocusEventHandler } from 'react';

import { useIntl } from 'react-intl';

import Grid from '@mui/material/Grid';
import { EmailConfigRequest } from 'types/AppConfigRequest';
import { TextField, Typography } from '@mui/material';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

interface EmailSettingsSectionProps {
  smtpConfig: EmailConfigRequest;
  testAddressError: string;
  addressNameError: string;
  fromAddressError: string;
  applicationUrlError: string;
  companyNameError: string;
  securityEmailError: string;
  handleTestAddress: (event: ChangeEvent<HTMLInputElement>) => void;
  handleAddressName: (event: ChangeEvent<HTMLInputElement>) => void;
  handleFromAddress: (event: ChangeEvent<HTMLInputElement>) => void;
  validateAndFormatUrl: FocusEventHandler<
    HTMLInputElement | HTMLTextAreaElement
  >;
  handleApplicationUrl: (event: ChangeEvent<HTMLInputElement>) => void;
  handleCompanyName: (event: ChangeEvent<HTMLInputElement>) => void;
  handleSecurityEmail: (event: ChangeEvent<HTMLInputElement>) => void;
}

function EmailSettingsSection({
  smtpConfig,
  testAddressError,
  addressNameError,
  fromAddressError,
  applicationUrlError,
  companyNameError,
  securityEmailError,
  handleTestAddress,
  handleAddressName,
  handleFromAddress,
  validateAndFormatUrl,
  handleApplicationUrl,
  handleCompanyName,
  handleSecurityEmail,
}: EmailSettingsSectionProps) {
  const intl = useIntl();
  const f = (id) => intl.formatMessage({ id: id });

  return (
    <>
      <Grid item>
        <Typography
          variant="h2"
          sx={{
            width: {
              xs: '100%',
              sm: '100%',
              md: '100%',
              lg: '1106px',
            },
          }}
        >
          {f('configuration.email.settings')}
        </Typography>
      </Grid>
      <Grid item container direction="row" alignItems="center">
        <Grid item xs={6}>
          <Typography variant="h6">
            {f('configuration.email.test_address_label')}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Grid container direction="column" rowGap=".5rem">
            <Grid item>
              <TextField
                type="text"
                fullWidth
                sx={(muiTheme) => ({
                  ...getCompactFilterFieldSx(muiTheme),
                })}
                value={smtpConfig.overrideEmail}
                onChange={handleTestAddress}
                error={!!testAddressError}
                helperText={testAddressError}
              />
            </Grid>
            <Grid item>
              <Typography variant="subheader">
                {f('configuration.email.test_request_address_desc')}
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      <Grid item container direction="row" alignItems="center">
        <Grid item xs={6}>
          <Typography variant="h6">
            {f('configuration.email.from_address_name')}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <TextField
            type="text"
            fullWidth
            sx={(muiTheme) => ({
              ...getCompactFilterFieldSx(muiTheme),
            })}
            value={smtpConfig.fromAddressName}
            onChange={handleAddressName}
            error={!!addressNameError}
            helperText={addressNameError}
          />
        </Grid>
      </Grid>
      <Grid item container direction="row" alignItems="center">
        <Grid item xs={6}>
          <Typography variant="h6">
            {f('configuration.email.from_address_label')}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <TextField
            type="text"
            fullWidth
            sx={(muiTheme) => ({
              ...getCompactFilterFieldSx(muiTheme),
            })}
            value={smtpConfig.fromAddress}
            onChange={handleFromAddress}
            error={!!fromAddressError}
            helperText={fromAddressError}
          />
        </Grid>
      </Grid>
      <Grid item container direction="row" alignItems="center">
        <Grid item xs={6}>
          <Typography variant="h6">
            {f('configuration.system.applicationurl')}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Grid container direction="column" rowGap=".5rem">
            <Grid item>
              <TextField
                type="text"
                fullWidth
                sx={(muiTheme) => ({
                  ...getCompactFilterFieldSx(muiTheme),
                })}
                value={smtpConfig.applicationUrl}
                onBlur={validateAndFormatUrl}
                onChange={handleApplicationUrl}
                error={!!applicationUrlError}
                helperText={applicationUrlError}
              />
            </Grid>
            <Grid item>
              <Typography variant="subheader">
                {f('configuration.system.applicationurl_desc')}
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      <Grid item container direction="row" alignItems="center">
        <Grid item xs={6}>
          <Typography variant="h6">
            {f('configuration.system.companyname')}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <TextField
            type="text"
            fullWidth
            sx={(muiTheme) => ({
              ...getCompactFilterFieldSx(muiTheme),
            })}
            placeholder={f('configuration.system.companyname')}
            onChange={handleCompanyName}
            value={smtpConfig.companyName}
            error={!!companyNameError}
            helperText={companyNameError}
          />
        </Grid>
      </Grid>
      <Grid item container direction="row" alignItems="center">
        <Grid item xs={6}>
          <Typography variant="h6">
            {f('configuration.email.security_email_label')}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Grid container direction="column" rowGap=".5rem">
            <Grid item>
              <TextField
                type="text"
                fullWidth
                sx={(muiTheme) => ({
                  ...getCompactFilterFieldSx(muiTheme),
                })}
                value={smtpConfig.securityEmail}
                onChange={handleSecurityEmail}
                error={!!securityEmailError}
                helperText={securityEmailError}
              />
            </Grid>
            <Grid item>
              <Typography variant="subheader">
                {f('configuration.email.security_email_desc')}
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
}

export default EmailSettingsSection;
