import { CSSProperties, MouseEvent } from 'react';

import styled from '@emotion/styled';
import { FaFileInvoice } from 'react-icons/fa6';

import { IconProps } from './IconProps';

const EpayInvoicesIconBase = styled(FaFileInvoice)(
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

export default function EpayInvoicesIcon({ sx, onClick, ...other }: IconProps) {
  const handleOnClick = (e: MouseEvent<HTMLOrSVGElement>) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <EpayInvoicesIconBase
      className="overrides"
      sx={sx}
      onClick={handleOnClick}
      {...other}
    />
  );
}
