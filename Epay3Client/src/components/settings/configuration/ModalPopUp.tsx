import { AddURL } from './AddURL';
import Waiter from '../../waiter/Waiter';
import { AddTemplate } from './AddTemplate';
import { EpayModal } from 'shared/components/EpayModalLayout';

interface URLProps {
  handleClose: () => void;
  open: boolean;
  handleAddURL: (data: string) => void;
  handleAddTemplate: (data: string, copyValues: boolean) => void;
  mode: 'url' | 'template';
}

export const ModalPopup = ({
  handleClose,
  open,
  handleAddURL,
  handleAddTemplate,
  mode,
}: URLProps) => {
  return (
    <EpayModal
      open={open}
      onClose={handleClose}
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

      {mode === 'url' ? (
        <AddURL onClose={handleClose} handleAddURLData={handleAddURL} />
      ) : (
        <AddTemplate
          onClose={handleClose}
          handleAddTemplateData={handleAddTemplate}
        />
      )}
    </EpayModal>
  );
};
