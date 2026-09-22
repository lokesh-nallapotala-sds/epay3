import { ChangeEvent } from 'react';

import { Grid, MenuItem, TextField, Typography } from '@mui/material';
import { SxProps, Theme } from '@mui/material';
import {
  compactFilterMenuItemSx,
  compactFilterSelectProps,
} from 'shared/components/compactFilterSelectStyles';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';
import { useAutoFlipSelect } from 'shared/components/useAutoFlipSelect';

interface CompactFilterSelectProps {
  label: string;
  value: string;
  options: { key: string; value: string }[];
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onItemClick?: (key: string) => void;
  /** Keeps the field showing its focused treatment while an anchored
   *  popup (e.g. a date picker) driven by this field is open. */
  active?: boolean;
  sx?: SxProps<Theme>;
}

export default function CompactFilterSelect({
  label,
  value,
  options,
  onChange,
  onItemClick,
  active,
  sx,
}: CompactFilterSelectProps) {
  const { fieldRef, resolvedSelectProps } = useAutoFlipSelect({
    optionCount: options.length,
    selectProps: compactFilterSelectProps,
  });

  return (
    <Grid container direction="column" rowGap=".3rem" sx={sx}>
      <Grid item>
        <Typography variant="fieldHeader">{label}</Typography>
      </Grid>
      <Grid item>
        <TextField
          ref={fieldRef}
          select
          size="small"
          fullWidth
          value={value}
          onChange={onChange}
          SelectProps={resolvedSelectProps}
          sx={(theme) => {
            const fieldSx = getCompactFilterFieldSx(theme);
            return {
              ...fieldSx,
              ...(active && {
                '&& .MuiInputBase-root': {
                  ...fieldSx['&& .MuiInputBase-root'],
                  ...fieldSx['&& .MuiInputBase-root']['&.Mui-focused'],
                  '&:hover':
                    fieldSx['&& .MuiInputBase-root']['&.Mui-focused:hover'],
                },
              }),
              '& .MuiSelect-select': {
                ...fieldSx['&& .MuiSelect-select'],
                boxSizing: 'border-box',
                display: 'block',
                minWidth: 0,
                overflow: 'hidden',
                paddingRight: '42px !important',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              },
              '& .MuiSelect-select .MuiTypography-root': {
                display: 'block',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              },
              '& .MuiSelect-select:focus': {
                ...fieldSx['&& .MuiSelect-select:focus'],
              },
            };
          }}
        >
          {options.map((opt) => (
            <MenuItem
              key={opt.key}
              value={opt.key}
              onClick={onItemClick ? () => onItemClick(opt.key) : undefined}
              sx={compactFilterMenuItemSx}
            >
              <Typography variant="body2">{opt.value}</Typography>
            </MenuItem>
          ))}
        </TextField>
      </Grid>
    </Grid>
  );
}
