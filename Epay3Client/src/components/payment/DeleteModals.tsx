import EpayConfirmDialog from 'shared/components/EpayConfirmDialog';
import { useFormat } from 'hooks/useFormat';

interface DeleteModalProps {
  open: boolean;
  onClose: () => void;
  onOk: () => void;
}

export const DeleteModal = ({ open, onClose, onOk }: DeleteModalProps) => {
  const f = useFormat();

  const handleOk = () => {
    onOk();
    onClose();
  };

  return (
    <EpayConfirmDialog
      open={open}
      onClose={onClose}
      title={f('app.common.confirm_delete')}
      message={f('payment_methods.confirm_delete_card_message')}
      onConfirm={handleOk}
      cancelLabel={f('app.common.cancel')}
      confirmLabel={f('app.common.ok')}
    />
  );
};

interface DeleteErrorModalProps {
  open: boolean;
  onClose: () => void;
}

export const DeleteErrorModal = ({ open, onClose }: DeleteErrorModalProps) => {
  const f = useFormat();

  return (
    <EpayConfirmDialog
      open={open}
      onClose={onClose}
      title={f('payment_methods.delete.warning.title')}
      message={f('payment_methods.delete.error.assigned')}
      confirmLabel={f('app.common.ok')}
    />
  );
};
