import { useEffect, useState, ChangeEvent } from 'react';

import { useIntl } from 'react-intl';

import { Box } from '@mui/system';
import { useAppDispatch } from 'redux/hooks';
import { setLanguage } from 'redux/reducers';
import { styled } from '@mui/material/styles';
import { ApplicationConfigRequest } from 'types/AppConfigRequest';
import { Grid, MenuItem, TextField, Typography } from '@mui/material';
import { useEpayToast } from 'providers/EpayToastProvider';
import { useEpayLocale } from 'providers/EpayIntlProvider';
import { getLanguageOptions } from 'constants/languages';
import { EpayApplicationService } from 'services/EpayApplicationService';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';
import { buildConfiguredApplicationLinks } from 'utilities/applicationLinks';

const Link = styled('a')(({ theme }) => ({
  textDecoration: 'none',
  fontSize: '1rem',
  color: theme.palette.text.primary,
  cursor: 'pointer',
}));

const FooterBox = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  width: '100%',
}));

export default function Footer({ location = 'app' }) {
  const [appConfig, setAppConfig] = useState<ApplicationConfigRequest>();

  const languages = getLanguageOptions();

  const intl = useIntl();
  const { language, setUserPreferredLocale } = useEpayLocale();
  const f = (id: string) => intl.formatMessage({ id: id });

  const { showToastMessage } = useEpayToast();

  const dispatch = useAppDispatch();
  const getAppConfig = EpayApplicationService.useGetApplicationConfig();

  useEffect(() => {
    getAppConfig()
      .then((resp: ApplicationConfigRequest) => {
        setAppConfig(resp);
      })
      .catch((error: Error) => {
        showToastMessage('error', error.message ?? error);
      });
  }, []);

  const changeLanguage = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const lang = e.target.value;
    setUserPreferredLocale(lang);
    dispatch(setLanguage(lang));
  };

  const configuredLinks = buildConfiguredApplicationLinks(appConfig);
  return (
    <FooterBox>
      <Grid
        container
        alignItems="center"
        padding=".8rem"
        sx={{
          display: location === 'app' ? { xs: 'none', lg: 'flex' } : 'flex',
        }}
      >
        <Grid item xl={6} lg={4} xs={6}>
          {appConfig && (
            <Typography>
              {f('footer.copyright').replace(
                '{year}',
                appConfig?.copyrightYear || '',
              )}
            </Typography>
          )}
        </Grid>
        <Grid item xl={6} lg={8} xs={6}>
          <Box sx={{ width: '100%' }}>
            <Grid container alignItems="center">
              <Grid item xl={2} lg={1} xs={6}>
                <Typography>{`v ${import.meta.env.VITE_APP_VERSION}`}</Typography>
              </Grid>

              <Grid
                item
                xl={6}
                lg={7}
                sx={{ display: { xs: 'none', lg: 'block' } }}
              >
                <Box display="flex" justifyContent="space-between">
                  {configuredLinks.map((link) => (
                    <Link key={link.id} href={link.href} target={link.target}>
                      {link.label}
                    </Link>
                  ))}
                </Box>
              </Grid>
              <Grid item xl={4} lg={4} xs={6}>
                <Box display="flex" justifyContent="right">
                  <TextField
                    select
                    onChange={(e) => changeLanguage(e)}
                    fullWidth
                    value={
                      languages.find((lang) => lang.language === language)
                        ?.language || ''
                    }
                    sx={(muiTheme) => ({
                      ...getCompactFilterFieldSx(muiTheme),
                      width: '10rem',
                    })}
                  >
                    {languages.map((option) => (
                      <MenuItem key={option.language} value={option.language}>
                        {option.title}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Grid>
      </Grid>
    </FooterBox>
  );
}
