import { ChangeEvent } from 'react';
import { useTheme } from '@mui/system';
import { ThemeConfig } from 'types/ThemeConfig';
import { Button, Grid, MenuItem, TextField, Typography } from '@mui/material';
import EpayHexColorField from 'shared/components/EpayHexColorField';
import {
  compactFilterMenuItemSx,
  compactFilterSelectProps,
} from 'shared/components/compactFilterSelectStyles';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

import { defaultBannerColor } from './themeDefaults';
import { useFormat } from 'hooks/useFormat';

interface LoginPageSectionProps {
  selectedTheme: ThemeConfig | undefined;
  selectedLanguage: string;
  selectedLanguageError: string;
  bannerText1: string;
  bannerText2: string;
  handleBannerLanguage: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  handleBannerText1Change: (event: ChangeEvent<HTMLInputElement>) => void;
  handleBannerText2Change: (event: ChangeEvent<HTMLInputElement>) => void;
  handleColorChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleReset: () => void;
}

const fieldLabelGridProps = { xs: 12, sm: 6 } as const;
const fieldControlGridProps = { xs: 12, sm: 6 } as const;

export default function LoginPageSection({
  selectedTheme,
  selectedLanguage,
  selectedLanguageError,
  bannerText1,
  bannerText2,
  handleBannerLanguage,
  handleBannerText1Change,
  handleBannerText2Change,
  handleColorChange,
  handleReset,
}: LoginPageSectionProps) {
  const f = useFormat();
  const theme = useTheme();
  const languagesForBannerContent = [
    { key: 'en', label: 'English' },
    { key: 'fr', label: 'French' },
    { key: 'de', label: 'German' },
    { key: 'es', label: 'Spanish' },
    { key: 'it', label: 'Italian' },
    { key: 'ja', label: 'Japanese' },
    { key: 'pt', label: 'Portuguese' },
    { key: 'ru', label: 'Russian' },
  ];

  return (
    <>
      <Grid item>
        <Typography variant="h2">
          {f('configuration.theme.login_page')}
        </Typography>
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
            {f('configuration.theme.banner_language')}
          </Typography>
        </Grid>
        <Grid item {...fieldControlGridProps} sx={{ minWidth: 0 }}>
          <TextField
            select
            fullWidth
            sx={(muiTheme) => ({
              ...getCompactFilterFieldSx(muiTheme),
            })}
            value={selectedLanguage}
            onChange={handleBannerLanguage}
            helperText={selectedLanguageError}
            SelectProps={compactFilterSelectProps}
          >
            <MenuItem value="" disabled sx={compactFilterMenuItemSx}>
              <Typography variant="body2">
                {f('configuration.theme.selectLanguage')}
              </Typography>
            </MenuItem>
            {languagesForBannerContent.map((language) => (
              <MenuItem
                key={language.key}
                value={language.key}
                sx={compactFilterMenuItemSx}
              >
                <Typography variant="body2">{language.label}</Typography>
              </MenuItem>
            ))}
          </TextField>
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
            {f('configuration.theme.banner_text1')}
          </Typography>
        </Grid>
        <Grid item {...fieldControlGridProps} sx={{ minWidth: 0 }}>
          <TextField
            fullWidth
            sx={(muiTheme) => ({
              ...getCompactFilterFieldSx(muiTheme),
            })}
            value={bannerText1}
            onChange={handleBannerText1Change}
          />
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
            {f('configuration.theme.banner_text2')}
          </Typography>
        </Grid>
        <Grid item {...fieldControlGridProps} sx={{ minWidth: 0 }}>
          <TextField
            fullWidth
            sx={(muiTheme) => ({
              ...getCompactFilterFieldSx(muiTheme),
            })}
            value={bannerText2}
            onChange={handleBannerText2Change}
          />
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
            {f('configuration.theme.banner_color')}
          </Typography>
        </Grid>
        <Grid item {...fieldControlGridProps} sx={{ minWidth: 0 }}>
          <EpayHexColorField
            name="bannerColor"
            value={selectedTheme?.bannerColor || defaultBannerColor}
            onChange={handleColorChange}
          />
        </Grid>
      </Grid>
      <Grid
        item
        container
        direction="row"
        alignItems="center"
        rowSpacing={0.75}
      >
        <Grid
          item
          {...fieldLabelGridProps}
          sx={{ display: { xs: 'none', sm: 'block' } }}
        >
          {''}
        </Grid>
        <Grid
          item
          {...fieldControlGridProps}
          container
          justifyContent="flex-end"
          sx={{ minWidth: 0 }}
        >
          <Grid item>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="small"
              onClick={handleReset}
              sx={{
                minWidth: '11rem',
                border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                '&:hover': {
                  border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                },
              }}
            >
              {f('configuration.theme.editor.reset')}
            </Button>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
}
