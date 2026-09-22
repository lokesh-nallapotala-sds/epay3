import { useEffect, useRef, useState } from 'react';

import Ability from 'types/Ability';
import EpayBox from 'shared/components/EpayBox';
import useEpayNavigate from 'hooks/useEpayNavigate';
import { Box, Grid, Typography } from '@mui/material';
import { Invoice } from 'types/InvoicesSearchRequest';
import { CurrencySymbols } from 'constants/CurrencySymbols';
import { useAppDispatch, useAppSelector } from 'redux/hooks';
import { usePayerDetails } from 'providers/PayerDetailsProvider';
import { usePaymentMethodAction } from 'hooks/usePaymentMethodAction';
import EpayPageHeaderText from 'shared/components/EpayPageHeaderText';
import {
  selectedInvoicesSelector,
  setPayer,
  setSelectedInvoices,
  setSoldTo,
  userHasAbility,
  selectUserState as userSelector,
} from 'redux/reducers';
import { selectPaymentConfig } from 'redux/selectors/configSelectors';

import Payments from './Payments';
import PaymentInvoiceList, {
  PaymentInvoiceListHandle,
} from './PaymentInvoiceList';
import { DEFAULT_CURRENCY } from '../../constants/UiOptions';
import { useFormat } from 'hooks/useFormat';

export default function PaymentComponent() {
  const { location } = useEpayNavigate();
  const f = useFormat();

  const dispatch = useAppDispatch();
  const { effectivePayer } = usePayerDetails();

  const { processHostedAddPaymentMethodCallback } = usePaymentMethodAction({
    onSuccess: () => {},
  });

  const user = useAppSelector(userSelector);

  //TODO: we should be checking abilities (claims) rather than roles
  //-- but unfortunately the `User` object doesn't currently include these
  const canMakePayment = userHasAbility(user, Ability.MakePayment);

  const paymentConfig = useAppSelector(selectPaymentConfig) ?? undefined;

  const { soldTo, payer } = location.state || {};

  const data = useAppSelector(selectedInvoicesSelector);

  const [invoices, setInvoices] = useState<any[]>([]);
  const [, setIsValid] = useState(false);
  const paymentInvoiceListRef = useRef<PaymentInvoiceListHandle>(null);
  const [selectedCurrency] = useState<string>(DEFAULT_CURRENCY);
  const currencyOptions = invoices.map(
    (invoice: Invoice) =>
      CurrencySymbols[invoice?.currencyKey || selectedCurrency],
  );
  const [amountToPay, setAmountToPay] = useState<number>(0);
  const [selectedPaymentMethodType, setSelectedPaymentMethodType] =
    useState<string>('');
  const search = new URLSearchParams(location.search);
  const pmStatus = search.get('status');

  useEffect(() => {
    if (soldTo !== undefined) {
      dispatch(setSoldTo(soldTo));
    }
    if (payer !== undefined) {
      dispatch(setPayer(payer));
    }
  }, [soldTo, payer]);

  useEffect(() => {
    processHostedAddPaymentMethodCallback();
  }, [pmStatus]);

  const hasRun = useRef(false);
  useEffect(() => {
    if (!hasRun.current && canMakePayment && data && data.length > 0) {
      hasRun.current = true; // Mark as executed
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

  //Update the total amount
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

    // Update the state
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

  const validateInvoiceData = () => {
    const valid = paymentInvoiceListRef.current?.validateAll() ?? false;
    setIsValid(valid);
    return valid;
  };

  if (!user) {
    return null;
  }

  return (
    <Box
      id="make-payments-page"
      sx={{
        flexGrow: 1,
        marginTop: '1rem',
        position: 'relative',
        pointerEvents: paymentConfig?.isPaymentDisabled ? 'none' : 'auto',
      }}
    >
      {paymentConfig?.isPaymentDisabled && (
        <Box id="make-payments-disabled">
          <Typography variant="body1" color="error">
            {f('payment.disabled')}
          </Typography>
        </Box>
      )}
      <Grid
        id="make-payments-box"
        container
        flexDirection="column"
        rowGap="2rem"
      >
        <Grid
          container
          spacing={{ xs: 2, sm: 0 }}
          sx={{ minHeight: '56px', alignItems: 'flex-start' }}
        >
          <EpayPageHeaderText header={f('header.make_payments')} subheader="" />
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
                    paymentMethodType={selectedPaymentMethodType}
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
            <Payments
              data={invoices}
              isDeposit={false}
              payer={payer || effectivePayer}
              currencyKey={currencyOptions[0]?.code}
              validateInvoiceData={validateInvoiceData}
              setPaymentMethodType={setSelectedPaymentMethodType}
              payTotal={amountToPay}
            />
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}
