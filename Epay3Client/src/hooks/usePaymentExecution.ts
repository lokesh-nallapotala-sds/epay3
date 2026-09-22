import { Invoice } from 'types';
import { DepositDetails } from 'types/DepositDetails';
import { ThreeDSCardinalData } from 'types/AccountResponse';
import { useEpayToast } from 'providers/EpayToastProvider';
import { useEpayLoading } from 'providers/EpayLoadingProvider';
import { useAppDispatch, useAppSelector } from 'redux/hooks';
import { EpayPaymentService } from 'services/EpayPaymentService';
import useEpayNavigate from 'hooks/useEpayNavigate';
import { useEffectiveAccount } from 'hooks/usePaymentHelpers';
import {
  AddressData,
  PayerDetails,
  PaymentCardSubmission,
  PaymentMethod,
} from 'types/Payment';
import {
  addressSelector,
  clearAddressValidation,
  clearDepositDetails,
  editAddressValidation,
  impersonatedUserSelector,
  setPayer as removeSelectedPayer,
  setSoldTo as removeSelectedSoldTo,
  setAddressValidationErrorMessage,
  setAddressValidationIsComplete,
  setAddressValidationIsEditable,
  setAddressValidationIsExpanded,
  setMappedInvoices,
  setSelectedPayer,
  setPaymentMethodIsComplete,
  setPaymentMethodIsEditable,
  setPaymentMethodIsExpanded,
  setSelectedInvoices,
  setSelectedPaymentMethod,
  selectUserState as userSelector,
} from 'redux/reducers';
import {
  selectAddressValidationOptions,
  selectCompanyCodes,
  selectConfigLoaded,
  selectEnablePreAuth,
  selectIsCVVAllowedFromCustomConfig,
  selectPaymentConfigLoaded,
  selectPaymentConfig,
  selectPaymentProviders,
} from 'redux/selectors/configSelectors';
import {
  getActiveWorldpayProvider,
  getSecure3dsVersion,
  shouldRun3DSForPaymentMethod,
} from 'utilities/paymentProvider3ds';
import {
  ADDRESS_VALIDATION_OFF,
  ADDRESS_VALIDATION_ZIP,
  DefaultPaymentMethod,
  PaymentTypes,
} from 'constants/UiOptions';
import {
  extractErrorMessage,
  removeIframeById,
  validateCvv,
} from 'utilities/utilities';
import { Deposit3dsRedirectSession } from 'utilities/deposit3dsRedirectSession';
import { useMemo } from 'react';
import { CardOperationResponse } from 'types/Payed';
import { clearPaymentSession3DS } from 'redux/reducers/paymentSlice';
import { useFormat } from 'hooks/useFormat';
import { getCsrfHeaders } from 'utilities/csrf';
import { getStripe } from '../stripe/stripeLoader';

export interface UsePaymentExecutionOptions {
  payer: string;
  currencyKey: string;
  isDeposit?: boolean;
  depositDetails?: DepositDetails | null;
  validateInvoiceData?: () => boolean;
  data: Invoice[];
  paymentCard: PaymentMethod;
  cvv: string;
  paymentTotal: number;
  payTotal: number;
  overPaymentTotal: number;
  onSetStartPay: (value: boolean) => void;
  onSetIsProcessing: (value: boolean) => void;
  onSetCvvError: (isError: boolean, message: string) => void;
}

export interface UsePaymentExecutionReturn {
  continueClick: () => void;
  handlePayment: () => Promise<void>;
  handleAddressValidation: () => Promise<void>;
  handleClearAddressValidation: () => void;
  handleEditAddressValidation: (sectionType: string) => void;
}

const isPositiveNumber = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n > 0;

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

export function usePaymentExecution({
  payer,
  currencyKey,
  isDeposit,
  depositDetails,
  validateInvoiceData,
  data,
  paymentCard,
  cvv,
  paymentTotal,
  payTotal,
  overPaymentTotal,
  onSetStartPay,
  onSetIsProcessing,
  onSetCvvError,
}: UsePaymentExecutionOptions): UsePaymentExecutionReturn {
  const f = useFormat();

  const dispatch = useAppDispatch();
  const loadingCtx = useEpayLoading();
  const { navigate } = useEpayNavigate();
  const { showToastMessage } = useEpayToast();

  const getAccessToken = EpayPaymentService.useGetAccessToken();
  const paymetric3DSCheck = EpayPaymentService.useGetPaymetric3DSCheck();
  const get3DSAuthenticationResult =
    EpayPaymentService.useGet3DSAuthenticationResult();
  const postPayment = EpayPaymentService.usePostPayment();
  const postDeposit = EpayPaymentService.usePostDeposit();
  const doPreAuthentication = EpayPaymentService.DoPreAuthentication();

  const selectedAccount = useEffectiveAccount();
  const impersonatedUser = useAppSelector(impersonatedUserSelector);
  const impersonatedUserId = impersonatedUser?.userId;
  const user = useAppSelector(userSelector);

  const config = useAppSelector(selectPaymentConfig) ?? undefined;
  const isCVVAllowed = useAppSelector(selectIsCVVAllowedFromCustomConfig);
  const isCVVValidationEnabled = useAppSelector(
    selectIsCVVAllowedFromCustomConfig,
  );
  const isOverPaymentAllowed = useAppSelector(
    (state) => state.config.overpaymentAllowed,
  );
  const configLoaded = useAppSelector(selectConfigLoaded);
  const paymentConfigLoaded = useAppSelector(selectPaymentConfigLoaded);
  const companyCodes = useAppSelector(selectCompanyCodes);
  const paymentProviders = useAppSelector(selectPaymentProviders);
  const addressValidationOptions = useAppSelector(
    selectAddressValidationOptions,
  );
  const enablePreAuth = useAppSelector(selectEnablePreAuth);

  const {
    addressInputValue,
    cityInputValue,
    stateInputValue,
    zipcodeInputValue,
    addressValidationIsComplete,
    paymentMethodIsCreditCard,
  } = useAppSelector(addressSelector);

  const activePaymentProvider = getActiveWorldpayProvider(paymentProviders);

  const companyCodeDetail = useMemo(
    () =>
      companyCodes?.find(
        (code) => code.companyCode === selectedAccount?.companyCode,
      ),
    [companyCodes, selectedAccount?.companyCode],
  );

  const get3DSVersion = (three3DSversion: string) =>
    paymentCard.cardType === PaymentTypes.EC ? '' : three3DSversion;

  const cleanupPaymentFlow = () => {
    dispatch(removeSelectedPayer(''));
    dispatch(removeSelectedSoldTo(''));
    removeIframeById('cardinal_iframe_post');
    clearPaymentSession3DS();
  };

  const cleanupDepositFlow = () => {
    dispatch(clearDepositDetails());
    Deposit3dsRedirectSession.clear();
    removeIframeById('cardinal_iframe_post');
    clearPaymentSession3DS();
  };

  const navigateToPaymentErrorReceipt = (
    invoices: Invoice[],
    error: unknown,
  ) => {
    cleanupPaymentFlow();
    navigate('/payment/session/receipt', {
      state: {
        invoices,
        responseData: {},
        payment: paymentCard,
        error: {
          isError: true,
          message: extractErrorMessage(error),
        },
      },
    });
  };

  const navigateToDepositErrorReceipt = (
    details: DepositDetails,
    error: unknown,
  ) => {
    cleanupDepositFlow();
    navigate('/payment/deposits/receipt', {
      state: {
        depositDetails: details,
        responseData: null,
        payment: paymentCard,
        error: {
          isError: true,
          message: extractErrorMessage(error),
        },
      },
    });
  };

  const build3DSReturnUri = (path: string, method: PaymentMethod) => {
    const url = new URL(
      `${window.location.protocol}//${window.location.host}${path}`,
    );
    if (!method?.key) return url.toString();
    url.searchParams.set('pmk', method.key);
    url.searchParams.set('pmt', method.cardType || '');
    url.searchParams.set('pmn', method.name || 'Card');
    if (method.cardLast4Digit) {
      url.searchParams.set('pml4', method.cardLast4Digit);
    }
    if (method.validFrom) url.searchParams.set('pmvf', method.validFrom);
    if (method.validTo) url.searchParams.set('pmvt', method.validTo);
    return url.toString();
  };

  const validateCard = () => {
    if (paymentCard.key === DefaultPaymentMethod.key) {
      showToastMessage('error', f('payment_methods.select_card'));
      return false;
    }
    if (isCVVAllowed && paymentCard.cardType !== PaymentTypes.EC) {
      if (cvv === '') {
        showToastMessage('error', f('payment.error.cvv_empty'));
        return false;
      }
      if (!validateCvv(paymentCard.cardType, cvv)) {
        showToastMessage('error', f('payment.invalidcvv'));
        return false;
      }
    }
    return true;
  };

  const doPreAuthenticationIfRequired = async (
    shouldPreAuthenticate: boolean,
    isFromAddressValidation = false,
  ): Promise<boolean> => {
    const isStripeCard = Boolean(
      paymentCard?.token?.startsWith('pm_') ||
      paymentCard?.token?.startsWith('tok_') ||
      paymentCard?.key?.startsWith('pm_')
    );
    if (!shouldPreAuthenticate || isStripeCard) return true;

    const payerAccountDetails: PayerDetails = {
      customerNumber: payer,
      companyCode: selectedAccount?.companyCode ?? '',
      paymentCards: [],
    };

    const requestPaymentMethod: PaymentCardSubmission = {
      paymentCardType: paymentCard.sapCardType || paymentCard.cardType || '',
      paymentCardToken: paymentCard.token || '',
      paymentCardName: paymentCard.name,
      validFrom: paymentCard.validFrom || '',
      validTo: paymentCard.validTo || '',
      default: paymentCard?.default ? 'X' : '',
      cardValidationCode: isCVVValidationEnabled ? cvv : '',
    };

    const isAVSIsFullAddressLevel =
      addressValidationOptions?.toLowerCase() !== ADDRESS_VALIDATION_OFF &&
      addressValidationOptions?.toLowerCase() !== ADDRESS_VALIDATION_ZIP;

    const requestAddressData: AddressData = {
      name: isAVSIsFullAddressLevel ? addressInputValue : '',
      name2: '',
      city: isAVSIsFullAddressLevel ? cityInputValue : '',
      district: '',
      street: '',
      postalCodeCity: zipcodeInputValue,
      region: isAVSIsFullAddressLevel ? stateInputValue : '',
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
        paymentCard.cardType === 'AMEX' &&
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

        onSetStartPay(false);

        if (addressValidationErrorMessage) {
          onSetCvvError(false, '');
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
          onSetCvvError(true, cvvValidationErrorMessage);
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
          onSetCvvError(true, f('payment.cvvnomatch'));
        }
        return false;
      }

      dispatch(setAddressValidationErrorMessage(''));
      onSetCvvError(false, '');
      return true;
    } catch {
      onSetStartPay(false);
      showToastMessage('error', 'Failed the pre-authentication check');
      return false;
    }
  };

  const finalizePayment = (
    invoices: Invoice[],
    cardinalData: ThreeDSCardinalData | undefined,
    vRef?: string,
  ) => {
    postPayment(
      selectedAccount?.primaryAcct ?? '',
      payer,
      invoices,
      cardinalData,
      paymentCard,
      vRef ? undefined : cvv,
      impersonatedUserId,
      undefined,
      vRef,
      selectedAccount?.companyCode ?? '',
    ).then(
      (response) => {
        cleanupPaymentFlow();
        navigate('/payment/session/receipt', {
          state: { invoices, responseData: response, payment: paymentCard },
        });
      },
      (error) => {
        navigateToPaymentErrorReceipt(invoices, error);
      },
    );
  };

  const finalizeDeposit = (
    details: DepositDetails,
    cardinalData: ThreeDSCardinalData | undefined,
    vRef?: string,
  ) => {
    postDeposit(
      selectedAccount?.primaryAcct ?? '',
      payer,
      details,
      cardinalData,
      paymentCard,
      vRef ? undefined : cvv,
      impersonatedUserId,
      selectedAccount?.companyCode ?? '',
      undefined,
      vRef,
    ).then(
      (resp) => {
        cleanupDepositFlow();
        navigate('/payment/deposits/receipt', {
          state: {
            depositDetails: details,
            responseData: resp,
            payment: paymentCard,
          },
        });
      },
      (error) => {
        navigateToDepositErrorReceipt(details, error);
      },
    );
  };

  const executeStripePayment = async (invoices: Invoice[]) => {
    onSetIsProcessing(true);
    loadingCtx.increment();
    try {
      const resolvedAccountId =
        selectedAccount?.accountId ||
        selectedAccount?.primaryAcct ||
        payer ||
        '';

      const invoiceNumbers = invoices
        .map(
          (inv) =>
            inv.billingDocumentNumber ||
            inv.documentNumberFinance ||
            inv.referenceNumber,
        )
        .filter(Boolean)
        .join(', ');

      const csrfHeaders = await getCsrfHeaders();
      const response = await fetch('/api/stripe/payment-intent', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders,
        },
        body: JSON.stringify({
          amount: paymentTotal,
          currencyCode: currencyKey || 'USD',
          paymentMethodId: paymentCard.token || paymentCard.key,
          accountId: resolvedAccountId,
          invoiceNumber: invoiceNumbers,
          customerName: paymentCard.name || selectedAccount?.address?.name || '',
          customerEmail: user?.email || '',
          confirm: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let message = 'Payment failed.';
        try {
          const parsed = JSON.parse(errorText);
          message = parsed.error || parsed.message || message;
        } catch (ignored) {}
        throw new Error(message);
      }

      const result = await response.json();

      if (result.status === 'requires_action' && result.clientSecret) {
        const configResp = await fetch('/api/stripe/config');
        const { publishableKey } = await configResp.json();
        const stripe = await getStripe(publishableKey);
        if (stripe) {
          const confirmResult = await stripe.confirmCardPayment(result.clientSecret);
          if (confirmResult.error) {
            throw new Error(confirmResult.error.message || 'Payment authentication failed.');
          }
        }
      }

      const receiptResponseData = {
        documents: invoices.map((inv) => ({
          billingDocumentNumber: inv.billingDocumentNumber,
          referenceNumber: inv.referenceNumber,
          paymentAmount: inv.paymentAmount,
          currencyKey: inv.currencyKey || currencyKey,
          documentDate: new Date().toISOString(),
          paymentCardType: paymentCard.cardType,
        })),
      };

      cleanupPaymentFlow();
      navigate('/payment/session/receipt', {
        state: {
          invoices,
          responseData: receiptResponseData,
          payment: paymentCard,
        },
      });
    } catch (err) {
      console.error('Stripe payment failed:', err);
      navigateToPaymentErrorReceipt(invoices, err);
    } finally {
      loadingCtx.decrement();
      onSetIsProcessing(false);
    }
  };

  const executeStripeDeposit = async (details: DepositDetails) => {
    onSetIsProcessing(true);
    loadingCtx.increment();
    try {
      const resolvedAccountId =
        selectedAccount?.accountId ||
        selectedAccount?.primaryAcct ||
        payer ||
        '';

      const csrfHeaders = await getCsrfHeaders();
      const response = await fetch('/api/stripe/payment-intent', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders,
        },
        body: JSON.stringify({
          amount: payTotal,
          currencyCode: currencyKey || 'USD',
          paymentMethodId: paymentCard.token || paymentCard.key,
          accountId: resolvedAccountId,
          description: `Deposit: ${details.referenceNumber || ''}`,
          customerName: paymentCard.name || selectedAccount?.address?.name || '',
          customerEmail: user?.email || '',
          confirm: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let message = 'Deposit payment failed.';
        try {
          const parsed = JSON.parse(errorText);
          message = parsed.error || parsed.message || message;
        } catch (ignored) {}
        throw new Error(message);
      }

      const result = await response.json();

      if (result.status === 'requires_action' && result.clientSecret) {
        const configResp = await fetch('/api/stripe/config');
        const { publishableKey } = await configResp.json();
        const stripe = await getStripe(publishableKey);
        if (stripe) {
          const confirmResult = await stripe.confirmCardPayment(result.clientSecret);
          if (confirmResult.error) {
            throw new Error(confirmResult.error.message || 'Payment authentication failed.');
          }
        }
      }

      cleanupDepositFlow();
      navigate('/payment/deposits/receipt', {
        state: {
          depositDetails: details,
          responseData: {
            depositAmount: payTotal,
            referenceNumber: details.referenceNumber,
            documentDate: new Date().toISOString(),
          },
          payment: paymentCard,
        },
      });
    } catch (err) {
      console.error('Stripe deposit failed:', err);
      navigateToDepositErrorReceipt(details, err);
    } finally {
      loadingCtx.decrement();
      onSetIsProcessing(false);
    }
  };

  const makePayment = () => {
    if (!validateCard()) return;

    const maxPaymentAllowed =
      paymentCard?.cardType === PaymentTypes.EC
        ? config?.maximumAllowedECAmount
        : config?.maximumAllowedCCAmount;

    if (maxPaymentAllowed) {
      if (paymentTotal > maxPaymentAllowed && maxPaymentAllowed > 0) {
        showToastMessage(
          'error',
          paymentCard?.cardType === PaymentTypes.EC
            ? f('payment.error.maximum_check_payment_exceeded_message')
            : f('payment.error.maximum_card_payment_exceeded_message'),
        );
        return false;
      }
    }

    const mappedInvoices: Invoice[] = data.map((invoice: Invoice) => {
      const {
        documentNumberFinance,
        lineItemInTheRelevantInvoice,
        fiscalYearOfTheRelevantInvoice,
        openAmount,
        paymentAmount,
        currencyKey: invoiceCurrencyKey,
        reason,
        description,
        referenceNumber,
        billingDocumentNumber,
        documentDate,
        soldtoNumber,
      } = invoice;
      return {
        documentNumberFinance,
        lineItemInTheRelevantInvoice,
        fiscalYearOfTheRelevantInvoice,
        openAmount,
        paymentAmount,
        currencyKey: invoiceCurrencyKey,
        reason,
        description,
        referenceNumber,
        billingDocumentNumber,
        documentDate,
        soldtoNumber,
        payerNumber: payer,
      };
    });

    const isStripeCard = Boolean(
      paymentCard?.token?.startsWith('pm_') ||
      paymentCard?.token?.startsWith('tok_') ||
      paymentCard?.key?.startsWith('pm_')
    );

    if (isStripeCard) {
      executeStripePayment(mappedInvoices);
      return;
    }

    const shouldRun3DS = !isStripeCard && shouldRun3DSForPaymentMethod(
      paymentCard?.cardType,
      activePaymentProvider,
      companyCodeDetail?.is3dsDisabled,
    );

    if (shouldRun3DS) {
      const secure3dsVersion = getSecure3dsVersion(activePaymentProvider);
      if (!secure3dsVersion) {
        showToastMessage(
          'error',
          '3DS is enabled but secure3dsVersion is not configured',
        );
        return;
      }

      dispatch(setMappedInvoices(mappedInvoices));
      dispatch(setSelectedPaymentMethod(paymentCard));
      dispatch(setSelectedPayer(payer));

      getAccessToken(
        selectedAccount?.primaryAcct ?? '',
        payer,
        paymentCard.key,
        data[0]?.currencyKey || 'en',
        build3DSReturnUri('/payment/processing-payment', paymentCard),
        paymentTotal,
        paymentCard,
        impersonatedUserId,
        cvv,
        selectedAccount?.companyCode ?? '',
      ).then(
        (accessResp) => {
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
          const paymetricData = xiPlugin.createJSRequestPacket(
            accessResp.merchantId,
            accessResp.accessToken,
          );
          paymetricData.addField(xiPlugin.createField('PAYMET', false, 'CC'));
          paymetricData.addField(
            xiPlugin.createField('CCINS', false, paymentCard.gatewayCardType!),
          );
          paymetricData.addField(
            xiPlugin.createField(
              'CCNUM',
              true,
              paymentCard.token || paymentCard.key,
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
                    finalizePayment(
                      mappedInvoices,
                      resp.cardinalData ?? undefined,
                      accessResp?.vRef,
                    );
                  },
                  (error) => {
                    navigateToPaymentErrorReceipt(mappedInvoices, error);
                  },
                );
              },
              (error) => {
                navigateToPaymentErrorReceipt(mappedInvoices, error);
              },
            )
            .catch((error) => {
              navigateToPaymentErrorReceipt(mappedInvoices, error);
            })
            .finally(() => {
              loadingCtx.decrement();
            });
        },
        (error) => {
          navigateToPaymentErrorReceipt(mappedInvoices, error);
        },
      );
    } else {
      finalizePayment(mappedInvoices, undefined);
    }
  };

  const makeDeposit = () => {
    const amountToDeposit = payTotal;
    const maxPaymentAllowed =
      paymentCard?.cardType === PaymentTypes.EC
        ? config?.maximumAllowedECAmount
        : config?.maximumAllowedCCAmount;

    if (maxPaymentAllowed) {
      if (amountToDeposit > maxPaymentAllowed && maxPaymentAllowed > 0) {
        showToastMessage(
          'error',
          paymentCard?.cardType === PaymentTypes.EC
            ? f('payment.error.maximum_echeck_payment_exceeded_message')
            : f('payment.error.maximum_card_payment_exceeded_message'),
        );
        return false;
      }
    }

    const isStripeCard = Boolean(
      paymentCard?.token?.startsWith('pm_') ||
      paymentCard?.token?.startsWith('tok_') ||
      paymentCard?.key?.startsWith('pm_')
    );

    if (isStripeCard) {
      if (depositDetails) {
        executeStripeDeposit(depositDetails);
      }
      return;
    }

    const shouldRun3DS = !isStripeCard && shouldRun3DSForPaymentMethod(
      paymentCard?.cardType,
      activePaymentProvider,
      companyCodeDetail?.is3dsDisabled,
    );

    if (shouldRun3DS) {
      const secure3dsVersion = getSecure3dsVersion(activePaymentProvider);
      if (!secure3dsVersion) {
        showToastMessage(
          'error',
          '3DS is enabled but secure3dsVersion is not configured',
        );
        return;
      }

      getAccessToken(
        selectedAccount?.primaryAcct ?? '',
        payer,
        paymentCard.key,
        currencyKey || 'en',
        build3DSReturnUri('/payment/deposits/processing-payment', paymentCard),
        payTotal,
        paymentCard,
        impersonatedUserId,
        cvv,
        selectedAccount?.companyCode ?? '',
      ).then(
        (accessResp) => {
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
          const paymetricData = xiPlugin.createJSRequestPacket(
            accessResp.merchantId,
            accessResp.accessToken,
          );
          paymetricData.addField(xiPlugin.createField('PAYMET', false, 'CC'));
          paymetricData.addField(
            xiPlugin.createField('CCINS', false, paymentCard.gatewayCardType!),
          );
          paymetricData.addField(
            xiPlugin.createField(
              'CCNUM',
              true,
              paymentCard.token || paymentCard.key,
            ),
          );

          loadingCtx.increment();
          if (depositDetails) {
            Deposit3dsRedirectSession.save({
              depositDetails,
              payer,
              paymentMethod: paymentCard,
              vRef: accessResp.vRef,
            });
          }

          paymetric3DSCheck(
            accessResp.paymetricUrl,
            paymetricData,
            get3DSVersion(secure3dsVersion),
          )
            .then(
              () => {
                get3DSAuthenticationResult(accessResp).then(
                  (resp) => {
                    if (depositDetails) {
                      finalizeDeposit(
                        depositDetails,
                        resp.cardinalData ?? undefined,
                        accessResp?.vRef,
                      );
                    }
                  },
                  (error) => {
                    if (depositDetails) {
                      navigateToDepositErrorReceipt(depositDetails, error);
                    }
                  },
                );
              },
              (error) => {
                if (depositDetails) {
                  navigateToDepositErrorReceipt(depositDetails, error);
                }
              },
            )
            .catch((error) => {
              if (depositDetails) {
                navigateToDepositErrorReceipt(depositDetails, error);
              }
            })
            .finally(() => {
              loadingCtx.decrement();
            });
        },
        (error) => {
          if (depositDetails) {
            navigateToDepositErrorReceipt(depositDetails, error);
          }
        },
      );
    } else {
      if (depositDetails) finalizeDeposit(depositDetails, undefined);
    }
  };

  const handlePayment = async () => {
    try {
      if (!paymentConfigLoaded) {
        showToastMessage(
          'error',
          'Payment configuration is not available. Please try again.',
        );
        return;
      }

      const isCardPaymentMethod =
        paymentCard?.cardType && paymentCard.cardType !== PaymentTypes.EC;
      if (isCardPaymentMethod && (!configLoaded || !activePaymentProvider)) {
        showToastMessage(
          'error',
          'Payment provider configuration is not available. Please try again.',
        );
        return;
      }

      if (overPaymentTotal > 0 && !isOverPaymentAllowed) {
        showToastMessage('error', f('payment.error.over_payment_not_allowed'));
        return;
      }

      if (validateInvoiceData) {
        const isValid = validateInvoiceData();
        if (!isValid) return;
      }

      onSetIsProcessing(true);
      dispatch(setSelectedInvoices([]));
      removeIframeById('cardinal_iframe_post');

      if (isDeposit) {
        makeDeposit();
      } else {
        makePayment();
      }

      onSetIsProcessing(false);
    } catch {
      onSetIsProcessing(false);
    }
  };

  const continueClick = () => {
    if (!isDeposit) {
      if (validateInvoiceData) {
        const isValid = validateInvoiceData();
        if (!isValid) return;
      }
    } else {
      if (
        depositDetails?.amountToProcess == null ||
        depositDetails.amountToProcess <= 0
      ) {
        showToastMessage('error', f('deposits.amount.required'));
        return;
      }
      if (!depositDetails?.referenceNumber.trim()) {
        showToastMessage('error', f('deposits.referncenumber.required'));
        return;
      }
      if (!depositDetails?.comment.trim()) {
        showToastMessage('error', f('deposits.paymentnote.required'));
        return;
      }
    }

    if (!validateCard()) return;

    const maxPaymentAllowed =
      paymentCard?.cardType === PaymentTypes.EC
        ? config?.maximumAllowedECAmount
        : config?.maximumAllowedCCAmount;

    const canPay =
      !isPositiveNumber(maxPaymentAllowed) || paymentTotal <= maxPaymentAllowed;

    if (!canPay) {
      showToastMessage(
        'error',
        paymentCard?.cardType === PaymentTypes.EC
          ? f('payment.error.maximum_check_payment_exceeded_message')
          : f('payment.error.maximum_card_payment_exceeded_message'),
      );
      return;
    }

    const isStripeCard = Boolean(
      paymentCard?.token?.startsWith('pm_') ||
      paymentCard?.token?.startsWith('tok_') ||
      paymentCard?.key?.startsWith('pm_')
    );

    dispatch(setPaymentMethodIsComplete(true));
    dispatch(setPaymentMethodIsEditable(true));
    dispatch(setPaymentMethodIsExpanded(false));

    if (isStripeCard) {
      dispatch(setAddressValidationIsExpanded(false));
      dispatch(setAddressValidationIsComplete(true));
      onSetStartPay(true);
      return;
    }

    dispatch(setAddressValidationIsExpanded(true));

    const validationRequired =
      enablePreAuth &&
      paymentMethodIsCreditCard &&
      addressValidationOptions?.toLowerCase() !== ADDRESS_VALIDATION_OFF &&
      !addressValidationIsComplete;

    const preAuthenticationRequired = false;
      // enablePreAuth &&
      // paymentMethodIsCreditCard &&
      // addressValidationOptions?.toLowerCase() === ADDRESS_VALIDATION_OFF &&
      // isCVVValidationEnabled;

    if (!validationRequired && !preAuthenticationRequired) {
      onSetStartPay(true);
    }

    if (!paymentMethodIsCreditCard) {
      dispatch(clearAddressValidation('Check'));
    }

    if (preAuthenticationRequired) {
      doPreAuthenticationIfRequired(true).then((isSuccessful) => {
        if (isSuccessful) onSetStartPay(true);
      });
    }
  };

  const handleAddressValidation = async () => {
    const isStripeCard = Boolean(
      paymentCard?.token?.startsWith('pm_') ||
      paymentCard?.token?.startsWith('tok_') ||
      paymentCard?.key?.startsWith('pm_')
    );
    if (isStripeCard) {
      dispatch(setAddressValidationIsComplete(true));
      dispatch(setAddressValidationIsExpanded(false));
      dispatch(setPaymentMethodIsEditable(true));
      dispatch(setAddressValidationIsEditable(true));
      onSetStartPay(true);
      return;
    }

    const isSuccessful = true;//await doPreAuthenticationIfRequired(true, true);
    if (!isSuccessful) return;

    dispatch(setAddressValidationIsComplete(true));
    dispatch(setAddressValidationIsExpanded(false));
    dispatch(setPaymentMethodIsEditable(true));
    dispatch(setAddressValidationIsEditable(true));
    onSetStartPay(true);
  };

  const handleClearAddressValidation = () => {
    dispatch(setAddressValidationErrorMessage(''));
    dispatch(clearAddressValidation());
    dispatch(setPaymentMethodIsEditable(false));
    onSetStartPay(false);
  };

  const handleEditAddressValidation = (sectionType: string) => {
    dispatch(editAddressValidation(sectionType));
    if (sectionType === 'Payment') {
      onSetStartPay(false);
    }
  };

  return {
    continueClick,
    handlePayment,
    handleAddressValidation,
    handleClearAddressValidation,
    handleEditAddressValidation,
  };
}
