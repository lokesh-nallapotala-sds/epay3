import EpayConfirmDialog from 'shared/components/EpayConfirmDialog';
import { useFormat } from 'hooks/useFormat';

export default function DeleteConfirmModal({ open, onClose, onOk, message }) {
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
      message={message}
      onConfirm={handleOk}
      cancelLabel={f('app.common.cancel')}
      confirmLabel={f('app.common.ok')}
    />
  );
}
