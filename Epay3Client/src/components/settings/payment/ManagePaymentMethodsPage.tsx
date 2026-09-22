import { useState, useEffect, useMemo } from 'react';

import { FormattedMessage, useIntl } from 'react-intl';

import { Stack } from '@mui/material';
import { useTheme } from '@mui/system';
import Divider from '@mui/material/Divider';
import AddCardIcon from '@mui/icons-material/AddCard';
import useMediaQuery from '@mui/material/useMediaQuery';
import { PaymentCard } from 'types/Payment';
import { useAllPaymentCardsForPayer } from 'hooks/usePaymentHelpers';
import { useEpayToast } from 'providers/EpayToastProvider';
import { useAppSelector } from 'redux/hooks';
import { EpayPaymentService } from 'services/EpayPaymentService';
import { usePayerDetails } from 'providers/PayerDetailsProvider';
import { formatError } from 'utilities/utilities';
import { usePaymentMethodAction } from 'hooks/usePaymentMethodAction';
import { Box, Button, Grid, Typography } from '@mui/material';
import EpayPageHeaderText from 'shared/components/EpayPageHeaderText';
import {
  impersonatedUserSelector,
  selectedAccountSelector,
} from 'redux/reducers';

import { CreditCardList } from '../../payment/CreditCardList';
import EpayCheckBox from '../../../shared/components/EpayCheckBox';
import { PaymentMethodModal } from '../../cards/PaymentMethodModal';
import {
  selectCompanyCodes,
  selectIsAutoPayEnabled,
} from '../../../redux/selectors/configSelectors';
import EpayConfirmDialog from '../../../shared/components/EpayConfirmDialog';

function ManagePaymentMethodsPage() {
  const theme = useTheme();
  const lgUp = useMediaQuery(theme.breakpoints.up('lg'));
  const [cardsList, setCardsList] = useState<PaymentCard[]>([]);
  const [echecksList, setEChecksList] = useState<PaymentCard[]>([]);
  const [isAutoPayEnrolled, setIsAutoPayEnrolled] = useState<boolean>(false);
  const [isAutoPayNotUpdatedInSAP, setIsAutoPayNotUpdatedInSAP] =
    useState<boolean>(false);
  const [isAutoPayAgreed, setIsAutoPayAgreed] = useState<boolean>(false);
  const [unenrollModalOpen, setUnenrollModalOpen] = useState(false);
  const selectedAccount = useAppSelector(selectedAccountSelector);
  const unEnrollAutoPay = EpayPaymentService.useUnEnrollAutoPay();
  const impersonatedUser = useAppSelector(impersonatedUserSelector);
  const impersonatedUserId = impersonatedUser
    ? impersonatedUser.userId
    : undefined;
  const intl = useIntl();
  const f = (id) => intl.formatMessage({ id: id });
  const renderAutoPayInfo = () => {
    const id = isAutoPayNotUpdatedInSAP
      ? 'payment_methods.autopay.enroll.enrolled.info.no_cards.set_as_autopay'
      : isAutoPayEnrolled
        ? 'payment_methods.autopay.enroll.enrolled.info'
        : 'payment_methods.autopay.enroll.not.enrolled.info';

    let bIdx = 0;
    return (
      <FormattedMessage
        id={id}
        values={{
          b: (chunks) => <strong key={bIdx++}>{chunks}</strong>,
        }}
      />
    );
  };
  const { payerDetails, refreshPayerDetails, effectivePayer } =
    usePayerDetails();
  const { showToastMessage } = useEpayToast();
  const borderColor = theme.components?.MuiPaper?.defaultProps?.sx?.borderColor;
  const cards = useAllPaymentCardsForPayer();
  const [open, setOpen] = useState(false);
  const handleClose = () => setOpen(false);
  const [type, setType] = useState('card');
  const selectedpayer = effectivePayer;
  const isAutoPayEnabled = useAppSelector(selectIsAutoPayEnabled);
  const companyCodes = useAppSelector(selectCompanyCodes);

  const companyCodeDetail = useMemo(() => {
    return companyCodes?.find(
      (code) => code.companyCode === selectedAccount?.companyCode,
    );
  }, [companyCodes, selectedAccount?.companyCode]);

  const getCreditCards = () => {
    return (
      cards
        ?.filter((card: PaymentCard) => card.paymentCardType !== 'EC')
        .map((card: PaymentCard) => ({
          ...card,
          isDefault: card.default === 'X',
        })) || []
    );
  };

  const getChecks = () => {
    return (
      cards
        ?.filter((card: PaymentCard) => card.paymentCardType === 'EC')
        .map((card: PaymentCard) => ({
          ...card,
          isDefault: card.default === 'X',
        })) || []
    );
  };

  const { processHostedAddPaymentMethodCallback } = usePaymentMethodAction({
    onSuccess: () => refreshPayerDetails(true),
  });

  useEffect(() => {
    processHostedAddPaymentMethodCallback();
  }, [processHostedAddPaymentMethodCallback]);

  useEffect(() => {
    setCardsList(getCreditCards());
    setEChecksList(getChecks());
    setIsAutoPayNotUpdatedInSAP(false);

    const enrolled = payerDetails?.isAutoPayEnrolled === true;
    setIsAutoPayEnrolled(!!enrolled);
    setIsAutoPayAgreed(!!enrolled);
  }, [cards, payerDetails?.isAutoPayEnrolled]);

  function addCreditCard(): void {
    setOpen(true);
    setType('card');
  }
  function addECheck(): void {
    setOpen(true);
    setType('check');
  }

  const handleAgreeChange = (e) => {
    setIsAutoPayAgreed(e);
  };

  const handleEnrollClick = async () => {
    if (!isAutoPayAgreed) {
      return;
    }
    setIsAutoPayEnrolled(true);
    setIsAutoPayNotUpdatedInSAP(true);
  };

  const handleUnenrollClick = () => {
    setUnenrollModalOpen(true);
  };

  const confirmUnenroll = async () => {
    if (!selectedAccount) {
      return;
    }

    try {
      await unEnrollAutoPay(
        selectedAccount.primaryAcct,
        selectedpayer,
        selectedAccount.companyCode,
        impersonatedUserId,
      );
      showToastMessage(
        'success',
        f('payment_methods.autopay.unenroll.success'),
      );
      await refreshPayerDetails(true);
    } catch (error) {
      const errorObject = formatError(error);
      showToastMessage(
        'error',
        errorObject.message_line_string ||
          f('payment_methods.autopay.unenroll.error'),
      );
    }
  };

  if (!selectedAccount) return null;

  return (
    <Box sx={{ flexGrow: 1, marginTop: '1rem' }}>
      <Grid container direction="column" rowGap="2rem">
        <Grid
          container
          spacing={{ xs: 2, sm: 0 }}
          paddingBottom="2rem"
          borderBottom={`1px solid ${borderColor}`}
        >
          <EpayPageHeaderText
            header={f('payment.methods')}
            subheader={f('payment.methods.manage.hint')}
          />
        </Grid>

        <Grid
          item
          container
          direction="column"
          rowGap="1.5rem"
          paddingX={lgUp ? '2rem' : undefined}
          paddingTop="0"
          sx={{ position: 'relative' }}
        >
          {/* Cards */}
          <Grid item container direction="row" spacing={3}>
            <Grid item xs={lgUp ? 6 : 12}>
              <Typography variant="h3" gutterBottom={!lgUp}>
                {f('payment.methods.cards.my')}
              </Typography>
            </Grid>
            <Grid item xs={lgUp ? 6 : 12}>
              <Stack direction="column" spacing={1} alignItems="flex-start">
                <CreditCardList
                  cards={cardsList}
                  type="card"
                  isAutoPayFlagEnabled={isAutoPayEnabled}
                  isAutoPayEnrolled={isAutoPayEnrolled}
                  hideDefault={false}
                  variant="settingsGrid"
                />
                <Stack
                  direction="row"
                  alignItems="center"
                  sx={{
                    cursor: 'pointer',
                    color: `${theme.palette.interactiveColor}`,
                    marginLeft: '.58rem !important',
                    marginTop: '1.75rem !important',
                  }}
                  spacing={1}
                  onClick={addCreditCard}
                >
                  <AddCardIcon />
                  <Typography variant="body2">
                    {f('payment_methods.cards.add')}
                  </Typography>
                </Stack>
              </Stack>
            </Grid>
          </Grid>

          <Divider />

          {/* eChecks */}
          {companyCodeDetail?.isEcheckEnabled && (
            <Grid item container direction={'row'} spacing={3}>
              <Grid item xs={lgUp ? 6 : 12}>
                <Typography variant="h3" gutterBottom={!lgUp}>
                  {f('payment.methods.echecks.my')}
                </Typography>
              </Grid>
              <Grid item xs={lgUp ? 6 : 12}>
                <Stack direction="column" spacing={1} alignItems="flex-start">
                  <CreditCardList
                    cards={echecksList}
                    type="echeck"
                    isAutoPayFlagEnabled={isAutoPayEnabled}
                    isAutoPayEnrolled={isAutoPayEnrolled}
                    hideDefault={false}
                    variant="settingsGrid"
                  />
                  <Stack
                    direction="row"
                    alignItems="center"
                    sx={{
                      cursor: 'pointer',
                      color: `${theme.palette.interactiveColor}`,
                      marginLeft: '.58rem !important',
                      marginTop: '1.75rem !important',
                    }}
                    spacing={1}
                    onClick={addECheck}
                  >
                    <AddCardIcon />
                    <Typography variant="body2">
                      {f('payment_methods.echecks.add')}
                    </Typography>
                  </Stack>
                </Stack>
              </Grid>
            </Grid>
          )}

          {isAutoPayEnabled &&
            (cardsList.length > 0 || echecksList.length > 0) && (
              <>
                <Divider />

                <Grid item container direction={'row'} spacing={3}>
                  <Grid item xs={lgUp ? 6 : 12}>
                    <Typography
                      variant="h3"
                      gutterBottom={!lgUp}
                      sx={{ mb: 2 }}
                    >
                      {f('payment_methods.autopay.autopay')}
                    </Typography>
                    <Typography variant="body2">
                      {renderAutoPayInfo()}
                    </Typography>
                  </Grid>
                  {!isAutoPayEnrolled && (
                    <Grid item xs={lgUp ? 6 : 12}>
                      <Box
                        display="flex"
                        justifyContent="flex-end"
                        alignItems="center"
                        gap={10}
                        sx={{ mt: 3 }}
                      >
                        <Box display="flex" alignItems="center" gap={2}>
                          <EpayCheckBox
                            checked={isAutoPayAgreed}
                            sx={{ m: 0, transform: 'scale(1.3)' }}
                            onClick={handleAgreeChange}
                            fontSize="1rem"
                          />
                          <Typography variant="h5">
                            {f('payment_methods.autopay.i_agree')}
                          </Typography>
                        </Box>
                        <Button
                          variant="contained"
                          size="small"
                          sx={{
                            width: '100px',
                            fontSize: '1rem',
                            ...(isAutoPayAgreed && {
                              border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                              '&:hover': {
                                border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                              },
                            }),
                          }}
                          onClick={handleEnrollClick}
                          disabled={!isAutoPayAgreed}
                        >
                          {f('payment_methods.autopay.enroll')}
                        </Button>
                      </Box>
                    </Grid>
                  )}
                  {isAutoPayEnrolled && !isAutoPayNotUpdatedInSAP && (
                    <Grid item xs={lgUp ? 6 : 12}>
                      <Box
                        display="flex"
                        justifyContent="flex-end"
                        alignItems="center"
                        sx={{ mt: 3 }}
                      >
                        <Button
                          variant="contained"
                          size="small"
                          sx={{
                            width: '100px',
                            fontSize: '1rem',
                            border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                            '&:hover': {
                              border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                            },
                          }}
                          onClick={handleUnenrollClick}
                        >
                          {f('payment_methods.autopay.unenroll')}
                        </Button>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </>
            )}
        </Grid>
      </Grid>
      <PaymentMethodModal
        paymentType={type}
        open={open}
        handleClose={handleClose}
      ></PaymentMethodModal>
      <UnenrollConfirmationModal
        open={unenrollModalOpen}
        onClose={() => setUnenrollModalOpen(false)}
        onConfirm={confirmUnenroll}
      />
    </Box>
  );
}

const UnenrollConfirmationModal = ({ open, onClose, onConfirm }) => {
  const intl = useIntl();
  const f = (id: string, defaultMessage?: string) =>
    intl.formatMessage({ id, defaultMessage: defaultMessage || id });

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <EpayConfirmDialog
      open={open}
      onClose={onClose}
      title={f('payment_methods.autopay.unenroll.confirm.modal.header')}
      message={f('payment_methods.autopay.unenroll.confirm.modal.message')}
      onConfirm={handleConfirm}
      cancelLabel={f('app.common.cancel')}
      confirmLabel={f('app.common.ok')}
    />
  );
};

export default ManagePaymentMethodsPage;
