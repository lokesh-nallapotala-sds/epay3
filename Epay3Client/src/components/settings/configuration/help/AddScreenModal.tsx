import { EpayModal } from 'shared/components/EpayModalLayout';
import Waiter from 'components/waiter/Waiter';
import { AddScreen } from './AddScreen';

interface AddScreenModalProps {
  open: boolean;
  onClose: () => void;
  onAddScreen: (name: string, path: string) => void;
}

export const AddScreenModal = ({
  open,
  onClose,
  onAddScreen,
}: AddScreenModalProps) => {
  return (
    <EpayModal
      open={open}
      onClose={onClose}
      hideHeader
      hideFooter
      disableBackdropClose
      maxWidth={false}
      fullScreenOnMobile={false}
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
      <Waiter />
      <AddScreen onClose={onClose} handleAddScreenData={onAddScreen} />
    </EpayModal>
  );
};
