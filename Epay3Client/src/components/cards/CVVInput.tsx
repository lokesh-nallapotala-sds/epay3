import { FocusEvent, useEffect, useRef, useState } from 'react';

import { cvv } from 'card-validator';
import TextMaskCustom from '../../shared/components/TextMaskCustom';

import { TextField } from '@mui/material';
import { Verification } from 'card-validator/dist/types';

import { absLength, InputProps } from './cardInputHelpers';
import { useFormat } from 'hooks/useFormat';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

interface CVVInputProps extends InputProps {
  charcount?: number;
  CVCLengthRequired: number;
  onError?: (value) => void;
  cardType: string;
}
const CVVInput = ({
  focus,
  tabIndex,
  cardType,
  onChange,
  onError,
}: CVVInputProps) => {
  const [error, setError] = useState(false);
  const [info, setInfo] = useState('');
  const f = useFormat();

  const inputRef = useRef<HTMLInputElement>(null!);
  const handleChange = () => {
    if (onError) onError(isValid(inputRef?.current.value));
    if (onChange) onChange(inputRef?.current.value);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    const CCVvalue = event?.target?.value.trim();
    const isValidValue = isValid(CCVvalue);
    if (isValidValue) {
      setError(false);
      setInfo('');
    } else {
      setError(true);
      setInfo(f('payment_methods.cvv.error'));
    }
  };

  const isValid = (CCVvalue) => {
    const CVCLength = absLength(CCVvalue);
    const CIDLength = cardType === 'amex' ? 4 : 3;
    const value: Verification = cvv(CCVvalue, CIDLength);
    return CVCLength > 0 && value.isValid ? true : false;
  };

  useEffect(() => {
    if (focus) {
      inputRef.current.focus();
    }
  }, [focus]);
  return (
    <TextField
      name="cvc"
      type="text"
      error={error}
      placeholder={cardType === 'amex' ? 'XXXX' : 'XXX'}
      tabIndex={tabIndex}
      required
      helperText={info}
      autoFocus={focus}
      inputRef={inputRef}
      fullWidth
      InputProps={{
        inputComponent: TextMaskCustom as any,
        inputProps: {
          mask: cardType === 'amex' ? '0000' : '000',
          lazy: true,
        },
      }}
      onChange={handleChange}
      onBlur={handleBlur}
      sx={(muiTheme) => ({
        ...getCompactFilterFieldSx(muiTheme),
        '& .MuiInputBase-root': {
          ...getCompactFilterFieldSx(muiTheme)['&& .MuiInputBase-root'],
        },
        '& .MuiInputBase-input': {
          height: '28px',
          maxWidth: '50px',
          padding: '10px',
        },
      })}
    />
  );
};

export default CVVInput;
