import { CSSProperties, MouseEvent } from 'react';

import styled from '@emotion/styled';
import { FaRegSquare } from 'react-icons/fa6';

import { IconProps } from './IconProps';

const EpaySquareIconBase = styled(FaRegSquare)(
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

export default function EpaySquareIcon({ sx, onClick, ...other }: IconProps) {
  const handleOnClick = (e: MouseEvent<HTMLOrSVGElement>) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <EpaySquareIconBase
      className="overrides"
      sx={sx}
      onClick={handleOnClick}
      {...other}
    />
  );
}
