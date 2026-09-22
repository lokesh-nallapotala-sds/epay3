import { CSSProperties, MouseEvent } from 'react';

import styled from '@emotion/styled';
import { FaListCheck } from 'react-icons/fa6';

import { IconProps } from './IconProps';

const EpayPaymentsIconBase = styled(FaListCheck)(
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

export default function EpayPaymentsIcon({ sx, onClick, ...other }: IconProps) {
  const handleOnClick = (e: MouseEvent<HTMLOrSVGElement>) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <EpayPaymentsIconBase
      className="overrides"
      sx={sx}
      onClick={handleOnClick}
      {...other}
    />
  );
}
