import { Theme } from '@mui/material/styles';

export const getCompactFilterFieldSx = (theme: Theme) => ({
  minWidth: 0,
  '&& .MuiInputBase-root': {
    minWidth: 0,
    borderRadius: `${theme.shape.borderRadius}px`,
    overflow: 'hidden',
    borderColor: theme.palette.primary.borderColor || theme.mixins.border.color,
    '&:hover': {
      borderColor: theme.palette.text.main,
    },
    '&.Mui-focused': {
      borderColor:
        theme.palette.primary.borderColor || theme.mixins.border.color,
      outline: `auto ${theme.palette.interactiveColor || 'rgb(0, 95, 204)'}`,
      outlineOffset: '0px',
    },
    '&.Mui-focused:hover': {
      borderColor:
        theme.palette.primary.borderColor || theme.mixins.border.color,
      outline: `auto ${theme.palette.interactiveColor || 'rgb(0, 95, 204)'}`,
      outlineOffset: '0px',
    },
  },
  '&& .MuiOutlinedInput-notchedOutline': {
    borderWidth: '0 !important',
    borderColor: 'transparent !important',
  },
  '&& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderWidth: '0 !important',
    borderColor: 'transparent !important',
  },
  '&& .MuiSelect-select': {
    borderRadius: 'inherit',
  },
  '&& .MuiSelect-select:focus': {
    borderRadius: 'inherit',
    backgroundColor: 'transparent',
  },
});
