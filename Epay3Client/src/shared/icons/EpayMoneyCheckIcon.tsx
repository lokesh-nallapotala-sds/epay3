import { CSSProperties, MouseEvent } from 'react';

import styled from '@emotion/styled';
import { FaMoneyCheck } from 'react-icons/fa';

import { IconProps } from './IconProps';

const EpayMoneyCheckIconBase = styled(FaMoneyCheck)(
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

export default function EpayMoneyCheckIcon({
  sx,
  onClick,
  ...other
}: IconProps) {
  const handleOnClick = (e: MouseEvent<HTMLOrSVGElement>) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <EpayMoneyCheckIconBase
      className="overrides"
      sx={sx}
      onClick={handleOnClick}
      {...other}
    />
  );
}
