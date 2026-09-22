import { useState, ChangeEvent } from 'react';
import { TextField, InputAdornment } from '@mui/material';
import { getCompactFilterFieldSx } from './compactFilterFieldStyles';

const isValidHex = (value: string) => /^#([0-9A-Fa-f]{6})$/.test(value);

const EpayHexColorField = ({ name, value, onChange }) => {
  const [error, setError] = useState(false);

  const handleTextChange = (e: ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    newValue = newValue.replace(/[^#0-9A-Fa-f]/g, '');

    newValue = newValue.substring(0, 7);

    onChange({ target: { name, value: newValue } });

    if (newValue && isValidHex(newValue)) {
      setError(false);
    }
  };

  const handleColorChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange({ target: { name, value: e.target.value } });
    setError(false);
  };

  const handleBlur = () => {
    if (value && !isValidHex(value)) {
      setError(true);
    } else {
      setError(false);
    }
  };

  return (
    <TextField
      fullWidth
      name={name}
      value={value || ''}
      onChange={handleTextChange}
      onBlur={handleBlur}
      error={error}
      helperText={error ? 'Invalid hex code (format: #RRGGBB)' : ''}
      inputProps={{ maxLength: 7 }}
      sx={(muiTheme) => ({
        ...getCompactFilterFieldSx(muiTheme),
        '& .MuiOutlinedInput-root': {
          '&.Mui-error .MuiOutlinedInput-notchedOutline': {
            borderColor: 'error.main',
            borderWidth: '2px',
          },
        },
      })}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <input
              type="color"
              value={isValidHex(value) ? value : '#000000'}
              id={name}
              onChange={handleColorChange}
            />
          </InputAdornment>
        ),
      }}
    />
  );
};

export default EpayHexColorField;
