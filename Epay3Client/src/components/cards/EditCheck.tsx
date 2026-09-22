import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

import { impersonatedUserSelector } from 'redux/reducers';
import { useAppSelector } from 'redux/hooks';

import { CreditCard } from 'types/CreditCard';
import { useTheme } from '@mui/material/styles';
import { PayerDetails, PaymentCard } from 'types/Payment';
import { EpayPaymentService } from 'services/EpayPaymentService';
import { usePayerDetails } from 'providers/PayerDetailsProvider';
import { Box, Button, Grid, TextField, Typography } from '@mui/material';
import { useFormat } from 'hooks/useFormat';
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

export const EditCheck = ({ card, onClose }: editProps) => {
  const {
    refreshPayerDetails,
    effectivePayer: selectedPayer,
    effectiveAccount: selectedAccount,
  } = usePayerDetails();
  const updatePaymentMethod = EpayPaymentService.useUpdatePaymentCard();
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [cardHolderName, setCardHolderName] = useState<string>('');
  const [holderNameError, setHolderNameError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const impersonatedUser = useAppSelector(impersonatedUserSelector);
  const theme = useTheme();
  const f = useFormat();

  function closeModal(): void {
    onClose();
  }

  useEffect(() => {
    setCardHolderName(card.cardName || '');
    setAccountNumber('ending in ' + (card.cardLast4Digit || ''));
  }, [card]);

  async function saveCheck(e: FormEvent): Promise<void> {
    e.preventDefault();
    let isError = false;

    if (!cardHolderName.trim()) {
      setHolderNameError(true);
      isError = true;
    } else {
      setHolderNameError(false);
    }

    if (isError) return;
    if (!selectedAccount) return;
    setIsSubmitting(true);

    const postCard: PaymentCard = {
      paymentCardType: 'EC',
      paymentCardName: cardHolderName.trim(),
      validFrom: '',
      paymentCardToken: card.token || '',
      default: card?.makeDefault ? 'X' : '',
    };

    const payerDetails: PayerDetails = {
      customerNumber: selectedPayer,
      companyCode: selectedAccount.companyCode,
      paymentCards: [],
    };

    updatePaymentMethod(payerDetails, postCard, impersonatedUser?.userId)
      .then(async () => {
        onClose();
        await refreshPayerDetails(true);
      })
      .finally(() => setIsSubmitting(false));
  }

  function holderNameHandler(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void {
    setCardHolderName(event.target.value);
    if (event.target.value) {
      setHolderNameError(false);
    } else {
      setHolderNameError(true);
    }
  }

  return (
    <Box>
      <EpayModalHeader heading={f('payment_methods.edit_check')} />
      <EpayModalBody>
        <Grid item display="flex" flexDirection="column" gap="4px">
          <Box display="flex">
            <Typography variant="fieldHeader">
              {f('payment.check.account_number')}
            </Typography>
          </Box>
          <TextField
            type="text"
            value={accountNumber}
            variant={'outlined'}
            disabled
            fullWidth
            sx={{
              '& .MuiInputBase-root-MuiOutlinedInput-root.Mui-disabled': {
                color: 'black',
              },
            }}
          />
        </Grid>

        <Grid item display="flex" flexDirection="column" gap="4px">
          <Box display="flex">
            <Typography variant="fieldHeader">
              {f('payment.check.hodler_name')}
            </Typography>
            <Typography variant="fieldHeader" color="red" ml=".25rem">
              {f('app.common.required_indicator')}
            </Typography>
          </Box>
          <TextField
            type="text"
            value={cardHolderName}
            variant={'outlined'}
            fullWidth
            error={!!holderNameError}
            helperText={
              holderNameError
                ? `${f('payment.check.hodler_name.helper_text')}`
                : ''
            }
            onChange={holderNameHandler}
            sx={(muiTheme) => ({
              ...getCompactFilterFieldSx(muiTheme),
            })}
          />
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
          onClick={saveCheck}
        >
          {f('payment_methods.add_check_button')}
        </Button>
      </EpayModalFooter>
    </Box>
  );
};
