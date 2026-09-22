import { useState } from 'react';

import { PaymentCardSubmission } from 'types/Payment';
import { useHostedPayment } from 'hooks/useHostedPayment';
import { HostedPaymentResult } from 'types/HostedPayment';
import { useEpayToast } from 'providers/EpayToastProvider';

import HostedPaymentConfirmation from '../HostedPaymentConfirmation';
import { usePaymentMethodAction } from 'hooks/usePaymentMethodAction';
import { useFormat } from 'hooks/useFormat';

interface AddGuestCheckHostedProps {
  onClose: () => void;
  handleCardProccessing: (card: PaymentCardSubmission) => void;
}

export const AddGuestCheckHosted = ({
  onClose,
  handleCardProccessing,
}: AddGuestCheckHostedProps) => {
  const f = useFormat();
  const { showToastMessage } = useEpayToast();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saveOnFile, setSaveOnFile] = useState<boolean>(false);

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
      await processPaymentMethod(result.paymentCard, {
        saveOnFile: false,
        defaultCard: false,
        isCard: false,
      });
    } else {
      const errorMsg = result.error || 'Failed to add check';
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
      paymentMethod: 'EC',
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
      titleKey="payment_methods.add_new_check"
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

export default AddGuestCheckHosted;
