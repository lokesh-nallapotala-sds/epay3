import { useId } from 'react';

import { Box, Button, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { EpayModal } from './EpayModalLayout';

interface EpayConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  message: React.ReactNode;
  onConfirm?: () => void;
  confirmLabel: React.ReactNode;
  cancelLabel?: React.ReactNode;
  /** Overrides the theme's confirm-dialog max width (e.g. for longer messages). */
  maxWidth?: string;
}

export default function EpayConfirmDialog({
  open,
  onClose,
  title,
  message,
  onConfirm,
  confirmLabel,
  cancelLabel,
  maxWidth,
}: EpayConfirmDialogProps) {
  const theme = useTheme();
  const titleId = useId();
  const descriptionId = useId();
  const isPlainTextMessage =
    typeof message === 'string' || typeof message === 'number';
  const messageLineCount =
    typeof message === 'string' ? message.split(/\r?\n/).length : 1;
  const bodyVariant =
    isPlainTextMessage && messageLineCount <= 4 ? 'confirm' : 'default';
  const actions = [
    ...(cancelLabel !== undefined
      ? [
          <Button onClick={onClose} variant="outlined" color="secondary">
            {cancelLabel}
          </Button>,
        ]
      : []),
    <Button
      onClick={onConfirm ?? onClose}
      variant="contained"
      color="primary"
      sx={{
        border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
        '&:hover': {
          border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
        },
      }}
    >
      {confirmLabel}
    </Button>,
  ];

  return (
    <EpayModal
      open={open}
      onClose={onClose}
      title={title}
      ariaLabelledBy={titleId}
      ariaDescribedBy={descriptionId}
      bodyVariant={bodyVariant}
      maxWidth={false}
      fullScreenOnMobile={false}
      scrollMode="paper"
      paperSx={{
        width: { xs: 'calc(100% - 32px)', sm: '100%' },
        maxWidth: maxWidth ?? theme.mixins.modal.confirmMaxWidth,
      }}
      actions={actions}
    >
      {isPlainTextMessage ? (
        <Typography id={descriptionId} sx={{ whiteSpace: 'pre-line' }}>
          {message}
        </Typography>
      ) : (
        <Box id={descriptionId} sx={{ width: '100%' }}>
          {message}
        </Box>
      )}
    </EpayModal>
  );
}
