import { ChangeEvent } from 'react';
import { ThemeConfig } from 'types/ThemeConfig';
import { Grid, Typography } from '@mui/material';
import EpayHexColorField from 'shared/components/EpayHexColorField';
import { useFormat } from 'hooks/useFormat';

interface ColorsSectionProps {
  selectedTheme: ThemeConfig | undefined;
  handleColorChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

const fieldLabelGridProps = { xs: 12, sm: 6 } as const;
const fieldControlGridProps = { xs: 12, sm: 6 } as const;

export default function ColorsSection({
  selectedTheme,
  handleColorChange,
}: ColorsSectionProps) {
  const f = useFormat();

  return (
    <>
      <Grid item>
        <Typography variant="h2">{f('configuration.theme.colors')}</Typography>
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
            {f('configuration.theme.background_color')}
          </Typography>
        </Grid>
        <Grid item {...fieldControlGridProps} sx={{ minWidth: 0 }}>
          <EpayHexColorField
            name="backgroundColor"
            value={selectedTheme?.backgroundColor || '#000000'}
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
        <Grid item {...fieldLabelGridProps}>
          <Typography variant="h6">
            {f('configuration.theme.header_background_color')}
          </Typography>
        </Grid>
        <Grid item {...fieldControlGridProps} sx={{ minWidth: 0 }}>
          <EpayHexColorField
            name="headerBackgroundColor"
            value={selectedTheme?.headerBackgroundColor || '#000000'}
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
        <Grid item {...fieldLabelGridProps}>
          <Typography variant="h6">
            {f('configuration.theme.primary_color')}
          </Typography>
        </Grid>
        <Grid item {...fieldControlGridProps} sx={{ minWidth: 0 }}>
          <EpayHexColorField
            name="primaryColor"
            value={selectedTheme?.primaryColor || '#000000'}
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
        <Grid item {...fieldLabelGridProps}>
          <Typography variant="h6">
            {f('configuration.theme.primary_contrast_text')}
          </Typography>
        </Grid>
        <Grid item {...fieldControlGridProps} sx={{ minWidth: 0 }}>
          <EpayHexColorField
            name="contrastColor"
            value={selectedTheme?.contrastColor || '#000000'}
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
        <Grid item {...fieldLabelGridProps}>
          <Typography variant="h6">
            {f('configuration.theme.contrast_hover_color')}
          </Typography>
        </Grid>
        <Grid item {...fieldControlGridProps} sx={{ minWidth: 0 }}>
          <EpayHexColorField
            name="hoverColor"
            value={selectedTheme?.hoverColor || '#000000'}
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
        <Grid item {...fieldLabelGridProps}>
          <Typography variant="h6">
            {f('configuration.theme.button_color')}
          </Typography>
        </Grid>
        <Grid item {...fieldControlGridProps} sx={{ minWidth: 0 }}>
          <EpayHexColorField
            name="buttonColor"
            value={selectedTheme?.buttonColor || '#000000'}
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
        <Grid item {...fieldLabelGridProps}>
          <Typography variant="h6">
            {f('configuration.theme.button_border_color')}
          </Typography>
        </Grid>
        <Grid item {...fieldControlGridProps} sx={{ minWidth: 0 }}>
          <EpayHexColorField
            name="buttonBorderColor"
            value={selectedTheme?.buttonBorderColor || '#000000'}
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
        <Grid item {...fieldLabelGridProps}>
          <Typography variant="h6">
            {f('configuration.theme.button_text_color')}
          </Typography>
        </Grid>
        <Grid item {...fieldControlGridProps} sx={{ minWidth: 0 }}>
          <EpayHexColorField
            name="buttonTextColor"
            value={selectedTheme?.buttonTextColor || '#000000'}
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
        <Grid item {...fieldLabelGridProps}>
          <Typography variant="h6">
            {f('configuration.theme.button_hover_color')}
          </Typography>
        </Grid>
        <Grid item {...fieldControlGridProps} sx={{ minWidth: 0 }}>
          <EpayHexColorField
            name="buttonHoverColor"
            value={selectedTheme?.buttonHoverColor || '#000000'}
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
        <Grid item {...fieldLabelGridProps}>
          <Typography variant="h6">
            {f('configuration.theme.button_border_hover_color')}
          </Typography>
        </Grid>
        <Grid item {...fieldControlGridProps} sx={{ minWidth: 0 }}>
          <EpayHexColorField
            name="buttonBorderHoverColor"
            value={selectedTheme?.buttonBorderHoverColor || '#000000'}
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
        <Grid item {...fieldLabelGridProps}>
          <Typography variant="h6">
            {f('configuration.theme.button_hover_text_color')}
          </Typography>
        </Grid>
        <Grid item {...fieldControlGridProps} sx={{ minWidth: 0 }}>
          <EpayHexColorField
            name="buttonHoverTextColor"
            value={selectedTheme?.buttonHoverTextColor || '#000000'}
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
        <Grid item {...fieldLabelGridProps}>
          <Typography variant="h6">
            {f('configuration.theme.row_highlight_color')}
          </Typography>
        </Grid>
        <Grid item {...fieldControlGridProps} sx={{ minWidth: 0 }}>
          <EpayHexColorField
            name="highlightColor"
            value={selectedTheme?.highlightColor || '#000000'}
            onChange={handleColorChange}
          />
        </Grid>
      </Grid>
    </>
  );
}
