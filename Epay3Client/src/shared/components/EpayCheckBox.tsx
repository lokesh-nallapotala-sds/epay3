import { useEffect, useState, HTMLAttributes } from 'react';

import { styled, SxProps, Theme } from '@mui/system';

import EpaySquareIcon from '../icons/EpaySquareIcon';
import EpaySquareCheckIcon from '../icons/EpaySquareCheckIcon';

type EpayCheckBoxAllProps = Omit<
  HTMLAttributes<HTMLInputElement>,
  'type' | 'onClick'
>;

interface EpayCheckBoxProps extends EpayCheckBoxAllProps {
  checked: boolean;
  disabled?: boolean;
  sx?: SxProps<Theme>;
  onClick?: (e: boolean) => void;
  fontSize?: string;
}

const CheckedBase = styled(EpaySquareCheckIcon)<{ fontSize?: string }>(
  (props) => ({
    fontSize: props.fontSize || '1.2rem',
    marginTop: '5px',
    fill: props.theme.palette.interactiveColor,
    cursor: 'pointer',
    '$.overrides': {
      ...props.sx,
    },
  }),
);

const UnCheckedBase = styled(EpaySquareIcon)<{ fontSize?: string }>(
  (props) => ({
    fontSize: props.fontSize || '1.2rem',
    marginTop: '5px',
    color: props.theme.palette.primary.borderColor,
    cursor: 'pointer',
    '$.overrides': {
      ...props.sx,
    },
  }),
);
export default function EpayCheckBox({
  checked,
  onClick,
  disabled = false,
  fontSize,
  ...other
}: EpayCheckBoxProps) {
  const [value, setValue] = useState(checked);

  useEffect(() => {
    setValue(checked);
  }, [checked]);

  const handleOnClick = () => {
    if (disabled) return;
    const newValue = !value;
    if (onClick) {
      onClick(newValue);
    }
  };

  return (
    <>
      {value ? (
        <CheckedBase
          onClick={handleOnClick}
          fontSize={fontSize}
          {...other}
          className="overrides"
        />
      ) : (
        <UnCheckedBase
          onClick={handleOnClick}
          fontSize={fontSize}
          {...other}
          className="overrides"
        />
      )}
    </>
  );
}
