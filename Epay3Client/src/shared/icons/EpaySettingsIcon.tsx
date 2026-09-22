import { CSSProperties, MouseEvent } from 'react';

import styled from '@emotion/styled';
import { FaGear } from 'react-icons/fa6';

import { IconProps } from './IconProps';

const EpaySettingsIconBase = styled(FaGear)(
  (prop: IconProps & CSSProperties) => ({
    fontSize: '1.25rem',
    fontWeight: 400,
    color: 'inherit',
    backgroundColor: 'transparent',
    '&.overrides': {
      ...prop.sx,
    },
  }),
);

export default function EpaySettingsIcon({ sx, onClick, ...other }: IconProps) {
  const handleOnClick = (e: MouseEvent<HTMLOrSVGElement>) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <EpaySettingsIconBase
      className="overrides"
      sx={sx}
      onClick={handleOnClick}
      {...other}
    />
  );
}
