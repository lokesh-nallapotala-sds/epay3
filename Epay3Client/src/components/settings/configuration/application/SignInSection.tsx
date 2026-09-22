import { ChangeEvent, Dispatch, SetStateAction } from 'react';

import { Grid, MenuItem, Switch, TextField, Typography } from '@mui/material';
import { ApplicationConfigRequest } from 'types/AppConfigRequest';
import { useFormat } from 'hooks/useFormat';
import {
  compactFilterMenuItemSx,
  compactFilterSelectProps,
} from 'shared/components/compactFilterSelectStyles';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

interface SignInSectionProps {
  applicationConfig: ApplicationConfigRequest;
  setApplicationConfig: Dispatch<SetStateAction<ApplicationConfigRequest>>;
  registrationEmailErrorText: string | undefined;
  setRegistrationEmailErrorText: Dispatch<SetStateAction<string | undefined>>;
  expirationChangeError: boolean;
  setExpirationChangeError: Dispatch<SetStateAction<boolean>>;
  expirationChangeErrorText: string | undefined;
  setExpirationChangeErrorText: Dispatch<SetStateAction<string | undefined>>;
  expirationMessageError: boolean;
  setExpirationMessageError: Dispatch<SetStateAction<boolean>>;
  expirationMessageErrorText: string | undefined;
  setExpirationMessageErrorText: Dispatch<SetStateAction<string | undefined>>;
}

export default function SignInSection({
  applicationConfig,
  setApplicationConfig,
  registrationEmailErrorText,
  setRegistrationEmailErrorText,
  expirationChangeError,
  setExpirationChangeError,
  expirationChangeErrorText,
  setExpirationChangeErrorText,
  expirationMessageError,
  setExpirationMessageError,
  expirationMessageErrorText,
  setExpirationMessageErrorText,
}: SignInSectionProps) {
  const f = useFormat();

  const emailExpiration: Record<string, string>[] = [
    { key: '6', value: '6 Hours' },
    { key: '12', value: '12 Hours' },
    { key: '24', value: '24 Hours' },
    { key: '48', value: '48 Hours' },
    { key: 'Never', value: 'Never' },
  ];

  const handleAllowGuestPayment = (
    event: ChangeEvent<HTMLInputElement>,
    checked: boolean,
  ) => {
    setApplicationConfig({
      ...applicationConfig,
      allowGuestPayment: checked,
    });
  };

  const handleAllowRegistration = (
    event: ChangeEvent<HTMLInputElement>,
    checked: boolean,
  ) => {
    setApplicationConfig({
      ...applicationConfig,
      allowRegistration: checked,
    });
    if (!checked)
      setApplicationConfig({
        ...applicationConfig,
        allowRegistration: false,
      });
  };

  const handleRegistrationEmail = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const value = event.target.value;
    setApplicationConfig({
      ...applicationConfig,
      registrationEmail: value,
    });
    if (value === '') {
      setRegistrationEmailErrorText(
        f('configuration.application.registrationemail.required'),
      );
    } else {
      setRegistrationEmailErrorText('');
    }
  };

  const handleExpirationChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setApplicationConfig({
      ...applicationConfig,
      registrationEmailExpiration: event.target.value,
    });
    if (event.target.value === ' ') {
      setExpirationChangeError(true);
      setExpirationChangeErrorText('Required');
    } else {
      setExpirationChangeError(false);
      setExpirationChangeErrorText('');
    }
  };

  const handleExpirationMessage = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setApplicationConfig({
      ...applicationConfig,
      expirationMessage: event.target.value,
    });
    if (!event.target.value.trim()) {
      setExpirationMessageError(true);
      setExpirationMessageErrorText(
        f('configuration.application.expirationmessage.required'),
      );
    } else {
      setExpirationMessageError(false);
      setExpirationMessageErrorText('');
    }
  };

  return (
    <>
      <Grid item>
        <Typography variant="h2">
          {f('configuration.application.signin')}
        </Typography>
      </Grid>
      <Grid item container direction="row" alignItems="center">
        <Grid item xs={6}>
          <Typography variant="h6">
            {f('configuration.application.allowguestpayment')}
          </Typography>
        </Grid>
        <Grid item xs={6} container justifyContent="flex-end">
          <Grid item>
            <Switch
              color="primary"
              checked={applicationConfig.allowGuestPayment}
              onChange={handleAllowGuestPayment}
              sx={{ width: '49px', padding: '12px 4px 12px 12px' }}
            />
          </Grid>
        </Grid>
      </Grid>
      <Grid item container direction="row" alignItems="center">
        <Grid item xs={6}>
          <Typography variant="h6">
            {f('configuration.application.allowregistration')}
          </Typography>
        </Grid>
        <Grid item xs={6} container justifyContent="flex-end">
          <Grid item>
            <Switch
              checked={applicationConfig.allowRegistration}
              onChange={handleAllowRegistration}
              color="primary"
              sx={{ width: '49px', padding: '12px 4px 12px 12px' }}
            />
          </Grid>
        </Grid>
      </Grid>
      <Grid item container direction="row" alignItems="center">
        <Grid item xs={6}>
          <Typography variant="h6">
            {f('configuration.application.registrationemail')}
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
                value={applicationConfig.registrationEmail || ''}
                onChange={handleRegistrationEmail}
                error={applicationConfig.registrationEmail === ''}
                helperText={registrationEmailErrorText}
              />
            </Grid>
            <Grid item>
              <Typography variant="subheader">
                {f('configuration.application.registrationemail.hint')}
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      <Grid item container direction="row" alignItems="center">
        <Grid item xs={6}>
          <Typography variant="h6">
            {f('configuration.application.registrationemailexpiration')}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <TextField
            select
            fullWidth
            sx={(muiTheme) => ({
              ...getCompactFilterFieldSx(muiTheme),
            })}
            value={
              applicationConfig.registrationEmailExpiration ||
              emailExpiration[0]?.key
            }
            onChange={handleExpirationChange}
            error={expirationChangeError}
            helperText={expirationChangeErrorText}
            SelectProps={compactFilterSelectProps}
          >
            {emailExpiration.map((option) => (
              <MenuItem
                key={option.key}
                value={option.key}
                sx={compactFilterMenuItemSx}
              >
                <Typography variant="body2">{option.value}</Typography>
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>
      <Grid item container direction="row" alignItems="center">
        <Grid item xs={6}>
          <Typography variant="h6">
            {f('configuration.application.expirationmessage')}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Grid container direction="column" rowGap=".5rem">
            <Grid item>
              <TextField
                type="text"
                multiline
                fullWidth
                rows={2}
                sx={(muiTheme) => ({
                  ...getCompactFilterFieldSx(muiTheme),
                })}
                placeholder={f('configuration.application.messagetext')}
                value={applicationConfig.expirationMessage || ''}
                onChange={handleExpirationMessage}
                error={expirationMessageError}
                helperText={expirationMessageErrorText}
              />
            </Grid>
            <Grid item>
              <Typography variant="subheader">
                {f('configuration.application.expirationmessage.hint')}
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
}
