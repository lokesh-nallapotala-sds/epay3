import { CSSProperties, MouseEvent } from 'react';

import styled from '@emotion/styled';
import { FaBars } from 'react-icons/fa6';

import { IconProps } from './IconProps';

const FaBarsIconBase = styled(FaBars)((prop: IconProps & CSSProperties) => ({
  fontSize: '1rem',
  fontWeight: 400,
  color: 'inherit',
  backgroundColor: 'transparent',
  '&.overrides': {
    ...prop.sx,
  },
}));

export default function EpayBarsIcon({ sx, onClick, ...other }: IconProps) {
  const handleOnClick = (e: MouseEvent<HTMLOrSVGElement>) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <FaBarsIconBase
      className="overrides"
      sx={sx}
      onClick={handleOnClick}
      {...other}
    />
  );
}
