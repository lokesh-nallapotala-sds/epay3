import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import { MEDIA_DOWN_MD } from 'shared/theme/breakpoints';
import { defaultSelectMenuProps } from 'shared/components/selectMenuProps';

const compactFilterMenuListSx = {
  [MEDIA_DOWN_MD]: {
    py: 0,
  },
} as const;

export const compactFilterSelectProps = {
  IconComponent: ExpandMoreOutlined,
  MenuProps: {
    ...defaultSelectMenuProps,
    MenuListProps: {
      sx: compactFilterMenuListSx,
    },
  },
} as const;

export const compactFilterMenuItemSx = {
  [MEDIA_DOWN_MD]: {
    minHeight: 32,
    py: 0.5,
    px: 2,
  },
} as const;
