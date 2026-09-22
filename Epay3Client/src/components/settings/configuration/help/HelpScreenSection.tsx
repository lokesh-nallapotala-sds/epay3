import AddIcon from '@mui/icons-material/Add';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  Box,
  Grid,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useFormat } from 'hooks/useFormat';
import {
  compactFilterMenuItemSx,
  compactFilterSelectProps,
} from 'shared/components/compactFilterSelectStyles';

interface ScreenOption {
  name: string;
  path: string;
}

interface HelpScreenSectionProps {
  screens: ScreenOption[];
  selectedScreenPath: string;
  onSelectScreen: (path: string) => void;
  onMoveScreen: (direction: -1 | 1) => void;
  onAddScreenClick: () => void;
  onDeleteScreen: () => void;
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

export default function HelpScreenSection({
  screens,
  selectedScreenPath,
  onSelectScreen,
  onMoveScreen,
  onAddScreenClick,
  onDeleteScreen,
}: HelpScreenSectionProps) {
  const f = useFormat();

  const selectedIndex = screens.findIndex((s) => s.path === selectedScreenPath);

  return (
    <Grid container direction="row" alignItems="center">
      <Grid item xs={6}>
        <Typography variant="h6">{f('configuration.help.screen')}</Typography>
      </Grid>

      <Grid item xs={6}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <TextField
            select
            fullWidth
            value={selectedScreenPath}
            onChange={(event) => onSelectScreen(event.target.value)}
            SelectProps={compactFilterSelectProps}
          >
            {screens.length === 0 && (
              <MenuItem value="" disabled sx={compactFilterMenuItemSx}>
                <Typography variant="body2">
                  {f('configuration.help.no_screen_selected')}
                </Typography>
              </MenuItem>
            )}
            {screens.map((screen) => (
              <MenuItem
                key={screen.path}
                value={screen.path}
                sx={compactFilterMenuItemSx}
              >
                <Typography variant="body2">
                  {screen.name} ({screen.path})
                </Typography>
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
                disabled={selectedIndex <= 0}
                onClick={() => onMoveScreen(-1)}
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
                  selectedIndex < 0 || selectedIndex >= screens.length - 1
                }
                onClick={() => onMoveScreen(1)}
              >
                <ArrowDownwardIcon fontSize="small" />
              </IconButton>
            </Box>
          </Tooltip>
          <Tooltip
            title={f('configuration.help.screen_add')}
            placement="bottom-start"
            slotProps={settingsTooltipSlotProps}
          >
            <Box component="span" sx={tooltipWrapperSx}>
              <IconButton
                color="primary"
                aria-label={f('configuration.help.screen_add')}
                onClick={onAddScreenClick}
              >
                <AddIcon />
              </IconButton>
            </Box>
          </Tooltip>
          <Tooltip
            title={f('configuration.help.screen_delete')}
            placement="bottom-start"
            slotProps={settingsTooltipSlotProps}
          >
            <Box component="span" sx={tooltipWrapperSx}>
              <IconButton
                color="primary"
                aria-label={f('configuration.help.screen_delete')}
                disabled={!selectedScreenPath}
                onClick={onDeleteScreen}
                // The visible trash glyph sits 13px inside the IconButton box
                // (8px button padding + 5px empty space in the 24px icon canvas) —
                // cancel exactly that so it ends flush with the fields.
                sx={{ marginRight: '-13px' }}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </Tooltip>
        </Box>
      </Grid>
    </Grid>
  );
}
