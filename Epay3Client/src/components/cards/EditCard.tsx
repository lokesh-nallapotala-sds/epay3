import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

import { useIntl } from 'react-intl';

import PaymentLogo from 'shared/components/PaymentLogo';
import { CreditCard } from 'types/CreditCard';
import { useTheme } from '@mui/material/styles';
import { PayerDetails, PaymentCardSubmission } from 'types/Payment';
import { useEpayToast } from 'providers/EpayToastProvider';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { impersonatedUserSelector } from 'redux/reducers';
import { usePayerDetails } from 'providers/PayerDetailsProvider';
import { EpayPaymentService } from 'services/EpayPaymentService';
import { useAppSelector } from 'redux/hooks';
import { selectIsCVVAllowedFromCustomConfig } from 'redux/selectors/configSelectors';

import CVVInput from './CVVInput';
import ExpiryDate from './ExpiryDate';
import {
  Grid,
  Typography,
  TextField,
  InputAdornment,
  Button,
} from '@mui/material';
import { Box } from '@mui/system';
import { mapPaymentIcon } from '../../utilities/utilities';
import {
  EpayModalBody,
  EpayModalFooter,
  EpayModalHeader,
} from 'shared/components/EpayModalLayout';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

interface editProps {
  card: CreditCard;
  onClose: () => void;
}
export const EditCard = ({ card, onClose }: editProps) => {
  const intl = useIntl();
  const f = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id, defaultMessage: id }, values);

  const {
    refreshPayerDetails,
    effectivePayer,
    effectiveAccount: selectedAccount,
  } = usePayerDetails();

  const theme = useTheme();
  const { showToastMessage } = useEpayToast();
  const impersonatedUser = useAppSelector(impersonatedUserSelector);
  const isCVVAllowed = useAppSelector(selectIsCVVAllowedFromCustomConfig);
  const updatePaymentCard = EpayPaymentService.useUpdatePaymentCard();

  const [cardHolderName, setCardHolderName] = useState<string>('');
  const [holderNameError, setHolderNameError] = useState('');
  const [maskedCardNumber, setMaskedCardNumber] = useState('');
  const [cardType, setCardType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cardDate, setCardDate] = useState<string>('');
  const [cvv, setCvv] = useState<string>('');
  const [isCVVValid, setIsCVVValid] = useState<boolean>(false);

  useEffect(() => {
    setCardHolderName(card.cardName || '');
    const mappedType = mapPaymentIcon(card.cardType || card.sapCardType || '');
    setCardType(mappedType);
    setMaskedCardNumber(maskCardNumber(card?.cardLast4Digit ?? '', mappedType));
    setCardDate(card.cardMonth + '/' + (card.cardYear?.substring(2, 4) || ''));
  }, [card]);

  const maskCardNumber = (cardNumber: string, type: string): string => {
    const digits = (cardNumber ?? '').replace(/\D/g, '').slice(-4);

    if (digits.length < 4) {
      return cardNumber || '';
    }
    const normalizedType = type?.toLowerCase();

    if (normalizedType === 'amex') {
      return `**** ****** *${digits}`;
    }

    if (
      normalizedType === 'diners' ||
      normalizedType === 'diners_club' ||
      normalizedType === 'diners-club'
    ) {
      return `**** ****** ${digits}`;
    }

    return `**** **** **** ${digits}`;
  };

  const handleExpiryDateChange = (date: string) => {
    setCardDate(date);
  };
  const onCvvChange = (cvv: string) => {
    setCvv(cvv);
  };
  const handleCVVError = (e: boolean) => {
    setIsCVVValid(e);
  };

  const hanldeHolderNameChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setCardHolderName(e.target.value);
  };

  const hanldeHolderNameBlur = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (e.target.value.trim() === '') {
      setHolderNameError(f('payment_methods.holdername.error'));
    } else {
      setHolderNameError('');
    }
    setCardHolderName(e.target.value);
  };

  function closeModal(): void {
    onClose();
  }

  async function saveCard(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (cardHolderName.trim() === '') {
      setHolderNameError(f('payment_methods.holdername.error'));
      return;
    }
    if (isCVVAllowed) {
      if (cvv.trim() === '') {
        showToastMessage('error', f('payment.error.cvv_empty'));
        return;
      }
      if (!isCVVValid) {
        showToastMessage('error', f('payment_methods.cvv.error'));
        return;
      }
    }

    if (!selectedAccount) {
      return;
    }

    setIsSubmitting(true);

    const postCard: PaymentCardSubmission = {
      paymentCardType: card.sapCardType || card.paymentCardType || '',
      paymentCardName: cardHolderName.trim(),
      validFrom: '',
      electronicCheckAccountType: card.electronicCheckAccountType || '',
      electronicCheckRdfiNumber: card.electronicCheckRdfiNumber || '',
      cardValidationCode: isCVVAllowed ? cvv || '' : '',
      paymentCardToken: card.token || '',
      validTo: cardDate
        ? `${cardDate.split('/')[0].trim()}-28-20${cardDate.split('/')[1].trim()}`
        : '',
      default: card?.makeDefault ? 'X' : '',
    };

    const payerDetails: PayerDetails = {
      customerNumber: effectivePayer,
      companyCode: selectedAccount.companyCode,
      paymentCards: [],
    };
    updatePaymentCard(payerDetails, postCard, impersonatedUser?.userId)
      .then(async () => {
        onClose();
        await refreshPayerDetails(true);
      })
      .finally(() => setIsSubmitting(false));
  }

  return (
    <Box>
      <EpayModalHeader heading={f('payment_methods.edit_card')} />
      <EpayModalBody>
        <Grid container flexDirection="column" gap="16px" spacing={1}>
          <Grid item display="flex" flexDirection="column" gap="4px">
            <Box display="flex">
              <Typography variant="fieldHeader">
                {f('payment_methods.card_number')}
              </Typography>
              <Typography variant="fieldHeader" color="red" ml=".25rem">
                {f('app.common.required_indicator')}
              </Typography>
            </Box>
            <TextField
              fullWidth
              disabled
              value={maskedCardNumber}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {cardType === '' ? (
                      <CreditCardIcon />
                    ) : (
                      <PaymentLogo icon={cardType} />
                    )}
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid
            item
            container
            direction="row"
            columnGap="16px"
            flexWrap="nowrap"
          >
            <Grid
              item
              xs={isCVVAllowed ? 6 : 12}
              display="flex"
              flexDirection="column"
              gap="4px"
            >
              <Box display="flex">
                <Typography variant="fieldHeader">
                  {f('payment_methods.exp_date')}
                </Typography>
                <Typography variant="fieldHeader" color="red" ml=".25rem">
                  {f('app.common.required_indicator')}
                </Typography>
              </Box>
              <ExpiryDate
                data={cardDate}
                focus={false}
                onChange={handleExpiryDateChange}
                tabIndex={1}
              />
            </Grid>
            {isCVVAllowed && (
              <Grid
                item
                xs={6}
                display="flex"
                flexDirection="column"
                gap="4px"
                sx={{ width: 'calc(50% - 8px)' }}
              >
                <Box display="flex">
                  <Typography variant="fieldHeader">
                    {f('payment_methods.cvv')}
                  </Typography>
                  <Typography variant="fieldHeader" color="red" ml=".25rem">
                    {f('app.common.required_indicator')}
                  </Typography>
                </Box>
                <CVVInput
                  tabIndex={2}
                  cardType={cardType}
                  CVCLengthRequired={0}
                  onChange={onCvvChange}
                  onError={handleCVVError}
                />
              </Grid>
            )}
          </Grid>

          <Grid item display="flex" flexDirection="column" gap="4px">
            <Box display="flex">
              <Typography variant="fieldHeader">
                {f('payment_methods.card_holder_name')}
              </Typography>
              <Typography variant="fieldHeader" color="red" ml=".25rem">
                {f('app.common.required_indicator')}
              </Typography>
            </Box>
            <TextField
              type="text"
              fullWidth
              required
              error={!!holderNameError}
              helperText={holderNameError}
              value={cardHolderName}
              onChange={hanldeHolderNameChange}
              onBlur={hanldeHolderNameBlur}
              sx={(muiTheme) => ({
                ...getCompactFilterFieldSx(muiTheme),
              })}
            />
          </Grid>
        </Grid>
      </EpayModalBody>
      <EpayModalFooter>
        <Button variant="outlined" color="secondary" onClick={closeModal}>
          {f('payment_methods.cancel_button')}
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={isSubmitting}
          sx={{
            textTransform: 'none',
            border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
            '&:hover': {
              border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
            },
          }}
          onClick={saveCard}
        >
          {f('payment_methods.add_card_button')}
        </Button>
      </EpayModalFooter>
    </Box>
  );
};
