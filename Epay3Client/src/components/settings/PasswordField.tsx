import { ChangeEvent, MouseEvent } from 'react';

import { useTheme } from '@mui/system';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import useMediaQuery from '@mui/material/useMediaQuery';
import InputAdornment from '@mui/material/InputAdornment';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined';
import { useFormat } from 'hooks/useFormat';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

interface PasswordFieldProps {
  label: string;
  value: string;
  visible: boolean;
  error?: string;
  required?: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onVisibilityToggle: () => void;
}

export function PasswordField({
  label,
  value,
  visible,
  error = '',
  required = false,
  onChange,
  onVisibilityToggle,
}: PasswordFieldProps) {
  const theme = useTheme();
  const lgUp = useMediaQuery(theme.breakpoints.up('lg'));
  const f = useFormat();

  const handleMouseDown = (e: MouseEvent<HTMLButtonElement>) =>
    e.preventDefault();

  return (
    <Grid item>
      <Grid
        container
        direction={lgUp ? 'row' : 'column'}
        alignItems={lgUp ? 'center' : undefined}
        rowSpacing={!lgUp ? '0.35rem' : undefined}
      >
        <Grid item xs={12} lg={6} display="flex">
          <Typography variant="fieldHeader">{label}</Typography>
          {required && (
            <Typography variant="fieldHeader" color="red" ml="4px">
              {f('app.common.required_indicator')}
            </Typography>
          )}
        </Grid>
        <Grid item xs={12} lg={6}>
          <TextField
            type={visible ? 'text' : 'password'}
            fullWidth
            value={value}
            onChange={onChange}
            error={!!error}
            helperText={error}
            sx={(muiTheme) => ({
              ...getCompactFilterFieldSx(muiTheme),
            })}
            // Prevent the browser/password manager from auto-filling the saved
            // login password into these fields (they should start empty).
            inputProps={{ autoComplete: 'new-password' }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    tabIndex={-1}
                    onClick={onVisibilityToggle}
                    onMouseDown={handleMouseDown}
                  >
                    {visible ? (
                      <VisibilityOffOutlined />
                    ) : (
                      <VisibilityOutlined />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Grid>
      </Grid>
    </Grid>
  );
}
