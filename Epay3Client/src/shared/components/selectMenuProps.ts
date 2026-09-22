import type { MenuProps } from '@mui/material/Menu';
import { MEDIA_DOWN_MD } from 'shared/theme/breakpoints';

export const defaultSelectMenuProps: Partial<MenuProps> = {
  anchorOrigin: {
    vertical: 'bottom',
    horizontal: 'left',
  },
  transformOrigin: {
    vertical: 'top',
    horizontal: 'left',
  },
  marginThreshold: 8,
  PaperProps: {
    sx: {
      mt: '2px',
      maxHeight: 'min(320px, calc(100vh - 32px))',
      overflowY: 'auto',
    },
  },
  MenuListProps: {
    sx: {
      [MEDIA_DOWN_MD]: {
        py: 0,
      },
    },
  },
};
