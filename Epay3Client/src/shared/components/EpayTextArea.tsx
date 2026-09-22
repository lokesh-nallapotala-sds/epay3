import { ChangeEvent } from 'react';

import { Box } from '@mui/system';
import styled from '@emotion/styled';

import { ValidationMessage } from './common/ValidationMessage';

interface EpayTextAreaProps {
  value: string;
  rows: number;
  cols: number;
  placeholder?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  isError?: boolean;
  errorMessage?: string;
}

const TextAreaBase = styled('textarea')((props: any) => ({
  cols: props.cols,
  rows: props.rows,
  fontFamily: props.fontFamily ?? props.theme.typography.fontFamily,
  fontSize: props.fontSize ?? '1rem',
  fontWeight: props.fontWeight ?? 400,
  lineHeight: props.lineHeight ?? 2.5,
  width: props.width ?? '100%',
  padding: props.padding ?? '.5rem .8rem',
  borderRadius: props.borderRadius ?? `${props.theme.shape.borderRadius}px`,
  color: props.color ?? props.theme.palette.text.primary,
  backgroundColor:
    props.backgroundColor ?? props.theme.palette.background.paper,
  border: props.isError
    ? `1px solid ${props.theme.palette.error.main}`
    : `1px solid ${props.theme.mixins.border.color}`,
  borderTopLeftRadius: props.isPrepend
    ? 0
    : (props.borderRadius ?? `${props.theme.shape.borderRadius}px`),
  borderBottomLeftRadius: props.isPrepend
    ? 0
    : (props.borderRadius ?? `${props.theme.shape.borderRadius}px`),
  '&:focus': {
    border: props.isError
      ? `1px solid ${props.theme.palette.error.main}`
      : `2px solid ${props.theme.palette.text.primary}`,
  },
}));

export default function EpayTextArea({
  value,
  rows,
  cols,
  placeholder,
  onChange,
  onBlur,
  isError = false,
  errorMessage,
}: EpayTextAreaProps) {
  const handleOnChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  const handleOnBlur = () => {
    if (onBlur) {
      onBlur();
    }
  };

  return (
    <>
      <Box display="flex">
        <TextAreaBase
          resize="none"
          cols={cols}
          rows={rows}
          placeholder={placeholder}
          type={'textarea'}
          value={value}
          onChange={handleOnChange}
          isError={isError}
          onBlur={handleOnBlur}
        />
      </Box>
      {isError && errorMessage && (
        <ValidationMessage>{errorMessage}</ValidationMessage>
      )}
    </>
  );
}
