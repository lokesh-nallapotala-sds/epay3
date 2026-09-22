import {
  CSSProperties,
  ReactNode,
  ButtonHTMLAttributes,
  MouseEvent,
} from 'react';

import styled from '@emotion/styled';

interface EpayButtonProps {
  variant: 'primary' | 'secondary' | 'link' | 'default' | 'custom';
  type?: string;
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
  disabled?: boolean;
  padding?: CSSProperties['padding'];
  border?: boolean;
  color?: CSSProperties['color'];
  other?: ButtonHTMLAttributes<HTMLButtonElement>;
}

const ButtonBase = styled('button')((props: any) => ({
  width: props.width ?? 'auto',
  fontFamily: props.fontFamily ?? props.theme.typography.fontFamily,
  fontSize: '1rem',
  fontWeight: 400,
  lineHeight: 1.5,
  padding: props.padding ?? '.5rem .8rem',
  borderRadius: `1px`,
  border: props.border
    ? `1px solid ${props.theme.mixins.border.color}`
    : 'none',
  cursor: props.disabled ? 'not-allowed' : 'pointer',
  outline: 'none',
  height: props.height ?? 'inherit',
  opacity: props.disabled ? 0.75 : 1,
  '&> *': {
    verticalAlign: 'middle',
  },
  '&.epay-btn-primary': {
    color: props.color ?? props.theme.palette.primary.contrastText,
    backgroundColor: props.theme.palette.interactiveColor,
    '&:hover': {
      backgroundColor: props.disabled
        ? props.theme.palette.interactiveColor
        : props.theme.palette.primary.hover,
    },
  },
  '&.epay-btn-secondary': {
    color: props.color ?? props.theme.palette.secondary.contrastText,
    backgroundColor: props.theme.palette.secondary.main,
    '&:hover': {
      backgroundColor: props.disabled
        ? props.theme.palette.secondary.main
        : props.theme.palette.secondary.hover,
    },
  },
  '&.epay-btn-link': {
    color: props.color ?? props.theme.palette.text.link,
    backgroundColor: 'transparent',
    textDecoration: 'underline',
  },
  '&.epay-btn-default': {
    color: props.color ?? props.theme.palette.text.main,
    backgroundColor: 'transparent',
  },
  '&.epay-btn-custom': {
    color: props.color ?? props.theme.palette.text.main,
    backgroundColor: '#DEDEDE',
  },
  color: props.color,
}));

export default function EpayButton({
  children,
  color,
  variant,
  onClick,
  type = 'button',
  disabled = false,
  border,
  other,
  width,
  height,
}: EpayButtonProps) {
  const handleOnClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (onClick && !disabled) onClick(e);
  };

  return (
    <ButtonBase
      onClick={handleOnClick}
      className={`epay-btn-${variant}`}
      disabled={disabled}
      type={type}
      variant={variant}
      width={width}
      height={height}
      color={color}
      border={border}
      {...other}
    >
      {children}
    </ButtonBase>
  );
}
