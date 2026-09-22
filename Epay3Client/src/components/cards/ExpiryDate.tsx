import { ChangeEvent, FocusEvent, useEffect, useRef, useState } from 'react';

import TextMaskCustom from '../../shared/components/TextMaskCustom';
import { expirationDate } from 'card-validator';

import { TextField } from '@mui/material';
import { ExpirationDateVerification } from 'card-validator/dist/expiration-date';

import { InputProps } from './cardInputHelpers';
import { useFormat } from 'hooks/useFormat';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

const ExpiryDate = ({ data, focus, onChange, onError }: InputProps) => {
  const [error, setError] = useState(false);
  const [info, setInfo] = useState('');
  const inputRef = useRef<HTMLInputElement>(null!);
  const [expDate, setExpDate] = useState('');

  const f = useFormat();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event?.target?.value;
    setExpDate(value);
    onChange?.(value);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    const value = event?.target?.value;
    const epirationDate: ExpirationDateVerification = expirationDate(value);
    if (epirationDate.isValid) {
      setError(false);
      setInfo('');
      onError?.('');
    } else {
      setError(true);
      setInfo(f('payment_methods.exp_date.error'));
      onError?.(f('payment_methods.exp_date.error'));
      event.target.value = '';
    }
  };

  useEffect(() => {
    if (focus) {
      inputRef.current.focus();
    }
    if (data) setExpDate(data);
  }, [focus, data]);

  return (
    <TextField
      name="expire"
      type="text"
      error={error}
      helperText={info}
      autoFocus={focus}
      required
      fullWidth
      inputRef={inputRef}
      placeholder="MM/YY"
      InputProps={{
        inputComponent: TextMaskCustom as any,
        inputProps: {
          mask: '00/00',
          lazy: true,
        },
      }}
      onChange={handleChange}
      onBlur={handleBlur}
      value={expDate}
      sx={(muiTheme) => ({
        ...getCompactFilterFieldSx(muiTheme),
        '& .MuiInputBase-root': {
          ...getCompactFilterFieldSx(muiTheme)['&& .MuiInputBase-root'],
        },
        '& .MuiInputBase-input': {
          height: '28px',
          maxWidth: '80px',
          padding: '10px',
        },
      })}
    />
  );
};

export default ExpiryDate;
