import { ChangeEvent, Dispatch, SetStateAction } from 'react';

import { Grid, Switch, Typography } from '@mui/material';
import { ApplicationConfigRequest } from 'types/AppConfigRequest';
import { useFormat } from 'hooks/useFormat';

interface AccountSettingsSectionProps {
  applicationConfig: ApplicationConfigRequest;
  setApplicationConfig: Dispatch<SetStateAction<ApplicationConfigRequest>>;
}

export default function AccountSettingsSection({
  applicationConfig,
  setApplicationConfig,
}: AccountSettingsSectionProps) {
  const f = useFormat();

  const handleEnableAccountLinking = (
    event: ChangeEvent<HTMLInputElement>,
    checked: boolean,
  ) => {
    setApplicationConfig({
      ...applicationConfig,
      isAccountLinkingEnabled: checked,
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
          {f('configuration.application.accountsettings')}
        </Typography>
      </Grid>
      <Grid item container direction="row" alignItems="center">
        <Grid item xs={6}>
          <Typography variant="h6">
            {f('configuration.application.enableaccountlinking')}
          </Typography>
        </Grid>
        <Grid item xs={6} container justifyContent="flex-end">
          <Grid item>
            <Switch
              color="primary"
              checked={applicationConfig.isAccountLinkingEnabled}
              onChange={handleEnableAccountLinking}
              sx={{ width: '49px', padding: '12px 4px 12px 12px' }}
            />
          </Grid>
        </Grid>
      </Grid>
    </>
  );
}
