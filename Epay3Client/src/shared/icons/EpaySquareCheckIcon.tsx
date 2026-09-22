import { CSSProperties, HTMLAttributes, MouseEvent, Ref } from 'react';

import styled from '@emotion/styled';

import { IconProps } from './IconProps';

const CustomCheckIcon = ({
  fill,
  ref,
  ...props
}: HTMLAttributes<HTMLOrSVGElement> & {
  fill?: string;
  ref?: Ref<SVGSVGElement>;
}) => (
  <svg
    ref={ref}
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    version="1.1"
    width="1em"
    height="1em"
    viewBox="0 0 1080 1080"
    xmlSpace="preserve"
    {...props} // Spread props to forward attributes like onClick
  >
    <g
      transform="matrix(1 0 0 1 540 540)"
      id="e34dc30d-07d3-4408-bd9a-b310811f1b75"
    >
      <rect
        stroke="none"
        strokeWidth={1}
        strokeDasharray="none"
        strokeLinecap="butt"
        strokeDashoffset={0}
        strokeLinejoin="miter"
        strokeMiterlimit={4}
        fill="rgb(255,255,255)"
        fillRule="nonzero"
        opacity={1}
        visibility="hidden"
        vectorEffect="non-scaling-stroke"
        x="-540"
        y="-540"
        rx="0"
        ry="0"
        width="16"
        height="16"
      />
    </g>
    <g
      transform="matrix(1 0 0 1 540 540)"
      id="735defec-a2c0-4c84-ae66-1cc84b76276d"
    ></g>
    <g
      transform="matrix(9.14 0 0 9.14 543.56 543.56)"
      id="1724fb7b-0f08-436b-ba67-f9b0916ae009"
    >
      <rect
        strokeDasharray="none"
        strokeLinecap="butt"
        strokeDashoffset={0}
        strokeLinejoin="miter"
        strokeMiterlimit={4}
        fill="rgb(255,255,255)"
        fillRule="nonzero"
        opacity={1}
        vectorEffect="non-scaling-stroke"
        x="-33.0835"
        y="-33.0835"
        rx="0"
        ry="0"
        width="66.167"
        height="66.167"
      />
    </g>
    <g transform="matrix(2.41 0 0 2.41 540 540)">
      <path
        strokeDasharray="none"
        strokeDashoffset={0}
        strokeLinejoin="miter"
        strokeMiterlimit={4}
        fill={fill}
        fillRule="nonzero"
        opacity={1}
        transform="translate(-224, -256)"
        d="M 64 32 C 28.7 32 0 60.7 0 96 L 0 416 C 0 451.3 28.7 480 64 480 L 384 480 C 419.3 480 448 451.3 448 416 L 448 96 C 448 60.7 419.3 32 384 32 L 64 32 z M 337 209 L 209 337 C 199.6 346.4 184.4 346.4 175.1 337 L 111.1 273 C 101.69999999999999 263.6 101.69999999999999 248.4 111.1 239.1 C 120.5 229.79999999999998 135.7 229.7 145 239.1 L 192 286.1 L 303 175 C 312.4 165.6 327.6 165.6 336.9 175 C 346.19999999999993 184.4 346.29999999999995 199.6 336.9 208.9 z"
        strokeLinecap="round"
      />
    </g>
  </svg>
);

const EpaySquareCheckIconBase = styled(CustomCheckIcon)(
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

export default function EpaySquareCheckIcon({
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
    <EpaySquareCheckIconBase
      className="overrides"
      sx={sx}
      onClick={handleOnClick}
      {...other}
    />
  );
}
