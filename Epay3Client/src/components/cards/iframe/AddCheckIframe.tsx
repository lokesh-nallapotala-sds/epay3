import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { useIntl } from 'react-intl';

import { useTheme } from '@mui/material/styles';
import { Box, Button, CircularProgress, Grid, Typography } from '@mui/material';
import EpayCheckBox from 'shared/components/EpayCheckBox';
import { useEpayToast } from 'providers/EpayToastProvider';
import { useAppSelector } from 'redux/hooks';
import { EpayPaymentService } from 'services/EpayPaymentService';
import { usePayerDetails } from 'providers/PayerDetailsProvider';
import { useIframeInitialization } from 'hooks/useIframeInitialization';
import {
  extractErrorMessage,
  getDynamicThemeStylesUrl,
} from 'utilities/utilities';
import { domainThemeSelector, impersonatedUserSelector } from 'redux/reducers';
import { usePaymentMethodAction } from 'hooks/usePaymentMethodAction';

import {
  PaymetricIframe,
  PaymetricIframeRef,
} from '../../payment/PaymetricIframe';
import {
  EpayModalBody,
  EpayModalFooter,
  EpayModalHeader,
} from 'shared/components/EpayModalLayout';

interface AddCheckIframeProps {
  onClose: () => void;
}

const waitForOverlayPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      window.setTimeout(resolve, 0);
    });
  });

const wait = (delayMs: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, delayMs);
  });

const MIN_SUBMIT_OVERLAY_MS = 400;

export const AddCheckIframe = ({ onClose }: AddCheckIframeProps) => {
  const getPaymentMethodEntryToken =
    EpayPaymentService.useGetPaymentMethodEntryToken();
  const getTokenizeResponse = EpayPaymentService.useGetTokenizeResponse();

  const { effectiveAccount: selectedAccount } = usePayerDetails();

  const theme = useTheme();
  const intl = useIntl();
  const { showToastMessage } = useEpayToast();
  const f = (id: string, defaultMsg: string = id) =>
    intl.formatMessage({ id, defaultMessage: defaultMsg });
  const impersonatedUser = useAppSelector(impersonatedUserSelector);
  const impersonatedUserId = impersonatedUser?.userId;
  const domainTheme = useAppSelector(domainThemeSelector);

  const iframeRef = useRef<PaymetricIframeRef>(null);
  const isClosingAfterSuccessRef = useRef(false);
  const [saveToFile, setSaveToFile] = useState<boolean>(false);
  const [isSubmittingInternal, setIsSubmittingInternal] =
    useState<boolean>(false);

  const { processPaymentMethod, isSubmitting: isProcessingPayment } =
    usePaymentMethodAction({
      onSuccess: () => {
        isClosingAfterSuccessRef.current = true;
        flushSync(() => {
          onClose();
        });
      },
      onError: async () => {
        iframeRef.current?.destroy();
        await initializeIframe();
      },
    });

  const isSubmitting = isSubmittingInternal || isProcessingPayment;

  const fetchToken = async () => {
    if (!selectedAccount) {
      throw new Error('Selected account is required');
    }

    const cardinalData: Record<string, string> = {
      action: '01',
      payment_method: 'EC',
      pmint: 'I',
      host_url: window.location.origin,
      css_url: getDynamicThemeStylesUrl(domainTheme, 'EC', 'I'),
      card_indicator: 'X',
      'merchant-html': '',
    };

    return getPaymentMethodEntryToken(
      '01',
      'EC',
      selectedAccount.primaryAcct,
      cardinalData,
      impersonatedUserId || '',
      false,
    );
  };

  const {
    accessToken,
    iframeUrl,
    isLoading,
    error,
    iframeReady,
    initializeIframe,
    handleIframeReady,
    handleIframeError,
  } = useIframeInitialization(fetchToken);

  useEffect(() => {
    initializeIframe();
  }, []);

  const handleSaveToFileChange = (checked: boolean) => {
    setSaveToFile(checked);
  };

  const handleNewCheck = async () => {
    if (!iframeReady || !iframeRef.current) {
      showToastMessage('error', f('payment.error.iframe_not_ready'));
      return;
    }

    isClosingAfterSuccessRef.current = false;
    const overlayStartedAt = performance.now();
    flushSync(() => {
      setIsSubmittingInternal(true);
    });
    await waitForOverlayPaint();

    try {
      const submitSuccess = await iframeRef.current.submit();

      if (!submitSuccess) {
        return;
      }

      await processTokenization();
    } catch (err: unknown) {
      showToastMessage(
        'error',
        extractErrorMessage(err, 'Tokenization failed'),
      );
      iframeRef.current?.destroy();
      await initializeIframe();
    } finally {
      if (!isClosingAfterSuccessRef.current) {
        const elapsedMs = performance.now() - overlayStartedAt;
        if (elapsedMs < MIN_SUBMIT_OVERLAY_MS) {
          await wait(MIN_SUBMIT_OVERLAY_MS - elapsedMs);
        }
        setIsSubmittingInternal(false);
      }
    }
  };

  const processTokenization = async () => {
    const request = { action: '02', accessToken };
    const { paymentCard } = await getTokenizeResponse(request, false);

    await processPaymentMethod(
      {
        ...paymentCard,
      },
      {
        saveOnFile: saveToFile,
        defaultCard: false,
        isCard: false,
        showGlobalLoader: false,
        onSuccessBeforeRefresh: true,
      },
    );
  };

  return (
    <Box>
      <EpayModalHeader heading={f('payment_methods.add_new_check')} />
      <EpayModalBody sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Error display */}
        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}

        {/* Loading state */}

        {/* PayMetric Iframe */}
        {!isLoading && iframeUrl && (
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Box
              sx={{ position: 'relative', minHeight: 470 }}
              aria-busy={isSubmitting}
            >
              <PaymetricIframe
                key={accessToken || 'init'}
                ref={iframeRef}
                iframeUrl={iframeUrl}
                onReady={handleIframeReady}
                onError={handleIframeError}
                height={470}
              />
              {isSubmitting && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#FFFFFF',
                    zIndex: 2,
                  }}
                >
                  <CircularProgress
                    size={36}
                    sx={{ color: theme.palette.spinner.main, opacity: 0.75 }}
                  />
                </Box>
              )}
            </Box>
          </Grid>
        )}
        <Grid item container xs={12} alignItems="center" columnGap=".67rem">
          <Grid
            item
            sx={{
              display: 'flex',
              alignItems: 'center',
              '& svg': {
                marginTop: '0 !important',
              },
            }}
          >
            <EpayCheckBox
              checked={saveToFile}
              onClick={handleSaveToFileChange}
            />
          </Grid>
          <Grid item>
            <Typography
              sx={{
                color: '#0D0D12',
                fontSize: '15px',
                fontWeight: 500,
                lineHeight: '1.2rem',
              }}
            >
              {f('payment_methods.save_for_future_use')}
            </Typography>
          </Grid>
        </Grid>
      </EpayModalBody>

      <EpayModalFooter>
        <Button variant="outlined" color="secondary" onClick={onClose}>
          {f('payment_methods.cancel_button')}
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={!iframeReady || isSubmitting}
          sx={{
            textTransform: 'none',
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
          onClick={handleNewCheck}
        >
          {isSubmitting
            ? f('payment.processing')
            : f('payment_methods.add_check_button')}
        </Button>
      </EpayModalFooter>
    </Box>
  );
};

export default AddCheckIframe;
