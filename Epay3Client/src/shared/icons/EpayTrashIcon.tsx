import { CSSProperties, MouseEvent } from 'react';

import styled from '@emotion/styled';
import { FaTrashAlt } from 'react-icons/fa';

import { IconProps } from './IconProps';

const EpayTrashIconBase = styled(FaTrashAlt)(
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

export default function EpayTrashIcon({ sx, onClick, ...other }: IconProps) {
  const handleOnClick = (e: MouseEvent<HTMLOrSVGElement>) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <EpayTrashIconBase
      className="overrides"
      sx={sx}
      onClick={handleOnClick}
      {...other}
    />
  );
}
