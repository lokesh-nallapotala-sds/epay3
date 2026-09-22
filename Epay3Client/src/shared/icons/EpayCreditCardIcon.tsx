import { CSSProperties, MouseEvent } from 'react';

import styled from '@emotion/styled';
import { FaRegCreditCard } from 'react-icons/fa';

import { IconProps } from './IconProps';

const EpayCreditCardIconBase = styled(FaRegCreditCard)(
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

export default function EpayCreditCardIcon({
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
    <EpayCreditCardIconBase
      className="overrides"
      sx={sx}
      onClick={handleOnClick}
      {...other}
    />
  );
}
