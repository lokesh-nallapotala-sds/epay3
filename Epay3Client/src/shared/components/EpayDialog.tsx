import { DialogProps, Button } from '@mui/material';
import { SxProps, Theme } from '@mui/material/styles';

import { EpayModal, EpayModalBodyVariant } from './EpayModalLayout';

interface EpayDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode[];
  titleAsH1?: boolean;
  maxWidth?: DialogProps['maxWidth'];
  paperSx?: SxProps<Theme>;
  bodySx?: SxProps<Theme>;
  actionsSx?: SxProps<Theme>;
  bodyVariant?: EpayModalBodyVariant;
  fullScreenOnMobile?: boolean;
  scrollMode?: DialogProps['scroll'];
}

const EpayDialog = ({
  open,
  onClose = () => {},
  title = 'Default Title',
  children = <p>Default body</p>,
  actions = [<Button onClick={onClose}>Close</Button>],
  titleAsH1 = false,
  maxWidth = 'md',
  paperSx,
  bodySx,
  actionsSx,
  bodyVariant = 'default',
  fullScreenOnMobile = true,
  scrollMode,
}: EpayDialogProps) => {
  return (
    <EpayModal
      open={open}
      onClose={onClose}
      title={title}
      titleAsH1={titleAsH1}
      maxWidth={maxWidth}
      paperSx={paperSx}
      actionsSx={actionsSx}
      bodyVariant={bodyVariant}
      fullScreenOnMobile={fullScreenOnMobile}
      scrollMode={scrollMode}
      actions={actions}
      bodySx={[
        titleAsH1
          ? {
              height: {
                xs: '100%',
                sm: '520px',
              },
            }
          : undefined,
        ...(Array.isArray(bodySx) ? bodySx : [bodySx]),
      ]}
    >
      {children}
    </EpayModal>
  );
};

export default EpayDialog;
