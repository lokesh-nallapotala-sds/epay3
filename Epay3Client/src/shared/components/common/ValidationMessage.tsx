import { styled } from '@mui/material/styles';

export const ValidationMessage = styled('div')(({ theme }) => ({
  fontSize: '1rem',
  fontWeight: 400,
  lineHeight: 1.5,
  color: theme.palette.error.main,
  position: 'absolute',
}));
