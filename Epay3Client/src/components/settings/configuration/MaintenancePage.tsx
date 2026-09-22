import { ChangeEvent, useEffect, useState } from 'react';

import dayjs from 'dayjs';

import utc from 'dayjs/plugin/utc';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { MaintenanceConfigRequest } from 'types/AppConfigRequest';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useEpayToast } from 'providers/EpayToastProvider';
import { EpayApplicationService } from 'services/EpayApplicationService';
import { useFormat } from 'hooks/useFormat';
import {
  Box,
  Button,
  Grid,
  MenuItem,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  compactFilterMenuItemSx,
  compactFilterSelectProps,
} from 'shared/components/compactFilterSelectStyles';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

dayjs.extend(utc);

const flushEndSwitchSx = { marginRight: '-9px' } as const;

function MaintenancePage() {
  const theme = useTheme();

  const lgUp = useMediaQuery(theme.breakpoints.up('lg'));

  const f = useFormat();

  const updateMaintenanceConfig =
    EpayApplicationService.useUpdateMaintenanceConfig();
  const getMaintenanceConfig = EpayApplicationService.useGetMaintenanceConfig();

  const { showToastMessage } = useEpayToast();

  const [notificationLanguage, setNotificationLanguage] =
    useState<string>('en');
  const [notificationLanguageError, setNotificationLanguageError] =
    useState<string>('');
  const [isSignInDisable, setIsSignInDisable] = useState<boolean>(false);
  const [notificationText, setNotificationText] = useState<{
    [key: string]: string;
  }>({});

  const [notificationTextError, setNotificationTextError] =
    useState<string>('');
  const [maintenanceUrl, setMaintenanceUrl] = useState<string>('');
  const [fromDateLocal, setFromDateLocal] = useState(dayjs(new Date()));
  const [toDateLocal, setToDateLocal] = useState(dayjs(new Date()));

  useEffect(() => {
    getMaintenanceConfig().then((resp: MaintenanceConfigRequest) => {
      setFromDateLocal(
        resp.fromDateLocal ? dayjs(resp.fromDateLocal).local() : dayjs(),
      );

      setToDateLocal(
        resp.toDateLocal ? dayjs(resp.toDateLocal).local() : dayjs(),
      );
      setNotificationLanguage(resp.notificationLanguage || '');
      setNotificationText(resp.notificationText || '');
      setIsSignInDisable(resp.isSignInDisable ?? false);
      setMaintenanceUrl(resp.maintenanceUrl || '');
    });
  }, []);

  const languages = [
    { key: 'en', label: 'English' },
    { key: 'fr', label: 'French' },
    { key: 'de', label: 'German' },
    { key: 'es', label: 'Spanish' },
    { key: 'it', label: 'Italian' },
    { key: 'ja', label: 'Japanese' },
    { key: 'pt', label: 'Portuguese' },
    { key: 'ru', label: 'Russian' },
  ];

  function handleIsSignInDisable(event: ChangeEvent<HTMLInputElement>) {
    setIsSignInDisable(event.target.checked);
  }

  function handleNotificationLanguage(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const s = e.target.value;
    if (s.length > 0) setNotificationLanguageError('');
    setNotificationLanguage(s);
    // Update notification text based on the selected language
    setNotificationText((prev) => ({
      ...prev,
      [s]: prev[s] || '', // Retain existing value for the language or set it to an empty string
    }));
  }

  function handleNotificationText(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const s = e.target.value;
    if (s.length > 0) setNotificationTextError('');
    // Update the specific key in the object
    setNotificationText((prev) => ({
      ...prev,
      [notificationLanguage]: s, // Dynamically update the key with the new value
    }));
  }

  const handleFromDateChange = (newValue) => {
    if (newValue) {
      setFromDateLocal(newValue);
    }
  };
  const handleToDateChange = (newValue) => {
    if (newValue) {
      setToDateLocal(newValue);
    }
  };

  const handleSubmit = () => {
    let hasError = false;
    if (
      !notificationText[notificationLanguage] || // Check if key exists and is not undefined/null
      notificationText[notificationLanguage].trim().length === 0 // Validate trimmed length
    ) {
      setNotificationTextError('Notification Text is required');
      hasError = true;
    }
    if (notificationLanguage.trim().length === 0) {
      setNotificationLanguageError(f('Language is required'));
      hasError = true;
    }

    if (hasError) return;

    const request: MaintenanceConfigRequest = {
      isSignInDisable: isSignInDisable,
      notificationLanguage: notificationLanguage,
      notificationText: notificationText,
      maintenanceUrl: maintenanceUrl,
      fromDateLocal: fromDateLocal.utc().format(),
      toDateLocal: toDateLocal.utc().format(),
    };

    updateMaintenanceConfig(request, notificationLanguage)
      .then(() => {
        showToastMessage(
          'success',
          f('configuration.saved_configuration_message'),
        );
      })
      .catch((error: Error) => {
        showToastMessage('error', error.message ?? error.toString());
      });
  };

  return (
    <Box
      display="flex"
      width="100%"
      justifyContent={lgUp ? 'flex-start' : 'center'}
    >
      <Grid container direction="column" rowGap="1.5rem">
        {/*******************************Settings***********************************/}
        <Grid item>
          <Typography variant="h2">
            {f('configuration.system_maintenance.settings')}
          </Typography>
        </Grid>

        <Grid item container direction="column" rowGap="1.5rem">
          <Grid item container direction="row" alignItems="center">
            <Grid item xs={6}>
              <Typography variant="h6">
                {f('configuration.system_maintenance_UserLogins')}
              </Typography>
            </Grid>
            <Grid item xs={6} container justifyContent="flex-end">
              <Grid item>
                <Switch
                  color="primary"
                  checked={isSignInDisable}
                  onChange={handleIsSignInDisable}
                  sx={flushEndSwitchSx}
                />
              </Grid>
            </Grid>
          </Grid>
          <Grid item>
            <Typography variant="subheader">
              {f('configuration.system_maintenance_title_info_line_one')}
              {f('configuration.system_maintenance_title_info_line_two')}
            </Typography>
          </Grid>
          <Grid container spacing={2} alignItems="center">
            {/* Left-side label */}
            <Grid item xs={6}>
              <Typography variant="h6">
                {f('configuration.system_maintenance_Period')}
              </Typography>
            </Grid>

            {/* Right-side controls */}
            <Grid item xs={6}>
              <Grid container spacing={2} alignItems="center">
                {/* From section */}
                <Grid item xs={5.5}>
                  <Grid container spacing={1} alignItems="center">
                    <Grid item sx={{ paddingLeft: '0px !important' }}>
                      <Typography variant="body2">
                        {f('configuration.system_maintenance_Period_From')}
                      </Typography>
                    </Grid>
                    <Grid item xs>
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DateTimePicker
                          value={fromDateLocal}
                          onChange={handleFromDateChange}
                          views={['year', 'month', 'day', 'hours', 'minutes']}
                          sx={{
                            width: '100%',
                            '& .MuiIconButton-root': {
                              color: `${theme.palette.interactiveColor} !important`,
                            },
                          }}
                        />
                      </LocalizationProvider>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item xs={1}></Grid>
                {/* To section */}
                <Grid item xs={5.5}>
                  <Grid container spacing={1} alignItems="center">
                    <Grid item>
                      <Typography variant="body2">
                        {f('configuration.system_maintenance_Period_To')}
                      </Typography>
                    </Grid>
                    <Grid item xs>
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DateTimePicker
                          value={toDateLocal}
                          onChange={handleToDateChange}
                          views={['year', 'month', 'day', 'hours', 'minutes']}
                          sx={{
                            width: '100%',
                            '& .MuiIconButton-root': {
                              color: `${theme.palette.interactiveColor} !important`,
                            },
                          }}
                        />
                      </LocalizationProvider>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <Grid item container direction="row" alignItems="center">
            <Grid item xs={6}>
              <Typography variant="h6">
                {f('configuration.system_maintenance_Notification_Language')}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                fullWidth
                sx={(muiTheme) => ({
                  ...getCompactFilterFieldSx(muiTheme),
                })}
                value={notificationLanguage}
                onChange={handleNotificationLanguage}
                error={!!notificationLanguageError}
                helperText={notificationLanguageError}
                SelectProps={compactFilterSelectProps}
              >
                {languages.map((lang) => (
                  <MenuItem
                    key={lang.key}
                    value={lang.key}
                    sx={compactFilterMenuItemSx}
                  >
                    <Typography variant="body2">{lang.label}</Typography>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
          <Grid item container direction="row" alignItems="center">
            <Grid item xs={6}>
              <Typography variant="h6">
                {f('configuration.system_maintenance_Notification_Text')}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Grid container direction="column" rowGap=".67rem">
                <Grid item>
                  <TextField
                    type="text"
                    multiline
                    rows={4}
                    fullWidth
                    sx={(muiTheme) => ({
                      ...getCompactFilterFieldSx(muiTheme),
                    })}
                    value={notificationText[notificationLanguage]}
                    onChange={handleNotificationText}
                    error={!!notificationTextError}
                    helperText={notificationTextError}
                  />
                </Grid>
                <Grid item>
                  <Typography variant="subheader">
                    {f('configuration.system_maintenance_login_message_text')}
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          {/* leave the code as commented out, in case a client wants it as enhancement later. */}
          {/* <Grid item container direction="row" alignItems="center">
            <Grid item xs={6}>
              <Typography variant="h6">
                {f('configuration.system_maintenance_URL')}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Grid container direction="column" rowGap=".5rem">
                <Grid item>
                  <TextField
                    type="text"
                    fullWidth
                    placeholder={f(
                      'configuration.system_maintenance_URL.place_holder',
                    )}
                    value={maintenanceUrl}
                    onChange={handleMaintenanceUrl}
                  />
                </Grid>
                <Grid item>
                  <Typography variant="subheader">
                    {f('configuration.system_maintenance_redirect_text')}
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid> */}
          <Grid
            item
            container
            direction="row"
            justifyContent="flex-end"
            alignItems="center"
            marginTop="1.5rem"
          >
            <Button
              variant="contained"
              color="primary"
              sx={{
                width: '250px',
                border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                '&:hover': {
                  border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                },
              }}
              onClick={handleSubmit}
            >
              {f('configuration.system_maintenance_Save')}
            </Button>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}

export default MaintenancePage;
