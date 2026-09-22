import { useIntl } from 'react-intl';

import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Box, Button, Typography, useTheme } from '@mui/material';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';

interface EpayPageNavigatorProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function EpayPageNavigator({
  currentPage,
  totalPages,
  onPageChange,
}: EpayPageNavigatorProps) {
  const theme = useTheme();
  const intl = useIntl();
  const f = (id: string) => intl.formatMessage({ id: id });
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'left',
        alignItems: 'center',
        gap: '0.5rem',
        marginTop: '5px',
        color: `${theme.palette.text.main}`,
      }}
    >
      <Button
        variant="outlined"
        disabled={(totalPages && totalPages <= 1) || currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        sx={{
          height: '32px !important',
          width: '32px !important',
          padding: '12px !important',
          minWidth: '24px',
          border: '1px solid',
          borderColor: '#DFE1E6',
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: 'transparent',
            border: '1px solid',
            borderColor: '#DFE1E6',
            borderRadius: '0px',
          },
        }}
      >
        <NavigateBeforeIcon
          sx={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#0D0D12 !important',
          }}
        />
      </Button>

      {currentPage > 3 && <Typography>{f('app.common.ellipses')}</Typography>}

      {currentPage - 2 > 0 && (
        <Button
          variant="outlined"
          onClick={() => onPageChange(currentPage - 2)}
          sx={{
            color: '#4a4a4a',
            height: '1.8rem !important',
            width: '1.8rem',
            minWidth: '1.8rem',
            border: 'none',
            borderRadius: '0px',
            '&:hover': {
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '0px',
            },
          }}
        >
          <Typography variant="body2">{currentPage - 2}</Typography>
        </Button>
      )}

      {currentPage - 1 > 0 && (
        <Button
          variant="outlined"
          onClick={() => onPageChange(currentPage - 1)}
          sx={{
            height: '1.8rem !important',
            width: '1.8rem',
            minWidth: '1.8rem',
            border: 'none',
            borderRadius: '0px',
            color: '#808897 !important',
            '&:hover': {
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '0px',
              color: '#808897 !important',
            },
          }}
        >
          <Typography variant="body2">{currentPage - 1}</Typography>
        </Button>
      )}

      {currentPage > 0 && (
        <Button
          variant="outlined"
          sx={{
            height: '1.8rem !important',
            width: '1.8rem',
            minWidth: '1.8rem',
            borderStyle: 'none',
            borderRadius: '0px',
            color: '#0D0D12',
            '&:hover': {
              backgroundColor: 'transparent',
              borderStyle: 'none',
              borderRadius: '0px',
            },
          }}
        >
          <Typography variant="body2">{currentPage}</Typography>
        </Button>
      )}

      {currentPage + 1 <= totalPages && (
        <Button
          variant="outlined"
          onClick={() => onPageChange(currentPage + 1)}
          sx={{
            height: '1.8rem !important',
            width: '1.8rem',
            minWidth: '1.8rem',
            border: 'none',
            borderRadius: '0px',
            color: '#808897 !important',
            '&:hover': {
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '0px',
              color: '#808897 !important',
            },
          }}
        >
          <Typography variant="body2">{currentPage + 1}</Typography>
        </Button>
      )}

      {currentPage + 2 <= totalPages && (
        <Button
          variant="outlined"
          onClick={() => onPageChange(currentPage + 2)}
          sx={{
            height: '1.8rem !important',
            width: '1.8rem',
            minWidth: '1.8rem',
            border: 'none',
            borderRadius: '0px',
            color: '#808897 !important',
            '&:hover': {
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '0px',
              color: '#808897 !important',
            },
          }}
        >
          <Typography variant="body2">{currentPage + 2}</Typography>
        </Button>
      )}

      {totalPages - currentPage > 3 && (
        <Typography>{f('app.common.ellipses')}</Typography>
      )}

      <Button
        sx={{
          height: '32px !important',
          width: '32px !important',
          minWidth: '24px',
          padding: '12px !important',
          border: '1px solid',
          borderColor: '#DFE1E6',
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: 'transparent',
            border: '1px solid',
            borderColor: '#DFE1E6',
            borderRadius: '0px',
          },
        }}
        variant="outlined"
        disabled={(totalPages && totalPages <= 1) || currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <NavigateNextIcon
          sx={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#0D0D12 !important',
          }}
        />
      </Button>
    </Box>
  );
}
