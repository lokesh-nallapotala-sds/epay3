import { useEffect, useMemo, useState } from 'react';

import Ability from 'types/Ability';
import { useRelatedAccounts } from 'hooks/usePaymentHelpers';
import { useEffectiveAccount } from 'hooks/usePaymentHelpers';
import { Box, Grid, Typography } from '@mui/material';
import { DepositDetails } from 'types/DepositDetails';
import { clearPaymentSession, safeJsonParse } from 'utilities/utilities';
import { userHasAbility } from 'redux/reducers/userSlice';
import { useAppDispatch, useAppSelector } from 'redux/hooks';
import { usePayerDetails } from 'providers/PayerDetailsProvider';
import {
  selectCompanyCodes,
  selectPaymentConfig,
} from 'redux/selectors/configSelectors';
import { usePaymentMethodAction } from 'hooks/usePaymentMethodAction';
import EpayPageHeaderText from 'shared/components/EpayPageHeaderText';
import { getConfiguredCurrenciesForAccounts } from 'utilities/currency';
import { sessionCardsSelector } from 'redux/reducers/sessionCardsSlice';
import { selectUserState as userSelector } from 'redux/selectors/uiSelectors';
import {
  depositDetailsSelector,
  setPaymentCurrency,
  setDepositDetails as setSelectedDepositDetails,
} from 'redux/reducers/paymentSlice';

import NewDeposit from './NewDeposit';
import Payments from '../payment/Payments';
import { useFormat } from 'hooks/useFormat';

export default function Deposits() {
  const f = useFormat();

  const dispatch = useAppDispatch();
  const { refreshPayerDetails, effectivePayer } = usePayerDetails();

  const { processHostedAddPaymentMethodCallback } = usePaymentMethodAction({
    onSuccess: () => {
      refreshPayerDetails();
    },
  });

  const user = useAppSelector(userSelector);

  //TODO: we should be checking abilities (claims) rather than roles
  //-- but unfortunately the `User` object doesn't currently include these
  const canMakePayment = userHasAbility(user, Ability.MakePayment);
  const companyCodes = useAppSelector(selectCompanyCodes);
  const config = useAppSelector(selectPaymentConfig) ?? undefined;
  const payer = effectivePayer;
  const selectedAccount = useEffectiveAccount();
  const relatedAccounts = useRelatedAccounts();
  const sessionCards = useAppSelector(sessionCardsSelector);
  const storedDetails = useAppSelector(depositDetailsSelector);
  const [depositDetails, setDepositDetails] = useState<DepositDetails>(
    storedDetails && typeof storedDetails === 'string'
      ? safeJsonParse<DepositDetails>(storedDetails, {
          amountToProcess: 0,
          currencyKey: 'USD',
          reasonCode: '',
          referenceNumber: '',
          comment: '',
        })
      : (storedDetails ?? {
          amountToProcess: 0,
          currencyKey: 'USD',
          reasonCode: '',
          referenceNumber: '',
          comment: '',
        }),
  );

  const [amount, setAmount] = useState<number>(
    depositDetails?.amountToProcess ?? 0,
  );
  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    depositDetails.currencyKey,
  );

  const availableCurrencies = useMemo(
    () =>
      getConfiguredCurrenciesForAccounts(
        companyCodes,
        selectedAccount,
        relatedAccounts,
      ),
    [companyCodes, relatedAccounts, selectedAccount],
  );

  const currencyOptions = useMemo(
    () =>
      availableCurrencies.map((currency) => ({
        value: currency.code,
        label: currency.symbolNative,
      })),
    [availableCurrencies],
  );

  // Function to update deposit details and store in sessionStorage
  const updateDepositDetails = (newDetails) => {
    setDepositDetails(newDetails);
    dispatch(setSelectedDepositDetails(newDetails));
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hasPaymentParams =
      searchParams.has('access_token') ||
      searchParams.has('id') ||
      searchParams.has('status');

    if (!hasPaymentParams) {
      clearPaymentSession();
    }
  }, []);

  useEffect(() => {
    processHostedAddPaymentMethodCallback();
  }, []);

  useEffect(() => {
    if (availableCurrencies.length > 0) {
      const storedCurrency = depositDetails.currencyKey;
      const storedCurrencyOption = availableCurrencies.find(
        (c) => c.code === storedCurrency,
      );
      const usd = availableCurrencies.find((c) => c.code === 'USD');
      const nextCurrency =
        storedCurrencyOption?.code || usd?.code || availableCurrencies[0].code;

      setSelectedCurrency(nextCurrency);
      if (depositDetails.currencyKey !== nextCurrency) {
        updateDepositDetails({
          ...depositDetails,
          currencyKey: nextCurrency,
        });
      }
    }
  }, [availableCurrencies, depositDetails.currencyKey, sessionCards]);

  const handleAmountChange = (e) => {
    const updatedAmount = e ? parseFloat(e) : 0;
    setAmount(updatedAmount);
    updateDepositDetails({ ...depositDetails, amountToProcess: updatedAmount });
  };

  const handleReferenceNumberChange = (e) => {
    updateDepositDetails({ ...depositDetails, referenceNumber: e });
  };

  const handleNotesChange = (e) => {
    updateDepositDetails({ ...depositDetails, comment: e });
  };

  const handleCurrencyChange = (e) => {
    dispatch(setPaymentCurrency(e));
    setSelectedCurrency(e);
    updateDepositDetails({ ...depositDetails, currencyKey: e });
  };

  const handleSelectedReferenceCodeChange = (e) => {
    updateDepositDetails({
      ...depositDetails,
      reasonCode: e?.reasonCode || '',
    });
  };

  if (!user) {
    return null;
  }

  return (
    <Box
      width="100%"
      sx={{
        flexGrow: 1,
        marginTop: '1rem',
        position: 'relative',
      }}
    >
      {config?.isPaymentDisabled && (
        <Grid item sx={{ textAlign: 'center' }}>
          <Typography variant="body1" color="error" sx={{ padding: '10px' }}>
            {f('payment.disabled')}
          </Typography>
        </Grid>
      )}
      <Grid container flexDirection="column" rowGap="2rem">
        <Grid container spacing={{ xs: 2, sm: 0 }}>
          <EpayPageHeaderText
            header={f('header.deposits')}
            subheader={f('header.deposits.subheader')}
          />
        </Grid>

        <Grid item container flexDirection="row" xs={12} spacing={8}>
          <Grid
            item
            xs={12}
            sm={6}
            md={6}
            lg={6}
            sx={{ paddingBottom: '1rem' }}
          >
            <NewDeposit
              isDisabled={config?.isPaymentDisabled || !canMakePayment}
              onAmountChange={handleAmountChange}
              onReferenceNumberChange={handleReferenceNumberChange}
              onNotesChange={handleNotesChange}
              onCurrencyChange={handleCurrencyChange}
              onReasonCodeChange={handleSelectedReferenceCodeChange}
              storedDepositDetails={depositDetails}
              currencyOptions={currencyOptions}
            ></NewDeposit>
          </Grid>
          <Grid
            item
            xs={12}
            sm={6}
            md={6}
            lg={6}
            sx={{ paddingBottom: '1rem' }}
          >
            <Payments
              data={[]}
              isDeposit={true}
              payTotal={amount}
              payer={payer}
              currencyKey={selectedCurrency}
              depositDetails={depositDetails}
            />
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}
