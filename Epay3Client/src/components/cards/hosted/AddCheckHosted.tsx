import { useState } from 'react';

import { useIntl } from 'react-intl';

import { useHostedPayment } from 'hooks/useHostedPayment';
import { HostedPaymentResult } from 'types/HostedPayment';
import { useEpayToast } from 'providers/EpayToastProvider';
import { useAppDispatch } from 'redux/hooks';
import { usePayerDetails } from 'providers/PayerDetailsProvider';
import { addIsSession, removeIsSession } from 'redux/reducers';
import { usePaymentMethodAction } from 'hooks/usePaymentMethodAction';

import HostedPaymentConfirmation from '../HostedPaymentConfirmation';

interface AddCheckHostedProps {
  onClose: () => void;
}

export const AddCheckHosted = ({ onClose }: AddCheckHostedProps) => {
  const dispatch = useAppDispatch();

  const { effectiveAccount: selectedAccount } = usePayerDetails();

  const intl = useIntl();
  const { showToastMessage } = useEpayToast();
  const f = (id: string) => intl.formatMessage({ id, defaultMessage: id });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saveOnFile, setSaveOnFile] = useState<boolean>(true);

  const { processPaymentMethod } = usePaymentMethodAction({
    onSuccess: () => setTimeout(() => onClose(), 100),
    onError: (msg) => setError(msg),
  });

  const handleComplete = async (result: HostedPaymentResult) => {
    if (result.success && result.paymentCard) {
      await processPaymentMethod(result.paymentCard, {
        saveOnFile,
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

  const closeModal = () => {
    if (isWaiting) {
      cancelHostedPayment();
    }
    onClose();
  };

  const openPaymentPage = async () => {
    if (!saveOnFile) {
      dispatch(addIsSession());
    } else {
      dispatch(removeIsSession());
    }

    await redirectToHostedPage({
      paymentMethod: 'EC',
      isGuest: false,
      accountId: selectedAccount?.primaryAcct,
      onLoadingChange: setIsLoading,
      saveOnFile: saveOnFile,
      defaultCard: false,
    });
  };

  return (
    <HostedPaymentConfirmation
      titleKey="payment_methods.add_new_check"
      error={error}
      isLoading={isLoading}
      isWaiting={isWaiting}
      showSaveOnFileCheckbox={true}
      saveOnFile={saveOnFile}
      onSaveOnFileChange={(checked) => setSaveOnFile(checked)}
      onClose={closeModal}
      onContinue={openPaymentPage}
    />
  );
};

export default AddCheckHosted;
