import { CSSProperties, useRef, useState, Key, ReactNode } from 'react';

import { Typography } from '@mui/material';
import { Box, useTheme } from '@mui/system';
import { styled } from '@mui/material/styles';
import EpayAngleDownIcon from 'shared/icons/EpayAngleDownIcon';

import EpayPopOver from './EpayPopOver';

interface EpaySelectionButtonProps {
  placeholder?: string;
  id?: string;
  name?: string;
  data: Record<string, unknown>[];
  optionKey: string;
  optionText: string;
  onSelect?: (data: string) => void;
  optionsLocation?: 'top' | 'bottom' | 'auto';
  height?: CSSProperties['height'];
  width?: CSSProperties['width'];
  renderer?: (data: Record<string, unknown>) => ReactNode;
  disabled?: boolean;
  padding?: CSSProperties['padding'];
  marginLeft?: CSSProperties['marginLeft'];
  marginRight?: CSSProperties['marginRight'];
  marginTop?: CSSProperties['marginTop'];
  marginBottom?: CSSProperties['marginBottom'];
  label?: string;
}

interface ButtonBaseProps {
  height?: CSSProperties['height'];
  width?: CSSProperties['width'];
  disabled?: boolean;
  padding?: CSSProperties['padding'];
  marginLeft?: CSSProperties['marginLeft'];
  marginRight?: CSSProperties['marginRight'];
  marginTop?: CSSProperties['marginTop'];
  marginBottom?: CSSProperties['marginBottom'];
}

const ButtonBase = styled('button')<ButtonBaseProps>(
  ({
    theme,
    width,
    padding,
    disabled,
    height,
    marginLeft,
    marginRight,
    marginTop,
    marginBottom,
  }) => ({
    width: width ?? 'auto',
    color: theme.palette.text.primary,
    backgroundColor: 'transparent',
    opacity: disabled ? 0.75 : 1,
    fontFamily: theme.typography.fontFamily,
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: 1.5,
    padding: padding ?? '.5rem .8rem',
    border: `1px solid ${theme.mixins.border.color}`,
    borderRadius: '10px',
    height: height ?? 'inherit',
    cursor: disabled ? 'not-allowed' : 'pointer',
    '&> *': {
      verticalAlign: 'middle',
    },
    '&:hover': {
      borderColor: `${theme.palette.text.main}`,
    },
    '&:focus': {
      outline: `auto ${theme.palette.interactiveColor ? theme.palette.interactiveColor : 'rgb(0, 95, 204)'}`,
    },
    marginLeft,
    marginRight,
    marginTop,
    marginBottom,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  }),
);

const BaseDropDown = styled(Box)<{ width?: string }>(({ theme, width }) => ({
  width: width || '20rem',
  boxShadow:
    'rgba(0, 0, 0, 0.2) 0px 3px 1px -2px, rgba(0, 0, 0, 0.14) 0px 2px 2px 0px, rgba(0, 0, 0, 0.12) 0px 1px 5px 0px',
  borderRadius: `${theme.shape.borderRadius}px`,
  border: `1px solid ${theme.mixins.border.color}`,
  backgroundColor: theme.palette.background.paper,
  paddingTop: '.6rem',
  paddingBottom: '.6rem',
  marginTop: '0',
}));

const DropDownOption = styled(Box)(({ theme }) => ({
  width: '100%',
  boxSizing: 'border-box',
  padding: '.5rem .8rem',
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  cursor: 'pointer',
  overflow: 'hidden',
  textWrap: 'nowrap',
  textOverflow: 'ellipsis',
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
}));
const EllipsedDiv = styled('div')(() => ({
  overflow: 'hidden',
  textWrap: 'nowrap',
  textOverflow: 'ellipsis',
}));

export default function EpaySelectionButton({
  data,
  placeholder,
  optionKey,
  optionText,
  onSelect,
  optionsLocation = 'auto',
  width,
  renderer,
  disabled,
  marginLeft,
  marginRight,
  label,
  height,
  padding,
}: EpaySelectionButtonProps) {
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  const theme = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [iconStyle, setIconStyle] = useState({
    transform: 'rotate(0deg)',
    position: 'relative',
    left: '2px',
    color: '#808080',
  });

  const componentRef = useRef<HTMLButtonElement>(null);

  const openSelect = () => {
    const open = !isOpen;
    const style = iconStyle;
    style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
    setIsOpen(open);
    setIconStyle(style);
  };

  const selectSingle = (data: Record<string, unknown>) => {
    if (onSelect) {
      onSelect(String(data[optionKey] ?? ''));
    }

    openSelect();
  };

  return (
    <Box sx={{ width: '100%' }}>
      {!!label && <Typography variant="body1">{label}</Typography>}
      <ButtonBase
        onClick={() => !disabled && openSelect()}
        ref={componentRef}
        disabled={disabled}
        width={width}
        height={height}
        padding={padding}
        marginLeft={marginLeft}
        marginRight={marginRight}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          flexDirection="row"
          flexGrow={1}
        >
          <EllipsedDiv>
            <Typography variant="body2">{placeholder}</Typography>
          </EllipsedDiv>
          <EpayAngleDownIcon sx={iconStyle} />
        </Box>
      </ButtonBase>

      {isOpen && (
        <EpayPopOver
          onClickOutSide={openSelect}
          componentRef={componentRef}
          childrenLocation={optionsLocation}
        >
          <BaseDropDown width={`${componentRef.current?.offsetWidth}px`}>
            {data.map((d) => {
              return (
                <DropDownOption
                  key={d[optionKey] as Key}
                  onClick={() => selectSingle(d)}
                >
                  {renderer ? renderer(d) : String(d[optionText] ?? '')}
                </DropDownOption>
              );
            })}
          </BaseDropDown>
        </EpayPopOver>
      )}
    </Box>
  );
}
