import EpayDialog from './EpayDialog';

interface EpayDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode[];
}

const EpayScheduleDialog = ({
  open,
  onClose = () => {},
  title = 'Default Title',
  children = <p>Default body</p>,
  actions = [],
}: EpayDialogProps) => {
  return (
    <EpayDialog
      open={open}
      onClose={onClose}
      title={title}
      actions={actions}
      bodyVariant="form"
      maxWidth={false}
      paperSx={{
        width: '720px',
        maxWidth: '90%',
      }}
    >
      {children}
    </EpayDialog>
  );
};

export default EpayScheduleDialog;
