import { useAppSelector } from 'redux/hooks';
import { CreditCard } from 'types/CreditCard';
import { selectPaymentIntegrationType } from 'redux/selectors/configSelectors';
import { EpayModal } from 'shared/components/EpayModalLayout';

import { EditCard } from './EditCard';
import { EditCheck } from './EditCheck';
import { AddCheckIframe } from './iframe/AddCheckIframe';
import { AddCheckHosted } from './hosted/AddCheckHosted';
import { AddCardStripe } from './stripe/AddCardStripe';
import { PaymentCard } from 'types/Payment';

interface CardProps {
  open: boolean;
  paymentType: string;
  handleClose: () => void;
  isEditing?: boolean;
  card?: CreditCard;
  onSuccess?: (card: PaymentCard) => void;
}

export const PaymentMethodModal = ({
  open,
  paymentType,
  handleClose,
  isEditing,
  card,
  onSuccess,
}: CardProps) => {
  const integrationType = useAppSelector(selectPaymentIntegrationType);
  const isHosted = integrationType === 'hosted';
  const isIframeAdd = !isHosted && !isEditing;

  return (
    <EpayModal
      open={open}
      onClose={handleClose}
      hideHeader
      hideFooter
      disableBackdropClose
      maxWidth={false}
      fullScreenOnMobile={false}
      transitionDuration={isIframeAdd ? 0 : undefined}
      backdropSx={isIframeAdd ? { backgroundColor: 'transparent' } : undefined}
      paperSx={{
        width: '90%',
        maxWidth: '520px',
      }}
      bodySx={{
        p: 0,
        '&.MuiDialogContent-root': {
          p: 0,
        },
        '&.MuiDialogContent-root:first-of-type': {
          p: 0,
        },
        '& > .EpayModal-bodyFrame': {
          p: 0,
          m: 0,
          minHeight: 'auto',
        },
      }}
    >
      {paymentType === 'card' ? (
        isEditing && card ? (
          <EditCard card={card} onClose={handleClose} />
        ) : (
          <AddCardStripe onClose={handleClose} onSuccess={onSuccess} />
        )
      ) : isEditing && card ? (
        <EditCheck card={card} onClose={handleClose} />
      ) : isHosted ? (
        <AddCheckHosted onClose={handleClose} />
      ) : (
        <AddCheckIframe onClose={handleClose} />
      )}
    </EpayModal>
  );
};
