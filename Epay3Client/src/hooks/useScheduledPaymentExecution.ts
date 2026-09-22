import { useEpayToast } from 'providers/EpayToastProvider';
import { useEpayLoading } from 'providers/EpayLoadingProvider';
import { useAppDispatch, useAppSelector } from 'redux/hooks';
import {
  addressSelector,
  clearAddressValidation,
  editAddressValidation,
  impersonatedUserSelector,
  setAddressValidationErrorMessage,
  setAddressValidationIsComplete,
  setAddressValidationIsEditable,
  setAddressValidationIsExpanded,
  setMappedInvoices,
  setPaymentMethodIsCreditCard,
  setPaymentMethodIsComplete,
  setPaymentMethodIsEditable,
  setPaymentMethodIsExpanded,
  setSelectedPaymentMethod as setPaymentMethod,
  setScheduleDate as setSelectedScheduleDate,
} from 'redux/reducers';
import {
  selectAddressValidationOptions,
  selectEnablePreAuth,
  selectIsCVVAllowedFromCustomConfig,
  selectPaymentProviders,
} from 'redux/selectors/configSelectors';
import { EpayPaymentService } from 'services/EpayPaymentService';
import { Invoice } from 'types/InvoicesSearchRequest';
import {
  AddressData,
  PayerDetails,
  PaymentCardSubmission,
  PaymentMethod,
} from 'types/Payment';
import { ThreeDSCardinalData } from 'types/AccountResponse';
import CompanyCodeDetail from 'types/SapConfig/CompanyCodeDetail';
import { formatError } from 'utilities/utilities';
import useEpayNavigate from 'hooks/useEpayNavigate';
import { useEffectiveAccount } from 'hooks/usePaymentHelpers';
import {
  getActiveWorldpayProvider,
  getSecure3dsVersion,
  shouldRun3DSForPaymentMethod,
} from 'utilities/paymentProvider3ds';
import {
  ADDRESS_VALIDATION_OFF,
  ADDRESS_VALIDATION_ZIP,
  PaymentTypes,
} from 'constants/UiOptions';
import { CardOperationResponse } from 'types/Payed';
import { useFormat } from 'hooks/useFormat';

export const SCHEDULE_3DS_STATE_KEY = 'schedule-payment-3ds-state';
export const SCHEDULE_3DS_REDIRECT_CURRENCY_KEY =
  'schedule-payment-3ds-redirect-currency';
export const SCHEDULE_PAYMENT_AGREEMENT_KEY =
  'schedule-payment-agreement-confirmed';
export const SCHEDULE_PAYMENT_CVV_KEY = 'schedule-payment-cvv';

const extractPreAuthenticationValidationErrors = (
  response: CardOperationResponse,
) => {
  const preAuth = response.pre_auth;
  const responseMessage = response.message_line_string?.trim() || '';
  const hasRcavr = Boolean(preAuth?.rcavr?.trim());
  const hasRccvv = Boolean(preAuth?.rccvv?.trim());

  return {
    addressValidationErrorMessage: hasRcavr ? responseMessage : '',
    cvvValidationErrorMessage: hasRccvv ? responseMessage : '',
  };
};

export interface UseScheduledPaymentExecutionOptions {
  payer: string;
  currencyKey: string;
  selectedAccount: string | undefined;
  userId: string | undefined;
  data: Invoice[];
  payTotal: number;
  validateInvoiceData?: () => boolean;
  selectedPaymentMethod: PaymentMethod | null;
  cvv: string;
  scheduleDate: string;
  userEnteredAmount: number;
  companyCodeDetail: CompanyCodeDetail | undefined;
  onSetSelectedPaymentMethod: (method: PaymentMethod) => void;
  onSetCvv: (cvv: string) => void;
  onSetCvvErrorMessage: (msg: string) => void;
}

export interface UseScheduledPaymentExecutionReturn {
  handlePaymentMethodComplete: (
    paymentMethod: PaymentMethod,
    cardValidationCode: string,
  ) => Promise<void>;
  handleSchedulePayment: () => Promise<void>;
  validateForm: () => boolean;
  handleAddressValidation: () => Promise<void>;
  handleClearAddressValidation: () => void;
  handleEditAddressValidation: (sectionType: string) => void;
}

export function useScheduledPaymentExecution({
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
  onSetSelectedPaymentMethod,
  onSetCvv,
  onSetCvvErrorMessage,
}: UseScheduledPaymentExecutionOptions): UseScheduledPaymentExecutionReturn {
  const f = useFormat();
  const dispatch = useAppDispatch();
  const loadingCtx = useEpayLoading();
  const { showToastMessage } = useEpayToast();
  const { navigate } = useEpayNavigate();

  const postScheduledPayment = EpayPaymentService.usePostScheduledPayment();
  const doPreAuthentication = EpayPaymentService.DoPreAuthentication();
  const getAccessToken = EpayPaymentService.useGetAccessToken();
  const paymetric3DSCheck = EpayPaymentService.useGetPaymetric3DSCheck();
  const get3DSAuthenticationResult =
    EpayPaymentService.useGet3DSAuthenticationResult();

  const isCVVAllowed = useAppSelector(selectIsCVVAllowedFromCustomConfig);
  const addressValidationOptions = useAppSelector(
    selectAddressValidationOptions,
  );
  const enablePreAuth = useAppSelector(selectEnablePreAuth);
  const paymentProviders = useAppSelector(selectPaymentProviders);
  const impersonatedUser = useAppSelector(impersonatedUserSelector);

  const {
    addressInputValue,
    cityInputValue,
    stateInputValue,
    zipcodeInputValue,
    addressValidationIsExpanded,
    addressValidationIsComplete,
    addressValidationIsEditable,
    paymentMethodIsExpanded,
    paymentMethodIsComplete,
    paymentMethodIsEditable,
    paymentMethodIsCreditCard,
  } = useAppSelector(addressSelector);

  const selectedPayerAccount = useEffectiveAccount();
  const paymentProvider = getActiveWorldpayProvider(paymentProviders);
  const impersonatedUserId = impersonatedUser
    ? impersonatedUser.userId
    : undefined;

  const doPreAuthenticationIfRequired = async (
    paymentMethod: PaymentMethod,
    cardValidationCode: string,
    shouldPreAuthenticate: boolean,
    isFromAddressValidation = false,
  ): Promise<boolean> => {
    const isStripeCard = Boolean(
      paymentMethod?.token?.startsWith('pm_') ||
      paymentMethod?.token?.startsWith('tok_') ||
      paymentMethod?.key?.startsWith('pm_')
    );
    if (!shouldPreAuthenticate || isStripeCard) {
      return true;
    }

    const payerAccountDetails: PayerDetails = {
      customerNumber: payer,
      companyCode: selectedPayerAccount?.companyCode ?? '',
      paymentCards: [],
    };

    const requestPaymentMethod: PaymentCardSubmission = {
      paymentCardType:
        paymentMethod.sapCardType || paymentMethod.cardType || '',
      paymentCardToken: paymentMethod.token || '',
      paymentCardName: paymentMethod.name,
      validFrom: paymentMethod.validFrom || '',
      validTo: paymentMethod.validTo || '',
      default: paymentMethod.default ? 'X' : '',
      cardValidationCode: isCVVAllowed ? cardValidationCode : '',
    };

    const isAVSIsFulLAddressLevel =
      addressValidationOptions?.toLowerCase() !== ADDRESS_VALIDATION_OFF &&
      addressValidationOptions?.toLowerCase() !== ADDRESS_VALIDATION_ZIP;

    const requestAddressData: AddressData = {
      name: isAVSIsFulLAddressLevel ? addressInputValue : '',
      name2: '',
      city: isAVSIsFulLAddressLevel ? cityInputValue : '',
      district: '',
      street: '',
      postalCodeCity: zipcodeInputValue,
      region: isAVSIsFulLAddressLevel ? stateInputValue : '',
      country: '',
    };

    try {
      const response = await doPreAuthentication(
        payerAccountDetails,
        requestPaymentMethod,
        impersonatedUserId,
        isFromAddressValidation ? requestAddressData : undefined,
      );

      const isAmexPreAuthAllowedResponse =
        paymentMethod.cardType === 'AMEX' &&
        response.message_type?.toLowerCase() === 'e' &&
        response.message_number?.toString() === '102' &&
        response.message_line_string?.includes(
          'Payment card CCINS AMEX preauthorization call not allowed',
        );

      if (
        response.message_type?.toLowerCase() !== 's' &&
        !isAmexPreAuthAllowedResponse
      ) {
        const isValidationFailureResponse =
          response.message_type?.toLowerCase() === 'e';
        const { addressValidationErrorMessage, cvvValidationErrorMessage } =
          isValidationFailureResponse
            ? extractPreAuthenticationValidationErrors(response)
            : {
                addressValidationErrorMessage: '',
                cvvValidationErrorMessage: '',
              };

        if (addressValidationErrorMessage) {
          onSetCvvErrorMessage('');
          dispatch(
            setAddressValidationErrorMessage(addressValidationErrorMessage),
          );
          dispatch(setAddressValidationIsExpanded(true));
          dispatch(setAddressValidationIsEditable(false));
          return false;
        }

        if (cvvValidationErrorMessage) {
          dispatch(setAddressValidationErrorMessage(''));
          dispatch(setAddressValidationIsExpanded(false));
          dispatch(setPaymentMethodIsEditable(false));
          dispatch(setPaymentMethodIsExpanded(true));
          onSetCvvErrorMessage(cvvValidationErrorMessage);
          return false;
        }

        if (isFromAddressValidation) {
          dispatch(
            setAddressValidationErrorMessage(f('avs.page.address.nomatch')),
          );
          dispatch(setAddressValidationIsExpanded(true));
          dispatch(setAddressValidationIsEditable(false));
        } else {
          dispatch(setAddressValidationErrorMessage(''));
          dispatch(setAddressValidationIsExpanded(false));
          dispatch(setPaymentMethodIsEditable(false));
          dispatch(setPaymentMethodIsExpanded(true));
          onSetCvvErrorMessage(f('payment.cvvnomatch'));
        }
        return false;
      }

      dispatch(setAddressValidationErrorMessage(''));
      onSetCvvErrorMessage('');
      return true;
    } catch {
      showToastMessage('error', 'Failed the pre-authentication check');
      return false;
    }
  };

  const handlePaymentMethodComplete = async (
    paymentMethod: PaymentMethod,
    cardValidationCode: string,
  ): Promise<void> => {
    const isCreditCard = paymentMethod.cardType !== PaymentTypes.EC;
    const isAddressValidationOff =
      addressValidationOptions?.toLowerCase() === ADDRESS_VALIDATION_OFF;

    onSetSelectedPaymentMethod(paymentMethod);
    onSetCvv(cardValidationCode);
    onSetCvvErrorMessage('');
    dispatch(setPaymentMethodIsCreditCard(isCreditCard));

    dispatch(setPaymentMethodIsComplete(true));
    dispatch(setPaymentMethodIsEditable(true));
    dispatch(setPaymentMethodIsExpanded(false));

    if (!isCreditCard) {
      dispatch(clearAddressValidation('Check'));
      dispatch(setAddressValidationIsExpanded(false));
      dispatch(setAddressValidationIsComplete(true));
      return;
    }

    const isStripeCard = Boolean(
      paymentMethod?.token?.startsWith('pm_') ||
      paymentMethod?.token?.startsWith('tok_') ||
      paymentMethod?.key?.startsWith('pm_')
    );

    if (isStripeCard) {
      dispatch(setAddressValidationIsExpanded(false));
      dispatch(setAddressValidationIsComplete(true));
      return;
    }

    const validationRequired =
      enablePreAuth && !isAddressValidationOff && !addressValidationIsComplete;
    const preAuthenticationRequired =
      enablePreAuth && isAddressValidationOff && isCVVAllowed;

    if (validationRequired) {
      dispatch(setAddressValidationIsExpanded(true));
      dispatch(setAddressValidationIsComplete(false));
      return;
    }

    if (!preAuthenticationRequired) {
      dispatch(setAddressValidationIsExpanded(false));
      dispatch(setAddressValidationIsComplete(true));
      return;
    }

    const isPreAuthenticationSuccessful = await doPreAuthenticationIfRequired(
      paymentMethod,
      cardValidationCode,
      preAuthenticationRequired,
    );

    if (isPreAuthenticationSuccessful) {
      dispatch(setAddressValidationErrorMessage(''));
      dispatch(setAddressValidationIsExpanded(false));
      dispatch(setAddressValidationIsComplete(true));
    } else {
      dispatch(setAddressValidationIsExpanded(true));
    }
  };

  const get3DSVersion = (three3DSversion: string): string => {
    const cardType = selectedPaymentMethod?.cardType;
    return cardType === PaymentTypes.EC ? '' : three3DSversion;
  };

  const build3DSReturnUri = (path: string): string => {
    const url = new URL(
      `${window.location.protocol}//${window.location.host}${path}`,
    );

    if (!selectedPaymentMethod?.key) {
      return url.toString();
    }

    url.searchParams.set('pmk', selectedPaymentMethod.key);
    url.searchParams.set('pmt', selectedPaymentMethod.cardType || '');
    url.searchParams.set('pmn', selectedPaymentMethod.name || 'Card');

    if (selectedPaymentMethod.validFrom) {
      url.searchParams.set('pmvf', selectedPaymentMethod.validFrom);
    }
    if (selectedPaymentMethod.validTo) {
      url.searchParams.set('pmvt', selectedPaymentMethod.validTo);
    }

    return url.toString();
  };

  const save3DSStateSnapshot = (): void => {
    sessionStorage.setItem(
      SCHEDULE_3DS_STATE_KEY,
      JSON.stringify({
        addressInputValue,
        cityInputValue,
        stateInputValue,
        zipcodeInputValue,
        addressValidationIsExpanded,
        addressValidationIsComplete,
        addressValidationIsEditable,
        paymentMethodIsExpanded,
        paymentMethodIsComplete,
        paymentMethodIsEditable,
        paymentMethodIsCreditCard,
      }),
    );
  };

  const finalizeScheduledPayment = async (
    mappedInvoices: Invoice[],
    cardinalData: ThreeDSCardinalData | null | undefined,
    vRef?: string,
  ): Promise<void> => {
    try {
      const response = await postScheduledPayment(
        selectedAccount ?? '',
        payer,
        mappedInvoices,
        cardinalData ?? undefined,
        selectedPaymentMethod,
        vRef ? undefined : cvv,
        userId,
        scheduleDate,
        undefined,
        vRef,
        selectedPayerAccount?.companyCode ?? '',
      );

      if (response.messageType && response.messageType.toLowerCase() === 's') {
        const match = response.line?.match(/ID\s+(\d+)/);
        let newId = match ? match[1] : null;
        if (newId) {
          newId = newId.replace(/^0+/, '');
        }
        showToastMessage('success', 'Payment scheduled successfully');
        sessionStorage.removeItem(SCHEDULE_3DS_STATE_KEY);
        sessionStorage.removeItem(SCHEDULE_3DS_REDIRECT_CURRENCY_KEY);
        sessionStorage.removeItem(SCHEDULE_PAYMENT_AGREEMENT_KEY);
        sessionStorage.removeItem(SCHEDULE_PAYMENT_CVV_KEY);
        dispatch(setSelectedScheduleDate(''));
        navigate(
          `/scheduleddetails?tab=scheduled&currency=${encodeURIComponent(
            currencyKey,
          )}${newId ? `&newId=${newId}` : ''}`,
        );
      } else {
        showToastMessage(
          'error',
          response.messageLineString ||
            response.line ||
            'Failed to schedule payment',
        );
      }
    } catch {
      showToastMessage(
        'error',
        'Failed to schedule payment. Please try again.',
      );
    }
  };

  const validateForm = (): boolean => {
    const isCvvValid =
      selectedPaymentMethod?.cardType === 'EC' || !isCVVAllowed || Boolean(cvv);
    const isAddressValid =
      selectedPaymentMethod?.cardType === 'EC' ||
      !enablePreAuth ||
      addressValidationIsComplete;
    return (
      paymentMethodIsComplete &&
      isAddressValid &&
      Boolean(scheduleDate) &&
      userEnteredAmount > 0 &&
      isCvvValid
    );
  };

  const handleSchedulePayment = async (): Promise<void> => {
    if (validateInvoiceData) {
      const isValid = validateInvoiceData();
      if (!isValid) {
        return;
      }
    }
    if (!validateForm()) {
      return;
    }

    try {
      if (!selectedPaymentMethod) {
        showToastMessage('error', f('payment.pay_with'));
        return;
      }

      if (!selectedAccount) {
        showToastMessage('error', 'No account selected. Please try again.');
        return;
      }

      let mappedInvoices: Invoice[] = [];

      if (data && data.length > 0) {
        mappedInvoices = data.map((invoice: Invoice) => {
          const mappedInvoice = (({
            documentNumberFinance,
            lineItemInTheRelevantInvoice,
            fiscalYearOfTheRelevantInvoice,
            openAmount,
            paymentAmount,
            currencyKey,
            reason,
            description,
            referenceNumber,
            billingDocumentNumber,
            documentDate,
            soldtoNumber,
          }) => ({
            documentNumberFinance,
            lineItemInTheRelevantInvoice,
            fiscalYearOfTheRelevantInvoice,
            openAmount,
            paymentAmount,
            currencyKey,
            reason,
            description,
            referenceNumber,
            billingDocumentNumber,
            documentDate,
            soldtoNumber,
            payerNumber: payer,
          }))(invoice);
          return mappedInvoice;
        });
      }

      const shouldRun3DS = shouldRun3DSForPaymentMethod(
        selectedPaymentMethod?.cardType,
        paymentProvider,
        companyCodeDetail?.is3dsDisabled,
      );

      if (shouldRun3DS) {
        const secure3dsVersion = getSecure3dsVersion(paymentProvider);
        if (!secure3dsVersion) {
          showToastMessage(
            'error',
            '3DS is enabled but secure3dsVersion is not configured',
          );
          return;
        }

        dispatch(setMappedInvoices(mappedInvoices));
        dispatch(setPaymentMethod(selectedPaymentMethod));
        dispatch(setSelectedScheduleDate(scheduleDate));
        save3DSStateSnapshot();
        sessionStorage.setItem(SCHEDULE_3DS_REDIRECT_CURRENCY_KEY, currencyKey);

        const xiPlugin = window.$XIPlugin as {
          createJSRequestPacket: (
            merchantId: string,
            accessToken: string,
          ) => {
            addField: (field: unknown) => void;
          };
          createField: (
            name: string,
            secure: boolean,
            value: string,
          ) => unknown;
        };

        getAccessToken(
          selectedAccount,
          payer,
          selectedPaymentMethod.key,
          data[0]?.currencyKey || 'en',
          build3DSReturnUri('/payment/scheduled?context=schedulepayment'),
          payTotal,
          selectedPaymentMethod,
          impersonatedUserId,
          cvv,
        ).then(
          (accessResp) => {
            const paymetricData = xiPlugin.createJSRequestPacket(
              accessResp.merchantId,
              accessResp.accessToken,
            );

            paymetricData.addField(xiPlugin.createField('PAYMET', false, 'CC'));
            paymetricData.addField(
              xiPlugin.createField(
                'CCINS',
                false,
                selectedPaymentMethod.gatewayCardType!,
              ),
            );
            paymetricData.addField(
              xiPlugin.createField(
                'CCNUM',
                true,
                selectedPaymentMethod.token || selectedPaymentMethod.key,
              ),
            );

            if (accessResp.vRef) {
              sessionStorage.setItem('payment.vRef', accessResp.vRef);
            }

            loadingCtx.increment();
            paymetric3DSCheck(
              accessResp.paymetricUrl,
              paymetricData,
              get3DSVersion(secure3dsVersion),
            )
              .then(
                () => {
                  get3DSAuthenticationResult(accessResp).then(
                    (resp) => {
                      finalizeScheduledPayment(
                        mappedInvoices,
                        resp.cardinalData,
                        accessResp?.vRef,
                      );
                    },
                    (error) => {
                      const errorObject = formatError(error);
                      showToastMessage(
                        'error',
                        errorObject.message_line_string || '',
                      );
                    },
                  );
                },
                (error) => {
                  showToastMessage('error', error);
                },
              )
              .catch((error) => {
                showToastMessage('error', error);
              })
              .finally(() => {
                loadingCtx.decrement();
              });
          },
          (error) => {
            showToastMessage('error', error);
          },
        );
      } else {
        finalizeScheduledPayment(mappedInvoices, null);
      }
    } catch {}
  };

  const handleAddressValidation = async (): Promise<void> => {
    if (!selectedPaymentMethod) {
      return;
    }

    const isPreAuthenticationSuccessful = await doPreAuthenticationIfRequired(
      selectedPaymentMethod,
      cvv,
      true,
      true,
    );

    if (!isPreAuthenticationSuccessful) {
      return;
    }

    dispatch(setAddressValidationErrorMessage(''));
    dispatch(setAddressValidationIsComplete(true));
    dispatch(setAddressValidationIsExpanded(false));
    dispatch(setPaymentMethodIsEditable(true));
    dispatch(setAddressValidationIsEditable(true));
  };

  const handleClearAddressValidation = (): void => {
    dispatch(setAddressValidationErrorMessage(''));
    dispatch(clearAddressValidation());
    dispatch(setPaymentMethodIsEditable(false));
  };

  const handleEditAddressValidation = (sectionType: string): void => {
    dispatch(editAddressValidation(sectionType));
  };

  return {
    handlePaymentMethodComplete,
    handleSchedulePayment,
    validateForm,
    handleAddressValidation,
    handleClearAddressValidation,
    handleEditAddressValidation,
  };
}
