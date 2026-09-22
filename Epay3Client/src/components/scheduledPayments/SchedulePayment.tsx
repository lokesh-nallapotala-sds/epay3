import { useCallback, useEffect, useRef, useState } from 'react';

import { Box, Grid, Typography } from '@mui/material';
import { CurrencySymbols } from 'constants/CurrencySymbols';
import useEpayNavigate from 'hooks/useEpayNavigate';
import { useEffectiveAccount } from 'hooks/usePaymentHelpers';
import { usePayerDetails } from 'providers/PayerDetailsProvider';
import { useAppDispatch, useAppSelector } from 'redux/hooks';
import {
  setPayer,
  setSoldTo,
  impersonatedUserSelector,
  selectedInvoicesSelector,
  selectUserState as userSelector,
  setSelectedInvoices,
  userHasAbility,
  mappedInvoicesSelector,
  selectedPaymentMethodSelector,
} from 'redux/reducers';
import EpayBox from 'shared/components/EpayBox';
import EpayPageHeaderText from 'shared/components/EpayPageHeaderText';
import { useEpayToast } from 'providers/EpayToastProvider';
import { EpayPaymentService } from 'services/EpayPaymentService';
import Ability from 'types/Ability';
import { Invoice } from 'types/InvoicesSearchRequest';
import { PaymentMethod } from 'types/Payment';
import PaymentScheduler from './PaymentScheduler';
import PaymentInvoiceList, {
  PaymentInvoiceListHandle,
} from '../payment/PaymentInvoiceList';
import { CONTEXT_KEY, URL_PARAM_ACCESS_TOKEN } from '../../constants/UiOptions';
import { useSelector } from 'react-redux';
import {
  clearMappedInvoices,
  clearScheduleDate,
  clearSelectedPaymentMethod,
  scheduleDateSelector,
} from '../../redux/reducers/paymentSlice';
import { usePaymentMethodAction } from '../../hooks/usePaymentMethodAction';
import { selectPaymentConfig } from '../../redux/selectors/configSelectors';
import { enrichPaymentMethodTypeFields } from '../../utilities/utilities';
import { useFormat } from 'hooks/useFormat';
import {
  SCHEDULE_3DS_STATE_KEY,
  SCHEDULE_3DS_REDIRECT_CURRENCY_KEY,
  SCHEDULE_PAYMENT_AGREEMENT_KEY,
  SCHEDULE_PAYMENT_CVV_KEY,
} from '../../hooks/useScheduledPaymentExecution';

const getPaymentMethodFromSearch = (
  search: URLSearchParams,
): PaymentMethod | null => {
  const key = search.get('pmk');
  if (!key) {
    return null;
  }

  const name = search.get('pmn') || 'Card';
  const cardType = search.get('pmt') || '';

  return enrichPaymentMethodTypeFields({
    name,
    dropDownDisplayName: name,
    key,
    cardType,
    default: false,
    token: key,
    validFrom: search.get('pmvf') || undefined,
    validTo: search.get('pmvt') || undefined,
  });
};

export default function SchedulePayment() {
  const { location, navigate } = useEpayNavigate();
  const f = useFormat();
  const isFirstRender = useRef(true);
  const prevAccountId = useRef<string | undefined>(undefined);
  const hasProcessedReturn = useRef(false);

  const dispatch = useAppDispatch();
  const { showToastMessage } = useEpayToast();
  const { effectivePayer, refreshPayerDetails } = usePayerDetails();
  const { processHostedAddPaymentMethodCallback } = usePaymentMethodAction({
    onSuccess: () => refreshPayerDetails(true),
  });

  const user = useAppSelector(userSelector);
  const impersonatedUser = useAppSelector(impersonatedUserSelector);
  const impersonatedUserId = impersonatedUser?.userId;
  const canMakePayment = userHasAbility(user, Ability.MakePayment);

  const selectedPayer = effectivePayer;
  const paymentConfig = useAppSelector(selectPaymentConfig) ?? undefined;
  const selectedAccount = useEffectiveAccount();

  useEffect(() => {
    if (selectedAccount?.primaryAcct) {
      prevAccountId.current = selectedAccount.primaryAcct;
    }
  }, []);

  const { soldTo, payer } = location.state || {};
  const data = useAppSelector(selectedInvoicesSelector);

  const [invoices, setInvoices] = useState<any[]>([]);
  const paymentInvoiceListRef = useRef<PaymentInvoiceListHandle>(null);
  const [selectedCurrency] = useState<string>('USD');
  const currencyOptions = invoices.map(
    (invoice: Invoice) =>
      CurrencySymbols[invoice?.currencyKey || selectedCurrency],
  );
  const [amountToPay, setAmountToPay] = useState<number>(0);

  const get3DSAuthenticationResult =
    EpayPaymentService.useGet3DSAuthenticationResult();
  const postScheduledPayment = EpayPaymentService.usePostScheduledPayment();
  const search = new URLSearchParams(location.search);
  const accessToken = search.get(URL_PARAM_ACCESS_TOKEN);
  const context = search.get(CONTEXT_KEY);
  const mappedInvoices = useSelector(mappedInvoicesSelector);
  const paymentMethod = useSelector(selectedPaymentMethodSelector);
  const scheduleDate = useSelector(scheduleDateSelector);

  useEffect(() => {
    return () => {
      if (sessionStorage.getItem(SCHEDULE_3DS_STATE_KEY)) {
        return;
      }

      sessionStorage.removeItem(SCHEDULE_PAYMENT_AGREEMENT_KEY);
      sessionStorage.removeItem(SCHEDULE_PAYMENT_CVV_KEY);
      dispatch(clearScheduleDate());
    };
  }, [dispatch]);

  const clearURLparamsAndState = useCallback(
    (clearStoredState = true) => {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('id');
      newUrl.searchParams.delete('context');
      newUrl.searchParams.delete('v_ref');
      newUrl.searchParams.delete('pmk');
      newUrl.searchParams.delete('pmt');
      newUrl.searchParams.delete('pmn');
      newUrl.searchParams.delete('pmvf');
      newUrl.searchParams.delete('pmvt');
      window.history.replaceState(
        window.history.state,
        document.title,
        newUrl.toString(),
      );
      sessionStorage.removeItem(SCHEDULE_3DS_REDIRECT_CURRENCY_KEY);
      if (clearStoredState) {
        sessionStorage.removeItem(SCHEDULE_PAYMENT_AGREEMENT_KEY);
        sessionStorage.removeItem(SCHEDULE_PAYMENT_CVV_KEY);
        dispatch(clearScheduleDate());
        dispatch(clearMappedInvoices());
        dispatch(clearSelectedPaymentMethod());
      }
    },
    [dispatch],
  );

  useEffect(() => {
    if (soldTo !== undefined) {
      dispatch(setSoldTo(soldTo));
    }
    if (payer !== undefined) {
      dispatch(setPayer(payer));
    }
  }, [soldTo, payer]);

  useEffect(() => {
    const { paymentAmount } = location.state || {};
    if (paymentAmount && paymentAmount > 0) {
      setAmountToPay(paymentAmount);
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      setAmountToPay(0);
      return;
    }

    const { payTotal, credit } = data.reduce(
      (acc, { invoiceStatus, paymentAmount = 0 }) => {
        if (invoiceStatus === 'Credit') acc.credit += paymentAmount;
        else acc.payTotal += paymentAmount;
        return acc;
      },
      { payTotal: 0, credit: 0 },
    );

    setAmountToPay(payTotal - credit);
  }, [location.state]);

  useEffect(() => {
    if (!accessToken || hasProcessedReturn.current) return;

    hasProcessedReturn.current = true;

    if (context === 'schedulepayment') {
      const handleAsync = async () => {
        try {
          if (!selectedAccount?.primaryAcct) {
            throw new Error('Selected account is required');
          }

          const { cardinalData, vRef, v_ref } =
            await get3DSAuthenticationResult({ accessToken });
          const urlPaymentMethod = getPaymentMethodFromSearch(search);
          const resolvedPaymentMethod = paymentMethod ?? urlPaymentMethod;
          const storedVRef =
            sessionStorage.getItem('payment.vRef') || undefined;
          sessionStorage.removeItem('payment.vRef');

          const response = await postScheduledPayment(
            selectedAccount.primaryAcct,
            payer || selectedPayer,
            mappedInvoices,
            cardinalData,
            resolvedPaymentMethod,
            undefined,
            impersonatedUserId,
            scheduleDate ?? '',
            accessToken,
            vRef || v_ref || storedVRef || undefined,
            selectedAccount.companyCode,
          );

          if (response.messageType?.toLowerCase() === 's') {
            const match = response.line?.match(/ID\s+(\d+)/);
            const newId = match ? match[1].replace(/^0+/, '') : null;
            const storedRedirectCurrency = sessionStorage.getItem(
              SCHEDULE_3DS_REDIRECT_CURRENCY_KEY,
            );
            const scheduledCurrency =
              storedRedirectCurrency ||
              mappedInvoices[0]?.currencyKey ||
              search.get('currency') ||
              'USD';

            showToastMessage('success', 'Payment scheduled successfully');
            navigate(
              `/scheduleddetails?tab=scheduled&currency=${encodeURIComponent(
                scheduledCurrency,
              )}${newId ? `&newId=${newId}` : ''}`,
            );
            clearURLparamsAndState();
          } else {
            showToastMessage(
              'error',
              response.messageLineString ||
                response.line ||
                'Failed to schedule payment',
            );
            clearURLparamsAndState(false);
          }
        } catch {
          showToastMessage(
            'error',
            'Failed to schedule payment. Please try again.',
          );
          clearURLparamsAndState(false);
        }
      };
      handleAsync();
    } else {
      processHostedAddPaymentMethodCallback();
    }
  }, [
    accessToken,
    context,
    get3DSAuthenticationResult,
    postScheduledPayment,
    selectedAccount?.primaryAcct,
    payer,
    selectedPayer,
    mappedInvoices,
    paymentMethod,
    impersonatedUserId,
    scheduleDate,
    showToastMessage,
    navigate,
    processHostedAddPaymentMethodCallback,
    clearURLparamsAndState,
  ]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (
      selectedAccount?.primaryAcct &&
      selectedAccount.primaryAcct !== prevAccountId.current
    ) {
      prevAccountId.current = selectedAccount.primaryAcct;
      navigate('/scheduleddetails');
    }
  }, [selectedAccount]);

  const hasRun = useRef(false);
  useEffect(() => {
    if (!hasRun.current && canMakePayment && data && data.length > 0) {
      hasRun.current = true;
      const invoicesData: Invoice[] = [];
      data.map((invoice, i) => {
        invoicesData.push({
          ...invoice,
          uid: `${invoice.billingDocumentNumber}-${i}`,
          index: i,
          isAmountError: false,
          amountErrorMessage: '',
          reason: invoice.reason ?? '',
          isReasonError: false,
          reasonErrorMessage: f('payment.reasonrequired'),
          description: invoice.description ?? '',
          isDescriptionError: false,
          paymentAmount: invoice.paymentAmount ?? invoice.openAmount ?? 0,
          descriptionErrorMessage: f('payment.descriptionrequired'),
        } as Invoice);
      });
      setInvoices(invoicesData);
    }
  }, [canMakePayment, data, f]);

  const dataChange = (invoice: Invoice) => {
    let updatedInvoices = invoices.map((item: Invoice) =>
      item.billingDocumentNumber === invoice.billingDocumentNumber
        ? invoice
        : item,
    );

    updatedInvoices = updatedInvoices.map((item: Invoice) => ({
      ...item,
      paymentAmount: parseFloat(String(item.paymentAmount ?? '0')),
    }));
    const total = updatedInvoices.reduce(
      (total, current) => total + (current.paymentAmount ?? 0),
      0,
    );

    setInvoices(updatedInvoices);
    setAmountToPay(total);
    dispatch(setSelectedInvoices(updatedInvoices));
  };

  const handleRemoveInvoice = (payload: Invoice | string) => {
    const uid = typeof payload === 'string' ? payload : payload?.uid;
    if (!uid) return;

    setInvoices((prev) => {
      const updated = prev.filter((i) => i.uid !== uid);
      const total = updated.reduce(
        (sum, item) => sum + (Number(item.paymentAmount) || 0),
        0,
      );
      setAmountToPay(total);
      dispatch(setSelectedInvoices(updated));
      return updated;
    });
  };

  const validateInvoiceData = () =>
    paymentInvoiceListRef.current?.validateAll() ?? false;

  return (
    <Box
      id="schedule-payment-page"
      sx={{
        flexGrow: 1,
        marginTop: '1rem',
        position: 'relative',
        pointerEvents: paymentConfig?.isPaymentDisabled ? 'none' : 'auto',
      }}
    >
      {paymentConfig?.isPaymentDisabled && (
        <Box id="schedule-payment-disabled">
          <Typography variant="body1" color="error">
            {f('payment.disabled')}
          </Typography>
        </Box>
      )}
      <Grid
        id="schedule-payment-box"
        container
        flexDirection="column"
        rowGap="2rem"
      >
        <Grid
          container
          spacing={{ xs: 2, sm: 0 }}
          sx={{ minHeight: '56px', alignItems: 'flex-start' }}
        >
          <EpayPageHeaderText
            header={f('header.schedule_payment')}
            subheader=""
          />
        </Grid>

        <Grid
          container
          flexDirection="row"
          sm={12}
          md={12}
          lg={12}
          sx={{ minWidth: '100%' }}
        >
          <Grid
            item
            container
            sm={12}
            md={8}
            lg={8}
            sx={{
              paddingBottom: '1rem',
              paddingRight: { xs: 0, md: '12px' },
            }}
          >
            <EpayBox sx={{ padding: '0px', minWidth: '100%' }}>
              <Grid item container sm={12} md={12} lg={12} direction={'column'}>
                <Grid
                  item
                  sx={{
                    borderBottom: '1px solid',
                    borderBottomColor: '#E0E0E0',
                    padding: '1rem 1.3rem',
                    height: '51px',
                  }}
                >
                  <Typography
                    variant="h5"
                    align="left"
                    sx={{ color: '#0D0D12' }}
                  >
                    {f('header.invoices')}
                  </Typography>
                </Grid>

                <Grid
                  item
                  sx={{
                    backgroundColor: '#F8F9F9',
                    borderRadius: '8px',
                    borderColor: '#DFE1E6 !important',
                    border: '1px solid',
                    margin: '20px',
                  }}
                  sm={12}
                  md={12}
                  lg={12}
                >
                  <PaymentInvoiceList
                    ref={paymentInvoiceListRef}
                    invoices={invoices}
                    config={paymentConfig}
                    currencyOptions={currencyOptions}
                    onChange={dataChange}
                    canDelete={invoices.length !== 1}
                    handleRemoveInvoice={handleRemoveInvoice}
                  />
                </Grid>
              </Grid>
            </EpayBox>
          </Grid>
          <Grid
            item
            container
            sm={12}
            md={4}
            lg={4}
            sx={{
              paddingBottom: '1rem',
              paddingLeft: { xs: 0, md: '12px' },
            }}
          >
            <PaymentScheduler
              data={invoices}
              config={paymentConfig}
              payer={payer || selectedPayer}
              currencyKey={currencyOptions[0]?.code || 'USD'}
              validateInvoiceData={validateInvoiceData}
              payTotal={amountToPay}
              selectedAccount={selectedAccount?.primaryAcct}
              userId={impersonatedUserId}
            />
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}
