import { CSSProperties, MouseEvent } from 'react';

import styled from '@emotion/styled';
import { FaRegPlusSquare } from 'react-icons/fa';

import { IconProps } from './IconProps';

const EpayPlusSquareIconBase = styled(FaRegPlusSquare)(
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

export default function EpayPlusSquareIcon({
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
    <EpayPlusSquareIconBase
      className="overrides"
      sx={sx}
      onClick={handleOnClick}
      {...other}
    />
  );
}
