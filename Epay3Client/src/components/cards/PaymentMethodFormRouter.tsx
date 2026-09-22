import { useAppSelector } from 'redux/hooks';
import { selectPaymentIntegrationType } from 'redux/selectors/configSelectors';
import { Guest3DSContext } from 'types/Guest3DS';
import { PaymentCard, PaymentCardSubmission } from 'types/Payment';
import { AddGuestCardIframe } from './iframe/AddGuestCardIframe';
import { AddGuestCheckIframe } from './iframe/AddGuestCheckIframe';
import { AddGuestCardHosted } from './hosted/AddGuestCardHosted';
import { AddGuestCheckHosted } from './hosted/AddGuestCheckHosted';
import { AddCardIframe } from './iframe/AddCardIframe';
import { AddCheckIframe } from './iframe/AddCheckIframe';
import { AddCardHosted } from './hosted/AddCardHosted';
import { AddCheckHosted } from './hosted/AddCheckHosted';
import { AddCardStripe } from './stripe/AddCardStripe';

interface GuestPaymentMethodFormRouterProps {
  paymentType: 'card' | 'check';
  onClose: () => void;
  handleCardProccessing: (card: PaymentCardSubmission) => void;
  guest3DSContext?: Guest3DSContext;
}

interface AuthenticatedPaymentMethodFormRouterProps {
  paymentType: 'card' | 'check';
  onClose: () => void;
  onSuccess?: (card: PaymentCard) => void;
}

export const GuestPaymentMethodFormRouter = ({
  paymentType,
  onClose,
  handleCardProccessing,
  guest3DSContext,
}: GuestPaymentMethodFormRouterProps) => {
  const integrationType = useAppSelector(selectPaymentIntegrationType);

  if (paymentType === 'card') {
    return integrationType === 'hosted' ? (
      <AddGuestCardHosted
        onClose={onClose}
        handleCardProccessing={handleCardProccessing}
        guest3DSContext={guest3DSContext}
      />
    ) : (
      <AddGuestCardIframe
        onClose={onClose}
        handleCardProccessing={handleCardProccessing}
        guest3DSContext={guest3DSContext}
      />
    );
  }

  return integrationType === 'hosted' ? (
    <AddGuestCheckHosted
      onClose={onClose}
      handleCardProccessing={handleCardProccessing}
    />
  ) : (
    <AddGuestCheckIframe
      onClose={onClose}
      handleCardProccessing={handleCardProccessing}
    />
  );
};

export const AuthenticatedPaymentMethodFormRouter = ({
  paymentType,
  onClose,
  onSuccess,
}: AuthenticatedPaymentMethodFormRouterProps) => {
  const integrationType = useAppSelector(selectPaymentIntegrationType);

  if (paymentType === 'card') {
    return <AddCardStripe onClose={onClose} onSuccess={onSuccess} />;
  }

  return integrationType === 'hosted' ? (
    <AddCheckHosted onClose={onClose} />
  ) : (
    <AddCheckIframe onClose={onClose} />
  );
};
