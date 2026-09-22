import { EpayModal } from 'shared/components/EpayModalLayout';
import Waiter from 'components/waiter/Waiter';
import { AddApplicationLink } from './AddApplicationLink';

interface AddApplicationLinkModalProps {
  open: boolean;
  onClose: () => void;
  onAddLink: (label: string, url: string) => void;
}

export const AddApplicationLinkModal = ({
  open,
  onClose,
  onAddLink,
}: AddApplicationLinkModalProps) => {
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
      <AddApplicationLink onClose={onClose} onAddLink={onAddLink} />
    </EpayModal>
  );
};
