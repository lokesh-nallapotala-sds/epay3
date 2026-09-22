import { CSSProperties, MouseEvent } from 'react';

import styled from '@emotion/styled';
import { FaRegClock } from 'react-icons/fa6';

import { IconProps } from './IconProps';

const EpayHistoryIconBase = styled(FaRegClock)(
  (prop: IconProps & CSSProperties) => ({
    fontSize: '1rem',
    fontWeight: 400,
    color: 'inherit',
    backgroundColor: 'transparent',
    '&.overrides': {
      ...prop.sx,
    },
  }),
);

export default function EpayHistoryIcon({ sx, onClick, ...other }: IconProps) {
  const handleOnClick = (e: MouseEvent<HTMLOrSVGElement>) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <EpayHistoryIconBase
      className="overrides"
      sx={sx}
      onClick={handleOnClick}
      {...other}
    />
  );
}
