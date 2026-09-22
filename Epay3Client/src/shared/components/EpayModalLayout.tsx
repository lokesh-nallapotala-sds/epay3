import {
  Box,
  BoxProps,
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
  DialogTitle,
  SxProps,
  Theme,
  Typography,
  TypographyProps,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useId } from 'react';

const getModalMixins = (theme: Theme) => {
  const modalMixins = (
    theme.mixins as Theme['mixins'] & {
      modal?: {
        borderRadius?: number | string;
        dividerColor?: string;
        bodyPadding?: number | string;
        formBodyPadding?: number | string;
        headerPadding?: number | string;
        actionGap?: number | string;
        footerPadding?: number | string;
        confirmMinHeight?: number | string;
        confirmBodyTopMargin?: number | string;
      };
    }
  ).modal;

  return {
    borderRadius: modalMixins?.borderRadius ?? theme.shape.borderRadius ?? 4,
    dividerColor:
      modalMixins?.dividerColor ?? theme.mixins.border?.color ?? '#DFE1E6',
    bodyPadding: modalMixins?.bodyPadding ?? 3,
    formBodyPadding: modalMixins?.formBodyPadding ?? 3,
    headerPadding: modalMixins?.headerPadding ?? 3,
    actionGap: modalMixins?.actionGap ?? 1,
    footerPadding: modalMixins?.footerPadding ?? 3,
    confirmMinHeight: modalMixins?.confirmMinHeight ?? 0,
    confirmBodyTopMargin: modalMixins?.confirmBodyTopMargin ?? 0,
  };
};

export const epayModalSurfaceSx = (
  width: string = '90%',
  maxWidth: string = '550px',
): SxProps<Theme> => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width,
  maxWidth,
  maxHeight: '90vh',
  overflowY: 'auto',
  bgcolor: 'background.paper',
  border: 'none',
  outline: 'none',
  boxShadow: 24,
  borderRadius: (theme) => getModalMixins(theme).borderRadius,
  '&:focus': {
    outline: 'none',
    border: 'none',
  },
});

const modalDividerSx = {
  borderColor: (theme: Theme) => getModalMixins(theme).dividerColor,
};

export const epayModalTableContainerSx: SxProps<Theme> = {
  border: (theme) => `1px solid ${theme.mixins.border.color}`,
  borderRadius: '8px',
  overflow: 'hidden',
};

export const epayModalTableSx: SxProps<Theme> = {
  width: '100%',
  tableLayout: 'fixed',
  '& .MuiTableCell-root': {
    padding: '8px',
    verticalAlign: 'middle',
    color: 'text.primary',
  },
};

export const epayModalTableHeaderCellSx: SxProps<Theme> = {
  backgroundColor: '#F8F9FB',
  color: 'text.primary',
  fontSize: '14px',
  fontWeight: 500,
  lineHeight: '24px',
  whiteSpace: 'nowrap',
};

export const epayModalTableBodyCellSx: SxProps<Theme> = {
  fontSize: '14px',
  fontWeight: 500,
  lineHeight: '21px',
};

export type EpayModalBodyVariant = 'default' | 'confirm' | 'form' | 'media';

export const getEpayModalBodyPadding = (
  theme: Theme,
  variant: EpayModalBodyVariant = 'default',
) => {
  const modalMixins = getModalMixins(theme);

  if (variant === 'form') {
    return modalMixins.formBodyPadding;
  }

  return modalMixins.bodyPadding;
};

type ModalSectionProps = BoxProps & {
  dividerTop?: boolean;
  dividerBottom?: boolean;
  bodyVariant?: EpayModalBodyVariant;
};

const EpayModalSection = ({
  children,
  dividerTop = false,
  dividerBottom = false,
  bodyVariant = 'default',
  sx,
  ...props
}: ModalSectionProps) => (
  <Box
    sx={[
      {
        p: (theme) => getEpayModalBodyPadding(theme, bodyVariant),
        boxSizing: 'border-box',
      },
      dividerTop && { borderTop: '1px solid', ...modalDividerSx },
      dividerBottom && { borderBottom: '1px solid', ...modalDividerSx },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
    {...props}
  >
    {children}
  </Box>
);

interface EpayModalHeaderProps extends Omit<BoxProps, 'title'> {
  heading?: React.ReactNode;
  titleProps?: TypographyProps;
}

export const EpayModalHeader = ({
  heading,
  titleProps,
  children,
  sx,
  ...props
}: EpayModalHeaderProps) => (
  <Box
    sx={[
      {
        p: (theme) => getModalMixins(theme).headerPadding,
        borderBottom: '1px solid',
        ...modalDividerSx,
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
    {...props}
  >
    {heading !== undefined ? (
      <Typography variant="h3" align="left" {...titleProps}>
        {heading}
      </Typography>
    ) : (
      children
    )}
  </Box>
);

export const EpayModalBody = ({
  children,
  sx,
  dividerTop = false,
  dividerBottom = false,
  bodyVariant = 'default',
  ...props
}: ModalSectionProps) => (
  <EpayModalSection
    dividerTop={dividerTop}
    dividerBottom={dividerBottom}
    bodyVariant={bodyVariant}
    sx={sx}
    {...props}
  >
    {children}
  </EpayModalSection>
);

export const EpayModalFooter = ({ children, sx, ...props }: BoxProps) => (
  <Box
    sx={[
      {
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: (theme) => getModalMixins(theme).actionGap,
        p: (theme) => getModalMixins(theme).footerPadding,
        borderTop: '1px solid',
        ...modalDividerSx,
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
    {...props}
  >
    {children}
  </Box>
);

export interface EpayModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode[];
  titleAsH1?: boolean;
  maxWidth?: DialogProps['maxWidth'];
  paperSx?: SxProps<Theme>;
  bodySx?: SxProps<Theme>;
  actionsSx?: SxProps<Theme>;
  bodyVariant?: EpayModalBodyVariant;
  fullScreenOnMobile?: boolean;
  disableBackdropClose?: boolean;
  hideHeader?: boolean;
  hideFooter?: boolean;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  backdropSx?: SxProps<Theme>;
  transitionDuration?: DialogProps['transitionDuration'];
  scrollMode?: DialogProps['scroll'];
}

export const EpayModal = ({
  open,
  onClose,
  title,
  children,
  actions = [],
  titleAsH1 = false,
  maxWidth = 'md',
  paperSx,
  bodySx,
  actionsSx,
  bodyVariant = 'default',
  fullScreenOnMobile = true,
  disableBackdropClose = false,
  hideHeader = false,
  hideFooter = false,
  ariaLabelledBy,
  ariaDescribedBy,
  backdropSx,
  transitionDuration,
  scrollMode,
}: EpayModalProps) => {
  const theme = useTheme();
  const modalMixins = getModalMixins(theme);
  const generatedTitleId = useId();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const fullScreen = fullScreenOnMobile && isSmallScreen;
  const dialogScroll = scrollMode ?? (fullScreen ? 'paper' : 'body');
  const titleId = ariaLabelledBy ?? generatedTitleId;
  const bodyPadding = getEpayModalBodyPadding(theme, bodyVariant);
  const isFormBody = bodyVariant === 'form';
  const isMediaBody = bodyVariant === 'media';
  const isConfirmBody = bodyVariant === 'confirm' || bodyVariant === 'default';

  const handleClose: DialogProps['onClose'] = (_event, reason) => {
    if (disableBackdropClose && reason === 'backdropClick') {
      return;
    }

    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      scroll={dialogScroll}
      fullScreen={fullScreen}
      maxWidth={maxWidth}
      fullWidth
      aria-labelledby={hideHeader ? undefined : titleId}
      aria-describedby={ariaDescribedBy}
      transitionDuration={transitionDuration}
      BackdropProps={{
        sx: backdropSx,
      }}
      PaperProps={{
        sx: [
          { margin: { xs: '16px', sm: '32px' } },
          ...(Array.isArray(paperSx) ? paperSx : [paperSx]),
        ],
      }}
    >
      {!hideHeader && (
        <DialogTitle id={titleId}>
          <Typography
            component={titleAsH1 ? 'h1' : 'h2'}
            variant={titleAsH1 ? 'h1' : 'h3'}
            align="left"
          >
            {title}
          </Typography>
        </DialogTitle>
      )}
      <DialogContent
        sx={[
          {
            p: 0,
            overflowY: isMediaBody ? 'hidden' : 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            '&.MuiDialogContent-root': {
              padding: 0,
            },
            '&.MuiDialogContent-root:first-of-type': {
              padding: 0,
            },
          },
          ...(Array.isArray(bodySx) ? bodySx : [bodySx]),
        ]}
      >
        <Box
          className="EpayModal-bodyFrame"
          sx={[
            {
              boxSizing: 'border-box',
              color: theme.palette.text.primary,
            },
            isFormBody && {
              p: modalMixins.formBodyPadding,
            },
            isMediaBody && {
              display: 'flex',
              flex: 1,
              minHeight: 0,
              height: '100%',
            },
            isConfirmBody && {
              minHeight: modalMixins.confirmMinHeight,
              mt: modalMixins.confirmBodyTopMargin,
              px: bodyPadding,
              pb: bodyPadding,
              textAlign: 'left',
            },
          ]}
        >
          {children}
        </Box>
      </DialogContent>
      {!hideFooter && actions.length > 0 && (
        <DialogActions
          sx={[...(Array.isArray(actionsSx) ? actionsSx : [actionsSx])]}
        >
          {actions.map((action, index) => (
            <Box key={index}>{action}</Box>
          ))}
        </DialogActions>
      )}
    </Dialog>
  );
};
