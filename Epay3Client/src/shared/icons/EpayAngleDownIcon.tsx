import { CSSProperties, MouseEvent } from 'react';

import styled from '@emotion/styled';
import { FaAngleDown } from 'react-icons/fa6';

import { IconProps } from './IconProps';
const EpayAngleDownIconBase = styled(FaAngleDown)(
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

export default function EpayAngleDownIcon({
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
    <EpayAngleDownIconBase
      className="overrides"
      sx={sx}
      onClick={handleOnClick}
      {...other}
    />
  );
}
