import { CSSProperties, MouseEvent } from 'react';

import styled from '@emotion/styled';
import { FaAngleUp } from 'react-icons/fa6';

import { IconProps } from './IconProps';

const EpayAngleUpIconBase = styled(FaAngleUp)(
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

export default function EpayAngleUpIcon({ sx, onClick, ...other }: IconProps) {
  const handleOnClick = (e: MouseEvent<HTMLOrSVGElement>) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <EpayAngleUpIconBase
      className="overrides"
      sx={sx}
      onClick={handleOnClick}
      {...other}
    />
  );
}
