import { CSSProperties, MouseEvent } from 'react';

import styled from '@emotion/styled';
import { FaMoneyBill1 } from 'react-icons/fa6';

import { IconProps } from './IconProps';

const EpayDepositsIconBase = styled(FaMoneyBill1)(
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

export default function EpayDepositsIcon({ sx, onClick, ...other }: IconProps) {
  const handleOnClick = (e: MouseEvent<HTMLOrSVGElement>) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <EpayDepositsIconBase
      className="overrides"
      sx={sx}
      onClick={handleOnClick}
      {...other}
    />
  );
}
