import { CSSProperties, MouseEvent } from 'react';

import styled from '@emotion/styled';
import { FaUsersCog } from 'react-icons/fa';

import { IconProps } from './IconProps';

const EpayUserManagementIconBase = styled(FaUsersCog)(
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

export default function EpayUserManagementIcon({
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
    <EpayUserManagementIconBase
      className="overrides"
      sx={sx}
      onClick={handleOnClick}
      {...other}
    />
  );
}
