import { CSSProperties, MouseEvent } from 'react';

import styled from '@emotion/styled';
import { FaXmark } from 'react-icons/fa6';

import { IconProps } from './IconProps';

const EpayCrossIconBase = styled(FaXmark)(
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

export default function EpayCrossIcon({ sx, onClick, ...other }: IconProps) {
  const handleOnClick = (e: MouseEvent<HTMLOrSVGElement>) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <EpayCrossIconBase
      className="overrides"
      sx={sx}
      onClick={handleOnClick}
      {...other}
    />
  );
}
