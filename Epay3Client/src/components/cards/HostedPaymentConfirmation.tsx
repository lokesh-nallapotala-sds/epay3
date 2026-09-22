import { useIntl } from 'react-intl';
import { Box, Button, Typography } from '@mui/material';
import EpayCheckBox from 'shared/components/EpayCheckBox';
import { useTheme } from '@mui/material/styles';
import {
  EpayModalBody,
  EpayModalFooter,
  EpayModalHeader,
} from 'shared/components/EpayModalLayout';

interface HostedPaymentConfirmationProps {
  titleKey: string;
  error: string | null;
  isLoading: boolean;
  isWaiting: boolean;
  showSaveOnFileCheckbox?: boolean;
  saveOnFile?: boolean;
  onSaveOnFileChange?: (checked: boolean) => void;
  onClose: () => void;
  onContinue: () => void;
}

export const HostedPaymentConfirmation = ({
  titleKey,
  error,
  isLoading,
  isWaiting,
  showSaveOnFileCheckbox = false,
  saveOnFile = false,
  onSaveOnFileChange,
  onClose,
  onContinue,
}: HostedPaymentConfirmationProps) => {
  const intl = useIntl();
  const theme = useTheme();
  const f = (id: string) => intl.formatMessage({ id, defaultMessage: id });

  return (
    <Box>
      <EpayModalHeader heading={f(titleKey)} />
      <EpayModalBody
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          gap: (currentTheme) => currentTheme.mixins.modal.contentGap,
        }}
      >
        <Box
          sx={{
            width: '100%',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: (currentTheme) => currentTheme.mixins.modal.contentGap,
          }}
        >
          <Typography
            sx={{
              m: 0,
              mt: '-4px',
              color: '#666D80',
              fontSize: '15px',
              fontWeight: 500,
              lineHeight: '22px',
            }}
          >
            {f('payment.hosted.redirect_message')}
          </Typography>
          <Typography
            sx={{
              m: 0,
              color: '#666D80',
              fontSize: '15px',
              fontWeight: 500,
              lineHeight: '22px',
            }}
          >
            {f('payment.hosted.return_message')}
          </Typography>

          {error && (
            <Typography color="error" variant="body2" sx={{ m: 0 }}>
              {error}
            </Typography>
          )}
        </Box>

        {showSaveOnFileCheckbox && !isWaiting && !isLoading && (
          <Box
            sx={{
              width: '100%',
              mt: 4,
              textAlign: 'left',
              mb: '-4px',
            }}
          >
            <Box
              display="flex"
              alignItems="center"
              gap={1}
              onClick={() => onSaveOnFileChange?.(!saveOnFile)}
              sx={{
                cursor: 'pointer',
                width: 'fit-content',
                '&:hover': {
                  opacity: 0.8,
                },
              }}
            >
              <EpayCheckBox checked={saveOnFile} />
              <Typography
                sx={{
                  color: '#0D0D12',
                  fontSize: '15px',
                  fontWeight: 500,
                  m: 0,
                }}
              >
                {f('payment_methods.save_for_future_use')}
              </Typography>
            </Box>
          </Box>
        )}
      </EpayModalBody>

      <EpayModalFooter>
        <Button variant="outlined" color="secondary" onClick={onClose}>
          {f('payment_methods.cancel_button')}
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={isLoading || isWaiting}
          onClick={onContinue}
          sx={{
            border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
            '&:hover': {
              border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
            },
            '&.Mui-disabled': {
              border: 'none',
              backgroundColor: '#E0E0E0',
              color: 'rgba(0, 0, 0, 0.38)',
            },
          }}
        >
          {f('payment.hosted.continue_button')}
        </Button>
      </EpayModalFooter>
    </Box>
  );
};

export default HostedPaymentConfirmation;
