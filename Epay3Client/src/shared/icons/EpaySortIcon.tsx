import { CSSProperties, MouseEvent } from 'react';

import styled from '@emotion/styled';
import { FaSort } from 'react-icons/fa6';

import { IconProps } from './IconProps';

const EpaySortIconBase = styled(FaSort)((prop: IconProps & CSSProperties) => ({
  fontSize: '1rem',
  fontWeight: 400,
  color: 'inherit',
  backgroundColor: 'transparent',
  '&.overrides': {
    ...prop.sx,
  },
}));

export default function EpaySortIcon({ sx, onClick, ...other }: IconProps) {
  const handleOnClick = (e: MouseEvent<HTMLOrSVGElement>) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <EpaySortIconBase
      className="overrides"
      sx={sx}
      onClick={handleOnClick}
      {...other}
    />
  );
}
