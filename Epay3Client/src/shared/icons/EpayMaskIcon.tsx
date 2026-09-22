import { CSSProperties, MouseEvent } from 'react';

import styled from '@emotion/styled';
import { FaMask } from 'react-icons/fa';

import { IconProps } from './IconProps';

const EpayMaskIconBase = styled(FaMask)((prop: IconProps & CSSProperties) => ({
  fontSize: '1rem',
  fontWeight: 400,
  color: 'inherit',
  backgroundColor: 'transparent',
  '&.overrides': {
    ...prop.sx,
  },
}));

export default function EpayMaskIcon({ sx, onClick, ...other }: IconProps) {
  const handleOnClick = (e: MouseEvent<HTMLOrSVGElement>) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <EpayMaskIconBase
      className="overrides"
      sx={sx}
      onClick={handleOnClick}
      {...other}
    />
  );
}
