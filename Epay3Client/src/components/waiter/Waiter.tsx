import { Box } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme } from '@mui/material/styles';
import { useEpayLoading } from 'providers/EpayLoadingProvider';

export default function Waiter() {
  const { isLoading } = useEpayLoading();
  const theme = useTheme();

  return (
    <>
      {isLoading && (
        <Box
          sx={{
            position: 'fixed',
            display: 'grid',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            padding: 'auto',
            justifyContent: 'center',
            alignContent: 'center',
            color: '#000000',
            backgroundColor: '#FFFFFF',
            opacity: 0.35,
            zIndex: 999998,
          }}
        >
          <CircularProgress
            size="10rem"
            sx={{
              zIndex: 999999,
              color: theme.palette.spinner.main,
              opacity: 0.75,
            }}
          />
        </Box>
      )}
    </>
  );
}
