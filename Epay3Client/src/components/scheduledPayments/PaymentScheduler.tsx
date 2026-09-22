import { useCallback, useEffect, useState } from 'react';

import { Box, Grid } from '@mui/material';
import EpayBox from 'shared/components/EpayBox';
import { PaymentMethod, PaymentSchedulerParameters } from 'types/Payment';
import { useEpayToast } from 'providers/EpayToastProvider';
import EpayAccordion from 'shared/components/EpayAccordion';
import { EpayApplicationService } from '../../services/EpayApplicationService';
import { safeJsonParse } from '../../utilities/utilities';

import PaymentSummary from './PaymentSummary';
import PaymentMethodSelector from '../payment/PaymentMethodSelector';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  addressSelector,
  resetAddressConfirmationState,
  setAddressInputValue,
  setAddressValidationIsComplete,
  setAddressValidationIsEditable,
  setAddressValidationIsEnabled,
  setAddressValidationIsExpanded,
  setCityInputValue,
  setPaymentMethodIsCreditCard,
  setPaymentMethodIsComplete,
  setPaymentMethodIsEditable,
  setPaymentMethodIsExpanded,
  setSelectedPaymentMethod as setPersistedPaymentMethod,
  selectedPaymentMethodSelector,
  setStateInputValue,
  setZipcodeInputValue,
} from '../../redux/reducers';
import { scheduleDateSelector } from '../../redux/reducers/paymentSlice';
import {
  ADDRESS_VALIDATION_OFF,
  ADDRESS_VALIDATION_ZIP,
} from '../../constants/UiOptions';
import AddressZipValidation from '../payment/AddressZipValidation';
import AddressValidation from '../payment/AddressValidation';
import CompanyCodeDetail from '../../types/SapConfig/CompanyCodeDetail';
import { useEffectiveAccount } from '../../hooks/usePaymentHelpers';
import { useFormat } from 'hooks/useFormat';
import {
  selectAddressValidationOptions,
  selectEnablePreAuth,
} from '../../redux/selectors/configSelectors';
import {
  SCHEDULE_PAYMENT_AGREEMENT_KEY,
  SCHEDULE_3DS_STATE_KEY,
  useScheduledPaymentExecution,
} from '../../hooks/useScheduledPaymentExecution';

export default function PaymentScheduler({
  data,
  config,
  payer,
  payTotal = 0,
  currencyKey = 'USD',
  validateInvoiceData,
  selectedAccount,
  userId,
}: PaymentSchedulerParameters) {
  const f = useFormat();
  const dispatch = useAppDispatch();
  const { showToastMessage } = useEpayToast();

  const {
    addressValidationIsExpanded,
    addressValidationIsComplete,
    addressValidationIsEditable,
    paymentMethodIsExpanded,
    paymentMethodIsComplete,
    paymentMethodIsEditable,
    paymentMethodIsCreditCard,
  } = useAppSelector(addressSelector);
  const storedPaymentMethod = useAppSelector(selectedPaymentMethodSelector);
  const storedScheduleDate = useAppSelector(scheduleDateSelector);
  const addressValidationOptions = useAppSelector(
    selectAddressValidationOptions,
  );
  const enablePreAuth = useAppSelector(selectEnablePreAuth);

  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(storedPaymentMethod);
  const [cvv, setCvv] = useState<string>('');
  const [cvvErrorMessage, setCvvErrorMessage] = useState('');
  const [creditAmount, setCreditAmount] = useState<number>(0);
  const [scheduleDate, setScheduleDate] = useState<string>(
    storedScheduleDate ?? '',
  );
  const [agreeToSchedulePayment, setAgreeToSchedulePayment] = useState<boolean>(
    () => sessionStorage.getItem(SCHEDULE_PAYMENT_AGREEMENT_KEY) === 'true',
  );
  const [userEnteredAmount, setUserEnteredAmount] = useState<number>(0);
  const [amountToPay, setAmountToPay] = useState<number>(0);
  const [companyCodeDetail, setCompanyCodeDetail] =
    useState<CompanyCodeDetail>();

  const getCustomConfig = EpayApplicationService.useGetCustomConfig();
  const selectedPayerAccount = useEffectiveAccount();

  const {
    handlePaymentMethodComplete,
    handleSchedulePayment,
    handleAddressValidation,
    handleClearAddressValidation,
    handleEditAddressValidation,
  } = useScheduledPaymentExecution({
    payer,
    currencyKey,
    selectedAccount,
    userId,
    data,
    payTotal,
    validateInvoiceData,
    selectedPaymentMethod,
    cvv,
    scheduleDate,
    userEnteredAmount,
    companyCodeDetail,
    onSetSelectedPaymentMethod: setSelectedPaymentMethod,
    onSetCvv: setCvv,
    onSetCvvErrorMessage: setCvvErrorMessage,
  });

  const handlePaymentMethodChange = useCallback(
    (paymentMethod: PaymentMethod) => {
      setSelectedPaymentMethod((currentPaymentMethod) => {
        if (
          currentPaymentMethod?.token === paymentMethod.token &&
          currentPaymentMethod?.key === paymentMethod.key &&
          currentPaymentMethod?.name === paymentMethod.name &&
          currentPaymentMethod?.cardType === paymentMethod.cardType &&
          currentPaymentMethod?.validFrom === paymentMethod.validFrom &&
          currentPaymentMethod?.validTo === paymentMethod.validTo &&
          currentPaymentMethod?.default === paymentMethod.default
        ) {
          return currentPaymentMethod;
        }

        return paymentMethod;
      });
      if (paymentMethod.token && paymentMethod.token !== '-----') {
        dispatch(setPersistedPaymentMethod(paymentMethod));
      }
      setCvvErrorMessage('');
    },
    [dispatch],
  );

  useEffect(() => {
    const fetchCustomConfig = async () => {
      try {
        const config = await getCustomConfig();
        const detail = config.companyCodes.find(
          (code) => code.companyCode === selectedPayerAccount?.companyCode,
        );
        setCompanyCodeDetail(detail);
      } catch {
        showToastMessage('error', 'Failed to load custom configuration');
      }
    };

    fetchCustomConfig();
  }, [selectedPayerAccount?.companyCode]);

  useEffect(() => {
    const savedState = sessionStorage.getItem(SCHEDULE_3DS_STATE_KEY);
    if (!savedState) {
      dispatch(resetAddressConfirmationState());
      return;
    }

    try {
      const parsed = safeJsonParse<Record<string, unknown>>(savedState, {});
      dispatch(setAddressInputValue(String(parsed.addressInputValue || '')));
      dispatch(setCityInputValue(String(parsed.cityInputValue || '')));
      dispatch(setStateInputValue(String(parsed.stateInputValue || '')));
      dispatch(setZipcodeInputValue(String(parsed.zipcodeInputValue || '')));
      dispatch(
        setAddressValidationIsExpanded(
          Boolean(parsed.addressValidationIsExpanded),
        ),
      );
      dispatch(
        setAddressValidationIsComplete(
          Boolean(parsed.addressValidationIsComplete),
        ),
      );
      dispatch(
        setAddressValidationIsEditable(
          Boolean(parsed.addressValidationIsEditable),
        ),
      );
      dispatch(
        setPaymentMethodIsExpanded(Boolean(parsed.paymentMethodIsExpanded)),
      );
      dispatch(
        setPaymentMethodIsComplete(Boolean(parsed.paymentMethodIsComplete)),
      );
      dispatch(
        setPaymentMethodIsEditable(Boolean(parsed.paymentMethodIsEditable)),
      );
      dispatch(
        setPaymentMethodIsCreditCard(Boolean(parsed.paymentMethodIsCreditCard)),
      );
    } catch {
      dispatch(resetAddressConfirmationState());
    } finally {
      sessionStorage.removeItem(SCHEDULE_3DS_STATE_KEY);
    }
  }, [dispatch]);

  useEffect(() => {
    if (
      (!selectedPaymentMethod || selectedPaymentMethod.token === '-----') &&
      storedPaymentMethod
    ) {
      setSelectedPaymentMethod(storedPaymentMethod);
    }
  }, [selectedPaymentMethod, storedPaymentMethod]);

  useEffect(() => {
    if (addressValidationOptions) {
      dispatch(setAddressValidationIsEnabled(addressValidationOptions));
    }
  }, []);

  useEffect(() => {
    if (agreeToSchedulePayment) {
      sessionStorage.setItem(SCHEDULE_PAYMENT_AGREEMENT_KEY, 'true');
    } else {
      sessionStorage.removeItem(SCHEDULE_PAYMENT_AGREEMENT_KEY);
    }
  }, [agreeToSchedulePayment]);

  useEffect(() => {
    if (data && data.length > 0) {
      const credit = data
        .filter((invoice) => invoice.invoiceStatus === 'Credit')
        .reduce((sum, invoice) => sum + (invoice.paymentAmount || 0), 0);

      setCreditAmount(credit);
      setUserEnteredAmount(payTotal);

      if (credit && credit !== 0) {
        setAmountToPay(payTotal - credit);
      } else {
        setAmountToPay(payTotal);
      }
    }
  }, [data, payTotal]);

  return (
    <Box
      id="payment-scheduler"
      width="100%"
      sx={{
        minHeight: '100%',
        pointerEvents: config?.isPaymentDisabled ? 'none' : 'auto',
      }}
    >
      <Grid id="payment-scheduler-box">
        <EpayAccordion
          expandIcon={<></>}
          title={f('payment.method')}
          sectionType="Payment"
          sectionIsComplete={paymentMethodIsComplete}
          isExpanded={paymentMethodIsExpanded}
          isEditable={
            paymentMethodIsEditable &&
            (addressValidationIsEditable ||
              addressValidationOptions?.toLowerCase() ===
                ADDRESS_VALIDATION_OFF ||
              !paymentMethodIsCreditCard)
          }
          editIsSelected={handleEditAddressValidation}
        >
          <PaymentMethodSelector
            selectedMethod={selectedPaymentMethod}
            onMethodSelect={handlePaymentMethodChange}
            onMethodComplete={handlePaymentMethodComplete}
            externalCvvError={cvvErrorMessage}
            onClearExternalCvvError={() => setCvvErrorMessage('')}
            cvvValue={cvv}
            onCvvChange={setCvv}
            validateInvoiceData={validateInvoiceData}
            config={config}
            currencyKey={currencyKey}
            disableSessionMethods={true}
          />
        </EpayAccordion>

        {enablePreAuth &&
          addressValidationOptions?.toLowerCase() === ADDRESS_VALIDATION_ZIP &&
          selectedPaymentMethod &&
          selectedPaymentMethod.cardType !== 'EC' && (
            <AddressZipValidation
              handleAddressValidation={handleAddressValidation}
              editAddressValidation={handleEditAddressValidation}
              clearAddressValidation={handleClearAddressValidation}
            />
          )}

        {enablePreAuth &&
          addressValidationOptions?.toLowerCase() !== ADDRESS_VALIDATION_OFF &&
          addressValidationOptions?.toLowerCase() !== ADDRESS_VALIDATION_ZIP &&
          selectedPaymentMethod &&
          selectedPaymentMethod.cardType !== 'EC' && (
            <AddressValidation
              handleAddressValidation={handleAddressValidation}
              editAddressValidation={handleEditAddressValidation}
              clearAddressValidation={handleClearAddressValidation}
            />
          )}

        <Grid
          id="payment-action-box"
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            marginTop: '1rem',
          }}
        >
          <EpayBox>
            <Grid container item flexDirection="column" sm={12} md={12} lg={12}>
              <PaymentSummary
                payTotal={payTotal}
                amountToPay={amountToPay}
                currencyKey={currencyKey}
                data={data}
                paymentDate={scheduleDate}
                onPaymentDateChange={setScheduleDate}
                isPaymentMethodComplete={paymentMethodIsComplete}
                paymentMethodType={
                  selectedPaymentMethod?.cardType === 'EC'
                    ? 'echeck'
                    : 'creditcard'
                }
                creditAmount={creditAmount}
                onSchedulePayment={handleSchedulePayment}
                agreeToSchedulePayment={agreeToSchedulePayment}
                onAgreeToSchedulePaymentChange={setAgreeToSchedulePayment}
                isPaymentMethodExpanded={paymentMethodIsExpanded}
                isAddressValidationExpanded={addressValidationIsExpanded}
                isAddressValidationComplete={addressValidationIsComplete}
              />
            </Grid>
          </EpayBox>
        </Grid>
      </Grid>
    </Box>
  );
}
