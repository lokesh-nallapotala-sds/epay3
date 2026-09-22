import { CSSProperties, MouseEvent } from 'react';

import styled from '@emotion/styled';
import { FaHouse } from 'react-icons/fa6';

import { IconProps } from './IconProps';

const EpayHomeIconBase = styled(FaHouse)((prop: IconProps & CSSProperties) => ({
  fontSize: '1rem',
  fontWeight: 400,
  color: 'inherit',
  backgroundColor: 'transparent',
  '&.overrides': {
    ...prop.sx,
  },
}));

export default function EpayHomeIcon({ sx, onClick, ...other }: IconProps) {
  const handleOnClick = (e: MouseEvent<HTMLOrSVGElement>) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <EpayHomeIconBase
      className="overrides"
      sx={sx}
      onClick={handleOnClick}
      {...other}
    />
  );
}
