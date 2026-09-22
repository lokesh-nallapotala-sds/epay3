import { useState } from 'react';

import { PaymentCardSubmission } from 'types/Payment';
import { Guest3DSContext } from 'types/Guest3DS';
import { normalizeHostedPaymentCard } from 'utilities/utilities';
import { useHostedPayment } from 'hooks/useHostedPayment';
import { HostedPaymentResult } from 'types/HostedPayment';
import { useEpayToast } from 'providers/EpayToastProvider';

import HostedPaymentConfirmation from '../HostedPaymentConfirmation';
import { usePaymentMethodAction } from 'hooks/usePaymentMethodAction';
import { useGuest3DSValidation } from 'hooks/useGuest3DSValidation';
import { useFormat } from 'hooks/useFormat';

interface AddGuestCardHostedProps {
  onClose: () => void;
  handleCardProccessing: (card: PaymentCardSubmission) => void;
  guest3DSContext?: Guest3DSContext;
}

export const AddGuestCardHosted = ({
  onClose,
  handleCardProccessing,
  guest3DSContext,
}: AddGuestCardHostedProps) => {
  const f = useFormat();
  const { showToastMessage } = useEpayToast();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saveOnFile, setSaveOnFile] = useState<boolean>(false);
  const validateGuest3DS = useGuest3DSValidation();

  const { processPaymentMethod } = usePaymentMethodAction({
    onSuccess: (card) => {
      handleCardProccessing(card);
      onClose();
    },
    onError: (errorMsg) => {
      setError(errorMsg);
      showToastMessage('error', errorMsg);
    },
  });

  const handleComplete = async (result: HostedPaymentResult) => {
    if (result.success && result.paymentCard) {
      const normalizedPaymentCard: PaymentCardSubmission = {
        ...result.paymentCard,
        ...normalizeHostedPaymentCard(
          result.paymentCard as unknown as Record<string, unknown>,
        ),
        isSession: true,
      };

      let threeDSAccessToken: string | undefined;

      if (guest3DSContext) {
        const threeDSResult = await validateGuest3DS({
          paymentCard: normalizedPaymentCard,
          context: guest3DSContext,
          redirectUri: window.location.href,
        });

        if (threeDSResult?.cardinalData) {
          normalizedPaymentCard.cardinalData = threeDSResult.cardinalData;
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
    } else {
      const errorMsg = result.error || 'Failed to add card';
      setError(errorMsg);
      showToastMessage('error', errorMsg);
    }
  };

  const handleError = (errorMsg: string) => {
    setError(errorMsg);
    showToastMessage('error', errorMsg);
  };

  const handleCancel = () => {
    showToastMessage('info', f('payment.hosted.cancelled'));
  };

  const { isWaiting, redirectToHostedPage, cancelHostedPayment } =
    useHostedPayment({
      onComplete: handleComplete,
      onError: handleError,
      onCancel: handleCancel,
    });

  const openPaymentPage = async () => {
    await redirectToHostedPage({
      paymentMethod: 'CC',
      isGuest: true,
      onLoadingChange: setIsLoading,
    });
  };

  const closeModal = () => {
    if (isWaiting) {
      cancelHostedPayment();
    }
    onClose();
  };

  return (
    <HostedPaymentConfirmation
      titleKey="payment_methods.add_new_card"
      error={error}
      isLoading={isLoading}
      isWaiting={isWaiting}
      showSaveOnFileCheckbox={false}
      saveOnFile={saveOnFile}
      onSaveOnFileChange={(checked) => setSaveOnFile(checked)}
      onClose={closeModal}
      onContinue={openPaymentPage}
    />
  );
};

export default AddGuestCardHosted;
