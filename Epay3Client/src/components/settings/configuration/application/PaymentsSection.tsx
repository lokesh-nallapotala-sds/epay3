import { ChangeEvent, Dispatch, SetStateAction } from 'react';

import { Grid, MenuItem, Switch, TextField, Typography } from '@mui/material';
import { ApplicationConfigRequest } from 'types/AppConfigRequest';
import { useFormat } from 'hooks/useFormat';
import {
  compactFilterMenuItemSx,
  compactFilterSelectProps,
} from 'shared/components/compactFilterSelectStyles';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

interface PaymentsSectionProps {
  applicationConfig: ApplicationConfigRequest;
  setApplicationConfig: Dispatch<SetStateAction<ApplicationConfigRequest>>;
  isCompanyCodePaymentDisabled: boolean;
  enablePreAuth: boolean;
  messageLanguageError: boolean;
  setMessageLanguageError: Dispatch<SetStateAction<boolean>>;
  messageLanguageErrorText: string | undefined;
  setMessageLanguageErrorText: Dispatch<SetStateAction<string | undefined>>;
  messageTextError: boolean;
  setMessageTextError: Dispatch<SetStateAction<boolean>>;
  messageTextErrorText: string | undefined;
  setMessageTextErrorText: Dispatch<SetStateAction<string | undefined>>;
  addressValidationError: boolean;
  setAddressValidationError: Dispatch<SetStateAction<boolean>>;
  addressValidationErrorText: string | undefined;
  setAddressValidationErrorText: Dispatch<SetStateAction<string | undefined>>;
}

export default function PaymentsSection({
  applicationConfig,
  setApplicationConfig,
  isCompanyCodePaymentDisabled,
  enablePreAuth,
  messageLanguageError,
  setMessageLanguageError,
  messageLanguageErrorText,
  setMessageLanguageErrorText,
  messageTextError,
  setMessageTextError,
  messageTextErrorText,
  setMessageTextErrorText,
  addressValidationError,
  setAddressValidationError,
  addressValidationErrorText,
  setAddressValidationErrorText,
}: PaymentsSectionProps) {
  const f = useFormat();

  const messageLanguage: Record<string, string>[] = [
    { key: 'en', value: 'English' },
    { key: 'fr', value: 'French' },
    { key: 'de', value: 'German' },
    { key: 'es', value: 'Spanish' },
    { key: 'it', value: 'Italian' },
    { key: 'ja', value: 'Japanese' },
    { key: 'pt', value: 'Portuguese' },
    { key: 'ru', value: 'Russian' },
  ];
  const addressValidationOptions = [
    { key: 'Off', value: 'Off' },
    { key: 'zip', value: 'ZIP Only' },
    { key: 'full', value: 'Full Address' },
  ];
  const tokenizationMethodOptions = [
    { key: 'iframe', value: 'iFrame' },
    { key: 'hosted', value: 'Hosted Page' },
  ];

  const handleDisablePaymentsGlobally = (
    event: ChangeEvent<HTMLInputElement>,
    checked: boolean,
  ) => {
    setApplicationConfig({
      ...applicationConfig,
      disablePaymentsGlobally: checked,
    });
  };

  const handleMessageLanguage = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setApplicationConfig({
      ...applicationConfig,
      messageLanguage: event.target.value,
    });
    if (event.target.value === '') {
      setMessageLanguageError(true);
      setMessageLanguageErrorText('Required');
    } else {
      setMessageLanguageError(false);
      setMessageLanguageErrorText('');
    }
  };

  const handleMessageText = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    // Mirrors the select's messageLanguage[0] fallback below
    const languageKey = applicationConfig.messageLanguage || 'en';
    setApplicationConfig({
      ...applicationConfig,
      paymentDisableMessageText: {
        ...applicationConfig.paymentDisableMessageText,
        [languageKey]: event.target.value,
      },
    });
    if (!event.target.value.trim()) {
      setMessageTextError(true);
      setMessageTextErrorText(
        f('configuration.application.messagetext.required'),
      );
    } else {
      setMessageTextError(false);
      setMessageTextErrorText('');
    }
  };

  const handleEnableAddressValidation = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setApplicationConfig({
      ...applicationConfig,
      addressValidationOptions: event.target.value,
    });

    if (event.target.value === '') {
      setAddressValidationError(true);
      setAddressValidationErrorText('Required');
    } else {
      setAddressValidationError(false);
      setAddressValidationErrorText('');
    }
  };

  const handleTokenizationMethod = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setApplicationConfig({
      ...applicationConfig,
      paymentIntegrationType: event.target.value as 'iframe' | 'hosted',
    });
  };

  const handleMaxCreditPaymentAllowed = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setApplicationConfig({
      ...applicationConfig,
      maxPaymentAllowed: event.target.value,
    });
  };

  const handleMaxCheckPaymentAllowed = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setApplicationConfig({
      ...applicationConfig,
      maxECheckPaymentAllowed:
        event.target.value?.trim().length === 0 ? '' : event.target.value,
    });
  };

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
              lg: '100%',
            },
          }}
        >
          {f('configuration.application.payments')}
        </Typography>
      </Grid>
      <Grid item container direction="row" alignItems="center">
        <Grid item xs={6}>
          <Typography variant="h6">
            {f('configuration.application.disablepaymentsglobally')}
          </Typography>
        </Grid>
        <Grid item xs={6} container justifyContent="flex-end">
          <Grid item>
            <Switch
              disabled={isCompanyCodePaymentDisabled}
              color="primary"
              checked={
                isCompanyCodePaymentDisabled ||
                applicationConfig.disablePaymentsGlobally
              }
              onChange={handleDisablePaymentsGlobally}
              sx={{ width: '49px', padding: '12px 4px 12px 12px' }}
            />
          </Grid>
        </Grid>
      </Grid>
      <Grid item container direction="row" alignItems="center">
        <Grid item xs={6}>
          <Typography variant="h6">
            {f('configuration.application.messagelanguage')}
          </Typography>
        </Grid>
        <Grid item xs={6} container justifyContent="flex-end">
          <TextField
            select
            fullWidth
            sx={(muiTheme) => ({
              ...getCompactFilterFieldSx(muiTheme),
            })}
            value={applicationConfig.messageLanguage || messageLanguage[0]?.key}
            onChange={handleMessageLanguage}
            error={messageLanguageError}
            helperText={messageLanguageErrorText}
            SelectProps={compactFilterSelectProps}
          >
            {messageLanguage.map((option) => (
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
            {f('configuration.application.messagetext')}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <TextField
            type="text"
            multiline
            rows={4}
            fullWidth
            sx={(muiTheme) => ({
              ...getCompactFilterFieldSx(muiTheme),
            })}
            value={
              applicationConfig?.paymentDisableMessageText?.[
                applicationConfig.messageLanguage || 'en'
              ] || ''
            }
            onChange={handleMessageText}
            error={messageTextError}
            helperText={messageTextErrorText}
          />
        </Grid>
      </Grid>
      {enablePreAuth && (
        <Grid item container direction="row" alignItems="center">
          <Grid item xs={6}>
            <Typography variant="h6">
              {f('configuration.application.enableAddressValidation')}
            </Typography>
          </Grid>
          <Grid item xs={6} container justifyContent="flex-end">
            <TextField
              select
              fullWidth
              sx={(muiTheme) => ({
                ...getCompactFilterFieldSx(muiTheme),
              })}
              value={
                applicationConfig.addressValidationOptions ||
                addressValidationOptions[0]?.key
              }
              onChange={handleEnableAddressValidation}
              error={addressValidationError}
              helperText={addressValidationErrorText}
              SelectProps={compactFilterSelectProps}
            >
              {addressValidationOptions.map((option) => (
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
      )}
      <Grid item container direction="row" alignItems="center">
        <Grid item xs={6}>
          <Typography variant="h6">
            {f('configuration.application.tokenizationmethod')}
          </Typography>
        </Grid>
        <Grid item xs={6} container justifyContent="flex-end">
          <TextField
            select
            fullWidth
            sx={(muiTheme) => ({
              ...getCompactFilterFieldSx(muiTheme),
            })}
            value={
              (
                applicationConfig.paymentIntegrationType ||
                (applicationConfig as any).PaymentIntegrationType
              )?.toLowerCase() || tokenizationMethodOptions[0]?.key
            }
            onChange={handleTokenizationMethod}
            SelectProps={compactFilterSelectProps}
          >
            {tokenizationMethodOptions.map((option) => (
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
            {f('configuration.application.maximumcreditpaymentallowed')}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <TextField
            type="number"
            fullWidth
            sx={(muiTheme) => ({
              ...getCompactFilterFieldSx(muiTheme),
            })}
            placeholder={f(
              'configuration.application.maximumcreditpaymentallowed',
            )}
            value={applicationConfig.maxPaymentAllowed || ''}
            onChange={handleMaxCreditPaymentAllowed}
          />
        </Grid>
      </Grid>
      <Grid item container direction="row" alignItems="center">
        <Grid item xs={6}>
          <Typography variant="h6">
            {f('configuration.application.maximumecheckpaymentallowed')}
          </Typography>
        </Grid>
        <Grid item xs={6} container justifyContent="flex-end">
          <TextField
            type="number"
            fullWidth
            sx={(muiTheme) => ({
              ...getCompactFilterFieldSx(muiTheme),
            })}
            placeholder={f(
              'configuration.application.maximumecheckpaymentallowed',
            )}
            value={applicationConfig.maxECheckPaymentAllowed || ''}
            onChange={handleMaxCheckPaymentAllowed}
          />
        </Grid>
      </Grid>
    </>
  );
}
