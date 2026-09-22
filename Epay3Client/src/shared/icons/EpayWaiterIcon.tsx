import { CSSProperties, MouseEvent } from 'react';

import styled from '@emotion/styled';
import { FaCircleNotch } from 'react-icons/fa6';

import { IconProps } from './IconProps';

const EpayWaiterIconBase = styled(FaCircleNotch)(
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

export default function EpayWaiterIcon({ sx, onClick, ...other }: IconProps) {
  const handleOnClick = (e: MouseEvent<HTMLOrSVGElement>) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <EpayWaiterIconBase
      className="overrides"
      sx={sx}
      onClick={handleOnClick}
      {...other}
    />
  );
}
