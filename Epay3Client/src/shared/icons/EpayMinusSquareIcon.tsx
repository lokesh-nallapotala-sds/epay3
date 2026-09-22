import { CSSProperties, MouseEvent } from 'react';

import styled from '@emotion/styled';
import { FaRegMinusSquare } from 'react-icons/fa';

import { IconProps } from './IconProps';

const EpayMinusSquareIconBase = styled(FaRegMinusSquare)(
  (props: IconProps & CSSProperties) => ({
    fontSize: '1rem',
    fontWeight: 400,
    color: 'inherit',
    backgroundColor: 'transparent',
    '&.overrides': {
      ...props.sx,
    },
  }),
);

export default function EpayMinusSquareIcon({
  sx,
  onClick,
  ...other
}: IconProps) {
  function handleOnClick(e: MouseEvent<HTMLOrSVGElement>) {
    if (onClick) {
      onClick(e);
    }
  }

  return (
    <EpayMinusSquareIconBase
      className="overrides"
      sx={sx}
      onClick={handleOnClick}
      {...other}
    />
  );
}
