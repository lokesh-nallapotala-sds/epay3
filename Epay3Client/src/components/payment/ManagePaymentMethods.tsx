import { useState, useEffect, SyntheticEvent, memo } from 'react';
import { PaymentCard } from 'types/Payment';
import {
  EpayTabContext,
  EpayTabList,
  EpayTabPanel,
} from 'shared/components/EpayTabs';
import AddCardIcon from '@mui/icons-material/AddCard';
import { Box, Grid, Stack, Tab, Typography, useTheme } from '@mui/material';
import { PaymentMethodModal } from '../cards/PaymentMethodModal';
import { CreditCardList } from './CreditCardList';
import { useFormat } from 'hooks/useFormat';

export type ManagePaymentMethodsProps = {
  cards: PaymentCard[];
  allowEchecks?: boolean;
  isAutoPayFlagEnabled?: boolean;
  isAutoPayEnrolled?: boolean;
  hideDefault?: boolean;
  onSuccess?: (card: PaymentCard) => void;
};

export const ManagePaymentMethods = memo(function ManagePaymentMethods(
  props: ManagePaymentMethodsProps,
) {
  const {
    cards,
    allowEchecks = false,
    isAutoPayFlagEnabled = false,
    isAutoPayEnrolled = false,
    hideDefault,
    onSuccess,
  } = props;
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const handleClose = () => setOpen(false);
  const f = useFormat();
  const [type, setType] = useState('card');
  const [value, setValue] = useState('1');
  const [cardsList, setCardsList] = useState<PaymentCard[]>([]);
  const [echecksList, setEChecksList] = useState<PaymentCard[]>([]);

  const getCreditCards = () => {
    let totalCreditCards: PaymentCard[] = [];
    totalCreditCards = cards?.filter(
      (card: PaymentCard) => card.paymentCardType !== 'EC',
    );
    return totalCreditCards;
  };

  useEffect(() => {
    setCardsList(getCreditCards());
    if (allowEchecks) {
      setEChecksList(getChecks());
    }
  }, [cards]);

  const getChecks = () =>
    cards.filter((card: PaymentCard) => card.paymentCardType === 'EC');

  const handleChange = (event: SyntheticEvent, newValue: string) => {
    setValue(newValue);
  };

  function addCreditCard(): void {
    setOpen(true);
    setType('card');
  }
  function addECheck(): void {
    setOpen(true);
    setType('check');
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
      }}
      marginTop={'.1rem'}
    >
      <EpayTabContext value={value}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <EpayTabList onChange={handleChange}>
            <Tab
              label={`${f('payment_methods.my_cards')}`}
              value="1"
              sx={{ textTransform: 'none' }}
            />
            {allowEchecks && (
              <Tab
                label={`${f('payment_methods.my_echecks')}`}
                value="2"
                sx={{ textTransform: 'none' }}
              />
            )}
          </EpayTabList>
        </Box>
        <EpayTabPanel
          value="1"
          sx={{
            '&.MuiTabPanel-root': {
              padding: '0px',
              paddingTop: '1rem',
            },
          }}
        >
          <Grid container flexDirection={'column'}>
            <Grid item container sm={12} lg={12} flexDirection={'column'}>
              <Grid item sx={{ overflow: 'auto' }}>
                <CreditCardList
                  cards={cardsList}
                  type={'card'}
                  isAutoPayFlagEnabled={isAutoPayFlagEnabled}
                  isAutoPayEnrolled={isAutoPayEnrolled}
                  hideDefault={hideDefault}
                ></CreditCardList>
              </Grid>
              <Grid item sx={{ paddingTop: '0.5rem' }}>
                <Stack
                  direction="row"
                  sx={{
                    cursor: 'pointer',
                    color: theme.palette.interactiveColor,
                    paddingLeft: '3px',
                  }}
                >
                  <AddCardIcon
                    sx={{ marginRight: '.4rem' }}
                    onClick={addCreditCard}
                  ></AddCardIcon>
                  <Typography
                    variant="body2"
                    onClick={addCreditCard}
                    sx={{ margin: '2px' }}
                  >
                    {f('payment_methods.add_new_card')}
                  </Typography>
                </Stack>
              </Grid>
            </Grid>
          </Grid>
        </EpayTabPanel>
        <EpayTabPanel
          value="2"
          sx={{
            '&.MuiTabPanel-root': {
              padding: '0px',
              paddingTop: '1rem',
            },
          }}
        >
          <Grid container flexDirection={'column'}>
            <Grid item container sm={12} lg={12} flexDirection={'column'}>
              <Grid item sx={{ overflow: 'auto' }}>
                <CreditCardList
                  cards={echecksList}
                  type={'check'}
                  isAutoPayFlagEnabled={isAutoPayFlagEnabled}
                  isAutoPayEnrolled={isAutoPayEnrolled}
                  hideDefault={hideDefault}
                ></CreditCardList>
              </Grid>
              <Grid item sx={{ paddingTop: '0.5rem' }}>
                <Stack
                  direction="row"
                  sx={{
                    cursor: 'pointer',
                    color: theme.palette.interactiveColor,
                    paddingLeft: '3px',
                  }}
                >
                  <AddCardIcon
                    sx={{ marginRight: '.4rem' }}
                    onClick={addECheck}
                  ></AddCardIcon>
                  <Typography
                    variant="body2"
                    onClick={addECheck}
                    sx={{ margin: '2px' }}
                  >
                    {f('payment_methods.add_new_check')}
                  </Typography>
                </Stack>
              </Grid>
            </Grid>
          </Grid>
        </EpayTabPanel>
      </EpayTabContext>
      <PaymentMethodModal
        paymentType={type}
        open={open}
        handleClose={handleClose}
        onSuccess={onSuccess}
      ></PaymentMethodModal>
    </Box>
  );
});
