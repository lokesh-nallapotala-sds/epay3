import { type SVGProps } from 'react';

import { Box } from '@mui/system';
import PaymentIcon from 'shared/components/PaymentIcon';
import { styled, Theme } from '@mui/material/styles';
import { PaymentCard } from 'types/Payment';
import EpayCheckBox from 'shared/components/EpayCheckBox';
import {
  Chip,
  Grid,
  Menu,
  MenuItem,
  Switch,
  Tooltip,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

import { mapPaymentIcon } from 'utilities/utilities';
import { useCardDetails } from 'hooks/useCardDetails';
import { PaymentMethodModal } from '../cards/PaymentMethodModal';
import { DeleteErrorModal, DeleteModal } from './DeleteModals';
import SchedulePaymentWarningDialog from '../invoices/SchedulePaymentWarningDialog';

export type CreditCardListVariant = 'compact' | 'settingsGrid';

export const CardDetailsBox = styled(Box)(({ theme }) => ({
  backgroundColor: `${theme.palette.background.paper}`,
  borderRadius: `${theme.shape.borderRadius}px`,
  border: '1px solid',
  borderColor: ` ${theme.mixins.border.color}`,
  fontSize: '14px',
  fontWeight: '600',
  lineHeight: '21px',
  letterSpacing: '0.02em',
  textAlign: 'left',
}));

const MdiCheckbook = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="1 5 22 14"
    {...props}
  >
    <path
      fill="currentColor"
      d="M5 14h14v1H5zm16 3V8H3v9zM1 5h22v14H1zm4 5h7v2H5z"
    ></path>
  </svg>
);

const CheckbookIcon = styled(MdiCheckbook)(() => ({
  width: 30,
  height: 20,
}));

export interface CardDetailsProps {
  card: PaymentCard;
  isGuestPayment: boolean;
  isAutoPayFlagEnabled?: boolean;
  isAutoPayEnrolled?: boolean;
  hideDefault?: boolean;
  variant?: CreditCardListVariant;
}

export const CardDetails = ({
  card,
  isGuestPayment = false,
  isAutoPayFlagEnabled = false,
  isAutoPayEnrolled = false,
  hideDefault = true,
  variant = 'compact',
}: CardDetailsProps) => {
  const theme = useTheme();

  const {
    selectedCard,
    isEditing,
    open,
    paymentType,
    modalOpen,
    openScheduleWarning,
    scheduledInvoices,
    deleteAndProceed,
    actionsAnchor,
    deleteErrorModalOpen,
    setActionsAnchor,
    setDeleteErrorModalOpen,
    handleClose,
    closeActionsMenu,
    handleDeleteClose,
    handleScheduleWarningClose,
    deleteCreditCard,
    editCreditCard,
    handleOk,
    onAutoPayChange,
    onDefaultChange,
    isExpired,
    isDefault,
    isAutoPaySelected,
    shouldHideAutoPayCheckbox,
    formatExpiry,
    formatECheckAccountType,
    f,
    intl,
  } = useCardDetails(card, isAutoPayEnrolled);

  const isSmallScreen = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down('lg'),
  );
  const getIconImage = () => {
    if (card.paymentCardType === 'EC') {
      return (
        <Box sx={{ height: '20px', display: 'flex', alignItems: 'center' }}>
          <CheckbookIcon />
        </Box>
      );
    } else {
      return <PaymentIcon icon={mapPaymentIcon(card.paymentCardType)} />;
    }
  };

  const displayDigits = () => {
    const digits = card?.cardLast4Digit ?? '';
    return (
      <>
        <Typography
          sx={{
            alignItems: 'center',
            fontSize: isSmallScreen ? '12px' : '14px',
          }}
        >
          {card.paymentCardType?.toLowerCase() === 'amex' ? '**** ' : '**** '}{' '}
          {digits} {card.isSession ? '(session)' : ''}
        </Typography>
      </>
    );
  };

  const renderSettingSwitch = (
    label: string,
    checked: boolean,
    onChange: () => void,
  ) => (
    <Box
      display="grid"
      gridTemplateColumns="minmax(0, 1fr) auto"
      alignItems="center"
      gap={0.5}
      sx={{ height: '20px', width: '100%', minWidth: 0 }}
    >
      <Typography
        variant="body2"
        sx={{
          color: theme.palette.text.primary,
          fontSize: '12px',
          fontWeight: 700,
          lineHeight: '14px',
          whiteSpace: 'normal',
          textAlign: 'right',
          overflowWrap: 'anywhere',
        }}
      >
        {label}
      </Typography>
      <Switch
        color="primary"
        checked={checked}
        onChange={onChange}
        size="small"
        sx={{ mr: '-7px', flexShrink: 0, justifySelf: 'end' }}
      />
    </Box>
  );

  const renderActionsMenu = () => (
    <>
      <IconButton
        size="small"
        aria-label={intl.formatMessage({
          id: 'app.common.actions',
          defaultMessage: 'Actions',
        })}
        aria-controls={actionsAnchor ? 'payment-method-actions' : undefined}
        aria-haspopup="true"
        aria-expanded={actionsAnchor ? 'true' : undefined}
        onClick={(event) => setActionsAnchor(event.currentTarget)}
        sx={{
          color: theme.palette.text.main,
          padding: 0,
          marginRight: isSmallScreen ? '4px' : '-4x',
          width: 24,
          height: 20,
          '&:hover': {
            backgroundColor: 'transparent',
            color: theme.palette.primary.main,
          },
        }}
      >
        <MoreHorizIcon fontSize="small" />
      </IconButton>
      <Menu
        id="payment-method-actions"
        anchorEl={actionsAnchor}
        open={Boolean(actionsAnchor)}
        onClose={closeActionsMenu}
      >
        {!card.isSession && (
          <MenuItem onClick={editCreditCard}>{f('app.common.edit')}</MenuItem>
        )}
        <MenuItem onClick={deleteCreditCard}>
          {intl.formatMessage({
            id: 'app.common.delete',
            defaultMessage: 'Delete',
          })}
        </MenuItem>
      </Menu>
    </>
  );

  const modals = (
    <>
      <PaymentMethodModal
        open={open}
        isEditing={isEditing}
        card={selectedCard}
        paymentType={paymentType}
        handleClose={handleClose}
      />
      <DeleteModal
        open={modalOpen}
        onClose={handleDeleteClose}
        onOk={handleOk}
      />
      <DeleteErrorModal
        open={deleteErrorModalOpen}
        onClose={() => setDeleteErrorModalOpen(false)}
      />
      <SchedulePaymentWarningDialog
        open={openScheduleWarning}
        onClose={handleScheduleWarningClose}
        scheduledInvoices={scheduledInvoices}
        onDeleteAndProceed={deleteAndProceed}
        message1={f('payment_methods.delete.scheduled.warning.message1')}
        message2={f('payment_methods.delete.scheduled.warning.message2')}
        message3={f('payment_methods.delete.scheduled.warning.message3')}
      />
    </>
  );

  if (variant === 'settingsGrid') {
    const showSettingsColumn = !isGuestPayment && !card.isSession;

    return (
      <CardDetailsBox
        sx={{
          minHeight: 75,
          height: '100%',
          padding: '10px 10px 6px',
          opacity: isExpired ? 0.4 : 1,
          borderColor: '#D7DCE5',
          borderRadius: '8px',
          borderBottom: `4px solid ${theme.palette.primary.main}`,
          boxShadow: '0 1px 2px rgba(13, 13, 18, 0.08)',
        }}
      >
        <Box
          display="grid"
          sx={{
            gridTemplateColumns: showSettingsColumn
              ? 'minmax(0, 1fr) minmax(140px, 42%)'
              : 'minmax(0, 1fr) auto',
          }}
          gridTemplateRows="auto minmax(0, 1fr)"
          columnGap={1.5}
          rowGap="4px"
          height="100%"
        >
          <Box display="flex" alignItems="flex-start" minWidth={0} gap={0.75}>
            <Box
              sx={{
                width: 30,
                flex: '0 0 30px',
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                overflow: 'hidden',
                '& > div': {
                  display: 'flex',
                  alignItems: 'center',
                  height: '20px !important',
                },
                '& svg': {
                  width: '30px',
                  height: '20px',
                },
              }}
            >
              {getIconImage()}
            </Box>
            <Typography
              variant="body2"
              noWrap
              sx={{
                color: theme.palette.text.primary,
                fontSize: '13px',
                fontWeight: 700,
                width: '150px',
                lineHeight: '18px',
                minWidth: 0,
              }}
              title={card.paymentCardName}
            >
              {card.paymentCardName}
            </Typography>
            {isExpired && (
              <Tooltip title="This card has expired and may not be usable">
                <Chip
                  label="Expired"
                  size="small"
                  sx={{
                    backgroundColor: theme.palette.background.default,
                    color: theme.palette.error.main,
                    fontWeight: 700,
                    height: '18px',
                  }}
                />
              </Tooltip>
            )}
          </Box>

          {!isGuestPayment && (
            <Box display="flex" justifyContent="flex-end">
              {renderActionsMenu()}
            </Box>
          )}

          <Box
            display="grid"
            gridAutoRows="minmax(20px, auto)"
            rowGap={0.5}
            alignContent="end"
            alignItems="center"
            justifyItems="flex-start"
            minWidth={0}
            sx={{ position: 'relative', top: '2px' }}
          >
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.primary,
                fontSize: '12px',
                fontWeight: 600,
                lineHeight: '17px',
                whiteSpace: 'nowrap',
              }}
            >
              {card.paymentCardType === 'EC'
                ? `**** ${card.cardLast4Digit ?? ''}`
                : `**** ${card.cardLast4Digit ?? ''}`}
              {card.isSession ? ' (session)' : ''}
            </Typography>
            <Typography
              variant="body2"
              noWrap
              sx={{
                color:
                  card.paymentCardType !== 'EC' && isExpired
                    ? theme.palette.error.main
                    : theme.palette.text.main,
                fontSize: '12px',
                fontWeight: 500,
                lineHeight: '17px',
              }}
              title={
                card.paymentCardType === 'EC'
                  ? formatECheckAccountType(card.electronicCheckAccountType)
                  : formatExpiry(card.validTo)
              }
            >
              {card.paymentCardType === 'EC'
                ? formatECheckAccountType(card.electronicCheckAccountType)
                : `Exp ${formatExpiry(card.validTo)}`}
            </Typography>
          </Box>

          {showSettingsColumn && (
            <Box
              display="grid"
              gridAutoRows="minmax(20px, auto)"
              rowGap={0.5}
              alignContent="end"
              justifyItems="stretch"
              minWidth={0}
            >
              {isAutoPayFlagEnabled &&
                isAutoPayEnrolled &&
                !shouldHideAutoPayCheckbox &&
                renderSettingSwitch(
                  f('payment_methods.autopay.autopay'),
                  isAutoPaySelected,
                  onAutoPayChange,
                )}
              {!hideDefault &&
                renderSettingSwitch(
                  f('payment_methods.set_as_default'),
                  isDefault,
                  onDefaultChange,
                )}
            </Box>
          )}
        </Box>
        {modals}
      </CardDetailsBox>
    );
  }

  return (
    <CardDetailsBox
      sx={{
        padding: { xs: 0, sm: '0.5rem' },
        opacity: isExpired ? 0.4 : 1,
      }}
    >
      <Grid
        container
        sx={{ height: '100%', width: '100%' }}
        flexWrap="nowrap"
        alignItems="center"
      >
        <Grid item xs={1} sm={1} lg={1} sx={{ maxWidth: '35px !important' }}>
          <span>{getIconImage()}</span>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Grid
            item
            container
            xs={7}
            sm={8}
            lg={8}
            md={8}
            sx={{
              paddingLeft: '25px',
              minHeight: '45px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              maxWidth: '95% !important',
            }}
            direction="column"
          >
            <Grid
              item
              sx={{
                fontSize: isSmallScreen ? '12px' : '14px',
                fontWeight: 'bold',
                display: 'flex',
                width: '150px',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {card.paymentCardName}
              {card.validTo && new Date(card.validTo) < new Date() && (
                <Tooltip title="This card has expired and may not be usable">
                  <Chip
                    label="Expired"
                    sx={{
                      backgroundColor: theme.palette.background.default,
                      color: theme.palette.error.main,
                      fontWeight: 'bold',
                      height: '20px',
                    }}
                  />
                </Tooltip>
              )}
            </Grid>
            <Grid item>{displayDigits()}</Grid>
          </Grid>
        </Grid>
        <Grid
          item
          xs={12}
          sm={3}
          sx={{
            maxWidth: !shouldHideAutoPayCheckbox
              ? '25% !important'
              : '18% !important',
          }}
        >
          {!isGuestPayment && !card.isSession && (
            <Box display="flex" flexDirection="column" gap={0.5}>
              {!hideDefault && (
                <Box display="flex" alignItems="center" gap={1}>
                  <EpayCheckBox
                    checked={isDefault}
                    onClick={onDefaultChange}
                    sx={{ m: 0, transform: 'scale(1.3)' }}
                    fontSize="1rem"
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: isSmallScreen ? '12px' : '14px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    {f('payment_methods.set_as_default')}
                  </Typography>
                </Box>
              )}

              {isAutoPayFlagEnabled &&
                isAutoPayEnrolled &&
                !shouldHideAutoPayCheckbox && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <EpayCheckBox
                      checked={isAutoPaySelected}
                      onClick={onAutoPayChange}
                      sx={{ m: 0, transform: 'scale(1.3)' }}
                      fontSize="1rem"
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: isSmallScreen ? '12px' : '14px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      {f('payment_methods.autopay.autopay')}
                    </Typography>
                  </Box>
                )}
            </Box>
          )}
        </Grid>
        <Grid item xs={12} sm={3}>
          {!isGuestPayment && (
            <Grid
              item
              container
              direction="row"
              justifyContent="flex-end"
              alignItems="center"
            >
              {renderActionsMenu()}
            </Grid>
          )}
        </Grid>
      </Grid>
      {modals}
    </CardDetailsBox>
  );
};
