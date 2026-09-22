import { useEffect, useRef, useState } from 'react';

import { useIntl } from 'react-intl';

import { PaymentCardSubmission } from 'types/Payment';
import { Guest3DSContext } from 'types/Guest3DS';
import { useAppSelector } from 'redux/hooks';
import { useTheme } from '@mui/material/styles';
import { domainThemeSelector } from 'redux/reducers';
import { Button, Grid, Typography } from '@mui/material';
import { useEpayToast } from 'providers/EpayToastProvider';
import { EpayPaymentService } from 'services/EpayPaymentService';
import { useIframeInitialization } from 'hooks/useIframeInitialization';
import {
  extractErrorMessage,
  getDynamicThemeStylesUrl,
  getGuestCardAdd3dsRedirectUri,
  normalizeHostedPaymentCard,
} from 'utilities/utilities';

import {
  PaymetricIframe,
  PaymetricIframeRef,
} from '../../payment/PaymetricIframe';
import { usePaymentMethodAction } from 'hooks/usePaymentMethodAction';
import {
  EpayModalBody,
  EpayModalFooter,
  EpayModalHeader,
} from 'shared/components/EpayModalLayout';

import { useGuest3DSValidation } from 'hooks/useGuest3DSValidation';

interface AddGuestCardIframeProps {
  onClose: () => void;
  handleCardProccessing: (card: PaymentCardSubmission) => void;
  guest3DSContext?: Guest3DSContext;
}

export const AddGuestCardIframe = ({
  onClose,
  handleCardProccessing,
  guest3DSContext,
}: AddGuestCardIframeProps) => {
  const intl = useIntl();
  const theme = useTheme();
  const f = (id: string) => intl.formatMessage({ id, defaultMessage: id });
  const { showToastMessage } = useEpayToast();

  const getGuestPaymentMethodEntryToken =
    EpayPaymentService.useGetGuestPaymentMethodEntryToken();
  const getGuestTokenizeResponse =
    EpayPaymentService.useGetGuestTokenizeResponse();
  const validateGuest3DS = useGuest3DSValidation();
  const domainTheme = useAppSelector(domainThemeSelector);

  const iframeRef = useRef<PaymetricIframeRef>(null);
  const [isSubmittingInternal, setIsSubmittingInternal] =
    useState<boolean>(false);
  const { processPaymentMethod, isSubmitting: isProcessingPayment } =
    usePaymentMethodAction({
      onSuccess: (card) => {
        handleCardProccessing(card);
        onClose();
      },
      onError: async () => {
        iframeRef.current?.destroy();
        await initializeIframe();
      },
    });

  const isSubmitting = isSubmittingInternal || isProcessingPayment;

  const fetchToken = async () => {
    const cardinalData: Record<string, string> = {
      action: '01',
      payment_method: 'CC',
      pmint: 'I',
      host_url: window.location.origin,
      css_url: getDynamicThemeStylesUrl(domainTheme, 'CC', 'I'),
      card_indicator: 'X',
      'merchant-html': '',
    };

    return getGuestPaymentMethodEntryToken('01', 'CC', cardinalData);
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

  const closeModal = () => {
    onClose();
  };

  const saveCard = async () => {
    if (isSubmittingInternal) return;

    if (!iframeReady || !iframeRef.current) {
      showToastMessage('error', f('payment.error.iframe_not_ready'));
      return;
    }

    setIsSubmittingInternal(true);

    try {
      const submitSuccess = await iframeRef.current.submit();

      if (!submitSuccess) {
        setIsSubmittingInternal(false);
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
      setIsSubmittingInternal(false);
    }
  };

  const processTokenization = async () => {
    const request = { action: '02', accessToken };
    const { paymentCard, vRef, v_ref } =
      await getGuestTokenizeResponse(request);

    const normalizedFields = normalizeHostedPaymentCard(
      paymentCard as unknown as Record<string, unknown>,
    );

    const normalizedPaymentCard: PaymentCardSubmission = {
      ...paymentCard,
      ...normalizedFields,
      paymentCardType: normalizedFields.paymentCardType,
      sapCardType: normalizedFields.sapCardType,
      vRef: vRef || v_ref,
    };

    let threeDSAccessToken: string | undefined;

    if (guest3DSContext) {
      const threeDSResult = await validateGuest3DS({
        paymentCard: normalizedPaymentCard,
        context: guest3DSContext,
        redirectUri: getGuestCardAdd3dsRedirectUri(),
      });

      if (threeDSResult?.cardinalData) {
        normalizedPaymentCard.cardinalData = threeDSResult.cardinalData;
      }
      if (threeDSResult?.vRef) {
        normalizedPaymentCard.vRef = threeDSResult.vRef;
      }
      threeDSAccessToken = threeDSResult?.accessToken;
    }

    await processPaymentMethod(normalizedPaymentCard, {
      saveOnFile: false,
      defaultCard: false,
      isCard: true,
      skip3DSValidation: true,
      threeDSAccessToken: threeDSAccessToken,
    });
  };

  return (
    <Grid container>
      <Grid item xs={12}>
        <EpayModalHeader heading={f('payment_methods.add_new_card')} />
      </Grid>
      <Grid item xs={12}>
        <EpayModalBody
          sx={{ display: 'flex', flexDirection: 'column', minHeight: 500 }}
        >
          {error && (
            <Typography color="error" variant="body2" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          {!isLoading && iframeUrl && (
            <PaymetricIframe
              key={accessToken || 'init'}
              ref={iframeRef}
              iframeUrl={iframeUrl}
              onReady={handleIframeReady}
              onError={handleIframeError}
              height={450}
            />
          )}
        </EpayModalBody>
      </Grid>

      <Grid item xs={12}>
        <EpayModalFooter>
          <Button variant="outlined" color="secondary" onClick={closeModal}>
            {f('payment_methods.cancel_button')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!iframeReady || isSubmitting}
            onClick={saveCard}
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
            {isSubmitting
              ? f('payment.processing')
              : f('payment_methods.add_card_button')}
          </Button>
        </EpayModalFooter>
      </Grid>
    </Grid>
  );
};

export default AddGuestCardIframe;
