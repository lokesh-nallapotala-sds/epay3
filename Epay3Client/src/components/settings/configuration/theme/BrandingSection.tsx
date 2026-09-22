import { ChangeEvent, MutableRefObject } from 'react';
import { ThemeConfig } from 'types/ThemeConfig';
import { Divider, Grid, TextField, Typography } from '@mui/material';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

import ThemeIcon from '../ThemeIcon';
import ThemeLogo from '../ThemeLogo';
import { useFormat } from 'hooks/useFormat';

interface BrandingSectionProps {
  selectedTheme: ThemeConfig | undefined;
  logo: string | null;
  icon: string | null;
  logoRef: MutableRefObject<HTMLDivElement | null>;
  iconRef: MutableRefObject<HTMLDivElement | null>;
  handleLogoDataChange: (data: string) => void;
  handleIconDataChange: (data: string) => void;
  handleTitleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleApplicationName: (e: ChangeEvent<HTMLInputElement>) => void;
}

const fieldLabelGridProps = { xs: 12, sm: 6 } as const;
const fieldControlGridProps = { xs: 12, sm: 6 } as const;

export default function BrandingSection({
  selectedTheme,
  logo,
  icon,
  logoRef,
  iconRef,
  handleLogoDataChange,
  handleIconDataChange,
  handleTitleChange,
  handleApplicationName,
}: BrandingSectionProps) {
  const f = useFormat();

  return (
    <>
      <Grid item>
        <Typography variant="h2">
          {f('configuration.theme.branding')}
        </Typography>
      </Grid>

      <Grid item container direction="row" alignItems="flex-start">
        <Grid
          item
          xs={6}
          sx={{ height: '7rem', display: 'flex', alignItems: 'center' }}
        >
          <Typography variant="h6">{f('configuration.theme.logo')}</Typography>
        </Grid>
        <Grid item xs={6} ref={logoRef}>
          <ThemeLogo
            logo={logo}
            handleLogoDataChange={handleLogoDataChange}
          ></ThemeLogo>
        </Grid>
      </Grid>

      <Grid item container direction="row" alignItems="flex-start">
        <Grid
          item
          xs={6}
          sx={{ height: '4rem', display: 'flex', alignItems: 'center' }}
        >
          <Typography variant="h6">{f('configuration.theme.icon')}</Typography>
        </Grid>
        <Grid item xs={6} ref={iconRef}>
          <ThemeIcon
            icon={icon}
            handleIconDataChange={handleIconDataChange}
          ></ThemeIcon>
        </Grid>
      </Grid>

      <Grid
        item
        container
        direction="row"
        alignItems="center"
        rowSpacing={0.75}
      >
        <Grid item {...fieldLabelGridProps}>
          <Typography variant="h6">
            {f('configuration.theme.app_title')}
          </Typography>
        </Grid>
        <Grid item {...fieldControlGridProps} sx={{ minWidth: 0 }}>
          <Grid container direction="column" rowGap=".5rem">
            <Grid item>
              <TextField
                type="text"
                fullWidth
                name="brandTitle"
                value={selectedTheme?.brandTitle ?? ''}
                onChange={handleTitleChange}
                error={!selectedTheme?.brandTitle?.trim()}
                helperText={
                  !selectedTheme?.brandTitle?.trim()
                    ? 'Application title is required'
                    : ''
                }
                sx={(muiTheme) => ({
                  ...getCompactFilterFieldSx(muiTheme),
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-error .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'error.main',
                      borderWidth: '2px',
                    },
                  },
                })}
              />
            </Grid>
            <Grid item>
              <Typography variant="subheader">
                {f('configuration.theme.app_title.hint')}
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      <Grid
        item
        container
        direction="row"
        alignItems="center"
        rowSpacing={0.75}
      >
        <Grid item {...fieldLabelGridProps}>
          <Typography variant="h6">
            {f('configuration.theme.application_name')}
          </Typography>
        </Grid>
        <Grid item {...fieldControlGridProps} sx={{ minWidth: 0 }}>
          <Grid container direction="column" rowGap=".5rem">
            <Grid item>
              <TextField
                type="text"
                fullWidth
                name="applicationName"
                value={selectedTheme?.applicationName ?? ''}
                onChange={handleApplicationName}
                error={!selectedTheme?.applicationName?.trim()}
                helperText={
                  !selectedTheme?.applicationName?.trim()
                    ? 'Application name is required'
                    : ''
                }
                sx={(muiTheme) => ({
                  ...getCompactFilterFieldSx(muiTheme),
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-error .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'error.main',
                      borderWidth: '2px',
                    },
                  },
                })}
              />
            </Grid>
            <Grid item>
              <Typography variant="subheader">
                {f('configuration.theme.application_name.hint')}
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      <Divider />
    </>
  );
}
