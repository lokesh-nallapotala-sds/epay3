import { useState, SyntheticEvent } from 'react';

import {
  EpayTabContext,
  EpayTabList,
  EpayTabPanel,
} from 'shared/components/EpayTabs';
import { useAppDispatch } from 'redux/hooks';
import { refreshConfig } from 'redux/reducers/configSlice';
import EpayPageHeaderText from 'shared/components/EpayPageHeaderText';
import { Box, Button, Grid, Tab, useMediaQuery, useTheme } from '@mui/material';

import ThemeConfigurationPage from './ThemeConfigurationPage';
import ApplicationPage from './ApplicationPage';
import MaintenancePage from './MaintenancePage';
import EmailConfigurationPage from './EmailConfigurationPage';
import HelpPage from './Help';
import { useFormat } from 'hooks/useFormat';

export default function ConfigurationPage() {
  const theme = useTheme();
  const lgUp = useMediaQuery(theme.breakpoints.up('lg'));

  const f = useFormat();

  const MarginX = 0; //in rem
  const MarginY = lgUp ? 1 : 0.75;

  const [value, setValue] = useState('1');
  const dispatch = useAppDispatch();

  const handleChange = (event: SyntheticEvent, newValue: string) => {
    setValue(newValue);
  };

  const reloadConfiguration = () => {
    dispatch(refreshConfig());
  };

  return (
    <Grid
      container
      flexDirection="column"
      rowGap="2rem"
      width={`calc(100% - ${2 * MarginX}rem)`}
      marginX={`${MarginX}rem`}
      marginY={`${MarginY}rem`}
    >
      <Grid container spacing={{ xs: 2, sm: 0 }} sx={{ paddingRight: '55px' }}>
        <EpayPageHeaderText
          header={f('header.configuration')}
          subheader={`${f('configuration.subheader.adjust')}${theme.applicationName ? ' ' + theme.applicationName : ''} ${f('configuration.subheader.settings')}`}
        />
        <Grid
          item
          display="flex"
          justifyContent="flex-end"
          alignItems="center"
          marginLeft="auto"
        >
          <Button
            variant="contained"
            color="primary"
            onClick={reloadConfiguration}
            size="small"
            sx={{
              border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
              '&:hover': {
                border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
              },
            }}
          >
            {f('configuration.button.reloadConfiguration')}
          </Button>
        </Grid>
      </Grid>

      <Grid item>
        <Box
          display="flex"
          flexDirection="column"
          width="100%"
          justifyContent="flex-start"
          sx={{
            width: lgUp ? 'calc(100% - 4rem)' : 'calc(100% - 2rem)',
            marginX: lgUp ? '2rem' : '1rem',
            height: 'auto',
            gap: '24px',
          }}
        >
          <EpayTabContext value={value}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <EpayTabList
                onChange={handleChange}
                aria-label={f('aria.configuration_tabs')}
              >
                <Tab label="Application" value="1" />
                <Tab label="Theme" value="2" />
                <Tab label="Email" value="3" />
                <Tab label="Help" value="4" />
                <Tab label="Maintenance" value="5" />
              </EpayTabList>
            </Box>
            <EpayTabPanel value="1" sx={{ width: 'auto' }}>
              <ApplicationPage />
            </EpayTabPanel>
            <EpayTabPanel value="2" sx={{ width: 'auto' }}>
              <ThemeConfigurationPage />
            </EpayTabPanel>
            <EpayTabPanel value="3" sx={{ width: 'auto' }}>
              <EmailConfigurationPage />
            </EpayTabPanel>
            <EpayTabPanel value="4" sx={{ width: 'auto' }}>
              <HelpPage />
            </EpayTabPanel>
            <EpayTabPanel value="5" sx={{ width: 'auto' }}>
              <MaintenancePage />
            </EpayTabPanel>
          </EpayTabContext>
        </Box>
      </Grid>
    </Grid>
  );
}
