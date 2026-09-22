import { HTMLAttributes, MouseEvent } from 'react';

import { SxProps, Theme } from '@mui/system';

export interface IconProps extends HTMLAttributes<HTMLOrSVGElement> {
  sx?: SxProps<Theme>;
  onClick?: (event: MouseEvent<HTMLOrSVGElement>) => void;
}
