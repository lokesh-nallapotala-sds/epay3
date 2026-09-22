import { ChangeEvent, Dispatch, SetStateAction, useState } from 'react';

import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import {
  Box,
  Grid,
  MenuItem,
  Tooltip,
  TextField,
  Typography,
} from '@mui/material';
import { ApplicationConfigRequest } from 'types/AppConfigRequest';
import { useFormat } from 'hooks/useFormat';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';
import {
  getApplicationLinksFromConfig,
  normalizeApplicationLinkUrl,
} from 'utilities/applicationLinks';
import {
  compactFilterMenuItemSx,
  compactFilterSelectProps,
} from 'shared/components/compactFilterSelectStyles';
import { AddApplicationLinkModal } from './AddApplicationLinkModal';

interface LinksSectionProps {
  applicationConfig: ApplicationConfigRequest;
  selectedLinkId: string;
  setSelectedLinkId: Dispatch<SetStateAction<string>>;
  linkErrors: Record<string, string>;
  onMoveLink: (direction: -1 | 1) => void;
  onAddLink: (label: string, url: string) => void;
  onSelectedLinkUrlChange: (url: string) => void;
  onDeleteSelectedLink: () => void;
}

const tooltipWrapperSx = { display: 'inline-flex' } as const;
const settingsTooltipSlotProps = {
  tooltip: {
    sx: {
      backgroundColor: '#ffffff',
      color: '#0D0D12',
      fontSize: '0.75rem',
      border: '1px solid #D1D5DB',
      boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
      borderRadius: '8px',
      padding: '6px 10px',
      fontWeight: 500,
    },
  },
} as const;

export default function LinksSection({
  applicationConfig,
  selectedLinkId,
  setSelectedLinkId,
  linkErrors,
  onMoveLink,
  onAddLink,
  onSelectedLinkUrlChange,
  onDeleteSelectedLink,
}: LinksSectionProps) {
  const f = useFormat();
  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const links = getApplicationLinksFromConfig(applicationConfig);
  const selectedIndex = links.findIndex((link) => link.id === selectedLinkId);
  const selectedLink = links[selectedIndex] ?? null;
  const selectedLinkErrorText = selectedLink ? linkErrors[selectedLink.id] : '';

  const validateAndFormatSelectedUrl = (event) => {
    handleSelectedLinkUrl(normalizeApplicationLinkUrl(event.target.value));
  };

  const handleSelectedLinkUrl = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string,
  ) => {
    if (!selectedLink) {
      return;
    }

    const inputValue = typeof event === 'string' ? event : event.target.value;
    onSelectedLinkUrlChange(inputValue.toString());
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
          {f('configuration.application.links')}
        </Typography>
      </Grid>
      <Grid item container direction="row" alignItems="center">
        <Grid item xs={6}>
          <Typography variant="h6">
            {f('configuration.help.text_link')}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TextField
              select
              fullWidth
              value={selectedLinkId || ''}
              onChange={(event) => setSelectedLinkId(event.target.value)}
              SelectProps={compactFilterSelectProps}
            >
              {links.length === 0 && (
                <MenuItem value="" disabled sx={compactFilterMenuItemSx}>
                  <Typography variant="body2">
                    {f('configuration.application.no_link_selected')}
                  </Typography>
                </MenuItem>
              )}
              {links.map((link) => (
                <MenuItem
                  key={link.id}
                  value={link.id}
                  sx={compactFilterMenuItemSx}
                >
                  <Typography variant="body2">{link.label}</Typography>
                </MenuItem>
              ))}
            </TextField>
            <Tooltip
              title={f('configuration.help.screen_move_up')}
              placement="bottom-start"
              slotProps={settingsTooltipSlotProps}
            >
              <Box component="span" sx={tooltipWrapperSx}>
                <IconButton
                  color="primary"
                  aria-label={f('configuration.help.screen_move_up')}
                  disabled={selectedIndex <= 0 || !selectedLink}
                  onClick={() => onMoveLink(-1)}
                >
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
              </Box>
            </Tooltip>
            <Tooltip
              title={f('configuration.help.screen_move_down')}
              placement="bottom-start"
              slotProps={settingsTooltipSlotProps}
            >
              <Box component="span" sx={tooltipWrapperSx}>
                <IconButton
                  color="primary"
                  aria-label={f('configuration.help.screen_move_down')}
                  disabled={
                    selectedIndex < 0 || selectedIndex >= links.length - 1
                  }
                  onClick={() => onMoveLink(1)}
                >
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
              </Box>
            </Tooltip>
            <Tooltip
              title={f('configuration.application.add_link_button')}
              placement="bottom-start"
              slotProps={settingsTooltipSlotProps}
            >
              <Box component="span" sx={tooltipWrapperSx}>
                <IconButton
                  color="primary"
                  aria-label={f('configuration.application.add_link_button')}
                  onClick={() => setAddLinkOpen(true)}
                >
                  <AddIcon />
                </IconButton>
              </Box>
            </Tooltip>
            <Tooltip
              title={f('configuration.application.delete_link')}
              placement="bottom-start"
              slotProps={settingsTooltipSlotProps}
            >
              <Box component="span" sx={tooltipWrapperSx}>
                <IconButton
                  color="primary"
                  aria-label={f('configuration.application.delete_link')}
                  disabled={!selectedLink}
                  onClick={onDeleteSelectedLink}
                  sx={{ marginRight: '-13px' }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Tooltip>
          </Box>
        </Grid>
      </Grid>
      <Grid item container direction="row" alignItems="center">
        <Grid item xs={6}>
          <Typography variant="h6">
            {f('configuration.system_maintenance_URL')}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <TextField
            type="text"
            fullWidth
            sx={(muiTheme) => ({
              ...getCompactFilterFieldSx(muiTheme),
            })}
            placeholder={
              selectedLink?.label ?? f('configuration.system_maintenance_URL')
            }
            value={selectedLink?.url ?? ''}
            onBlur={validateAndFormatSelectedUrl}
            onChange={handleSelectedLinkUrl}
            error={Boolean(selectedLinkErrorText)}
            helperText={selectedLinkErrorText}
            disabled={!selectedLink}
          />
        </Grid>
      </Grid>
      <AddApplicationLinkModal
        open={addLinkOpen}
        onClose={() => setAddLinkOpen(false)}
        onAddLink={onAddLink}
      />
    </>
  );
}
