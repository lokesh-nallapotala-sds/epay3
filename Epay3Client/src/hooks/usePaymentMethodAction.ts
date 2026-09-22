import { useCallback, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useAppDispatch, useAppSelector } from 'redux/hooks';
import { useEpayToast } from 'providers/EpayToastProvider';
import { useEpayLoading } from 'providers/EpayLoadingProvider';
import { usePayerDetails } from 'providers/PayerDetailsProvider';
import { EpayPaymentService } from 'services/EpayPaymentService';
import {
  paymentMethodsSelector,
  impersonatedUserSelector,
  addSessionCard,
  setDefaultCard as updateDefaultCard,
  clearDefaultCard,
} from 'redux/reducers';
import {
  PaymentCard,
  PaymentCardSubmission,
  PaymentMethod,
  PayerDetails,
} from 'types/Payment';
import {
  findMatchingCard,
  extractErrorMessage,
  extractLastCardNumbers,
  CARD_ADD_3DS_RETURN_PARAM,
  CARD_ADD_3DS_RETURN_VALUE,
  getCardAdd3dsRedirectUri,
  getGatewayCardType,
  normalizeHostedPaymentCard,
} from 'utilities/utilities';
import { PAYMENT_METHOD_UPDATE_ACTION } from '../constants/UiOptions';
import {
  cleanUrlAfterHostedPayment,
  getHostedPaymentSession,
  inferHostedPaymentCardType,
  inferHostedAccountType,
} from 'hooks/useHostedPayment';
import {
  getActiveWorldpayProvider,
  getSecure3dsVersion,
  isSecure3dsEnabled,
} from 'utilities/paymentProvider3ds';
import { isSessionSelector, removeIsSession } from 'redux/reducers';
import {
  selectCompanyCodes,
  selectPaymentCards,
  selectPaymentProviders,
} from 'redux/selectors/configSelectors';

interface UsePaymentMethodActionProps {
  onSuccess?: (card: PaymentCardSubmission) => void;
  onError?: (error: string) => void;
}

type PaymentCardSource = Partial<PaymentCard> & {
  type?: string;
  token?: string;
  name?: string;
  cardValidationCode?: string;
};

type CardAdd3DSPaymentCardSource = Omit<
  PaymentCardSource,
  'cardValidationCode'
>;

const CARD_ADD_3DS_PENDING_KEY = 'epay-card-add-3ds-pending';

interface CardAdd3DSPending {
  paymentCardData: CardAdd3DSPaymentCardSource;
  saveOnFile: boolean;
  defaultCard: boolean;
  isCard: boolean;
  accessToken?: string;
}

const savePendingCardAdd3DS = (pending: CardAdd3DSPending): void => {
  const paymentCardData = {
    ...(pending.paymentCardData as PaymentCardSource),
  };
  delete paymentCardData.cardValidationCode;

  sessionStorage.setItem(
    CARD_ADD_3DS_PENDING_KEY,
    JSON.stringify({
      ...pending,
      paymentCardData,
    }),
  );
};

const getPendingCardAdd3DS = (): CardAdd3DSPending | null => {
  const value = sessionStorage.getItem(CARD_ADD_3DS_PENDING_KEY);
  if (!value) return null;

  try {
    return JSON.parse(value) as CardAdd3DSPending;
  } catch {
    return null;
  }
};

const clearPendingCardAdd3DS = (): void => {
  sessionStorage.removeItem(CARD_ADD_3DS_PENDING_KEY);
};

/**
 * Hook to centralize the logic for adding/processing payment methods (Cards and Checks).
 * Handles:
 * 1. Validation for duplicate cards/accounts.
 * 2. Saving to file (API call) vs adding to session (Redux).
 * 3. Success/Error toast messages.
 * 4. Refreshing payer details on success.
 */
export const usePaymentMethodAction = ({
  onSuccess,
  onError,
}: UsePaymentMethodActionProps = {}) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const loadingCtx = useEpayLoading();
  const { showToastMessage } = useEpayToast();
  const addPaymentMethod = EpayPaymentService.useAddPaymentCard();
  const getTokenizeResponse = EpayPaymentService.useGetTokenizeResponse();
  const getAccessToken = EpayPaymentService.useGetAccessToken();
  const paymetric3DSCheck = EpayPaymentService.useGetPaymetric3DSCheck();
  const get3DSAuthenticationResult =
    EpayPaymentService.useGet3DSAuthenticationResult();
  const {
    refreshPayerDetails,
    effectivePayer: selectedPayer,
    effectiveAccount: selectedAccount,
  } = usePayerDetails();

  const allPayerCards = useAppSelector(paymentMethodsSelector);
  const impersonatedUser = useAppSelector(impersonatedUserSelector);
  const isSession = useAppSelector(isSessionSelector);
  const companyCodes = useAppSelector(selectCompanyCodes);
  const paymentCardsConfig = useAppSelector(selectPaymentCards);
  const paymentProviders = useAppSelector(selectPaymentProviders);
  const impersonatedUserId = impersonatedUser?.userId;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const f = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id, defaultMessage: id }, values);

  const validateCardAdd3DS = useCallback(
    async (
      paymentCard: PaymentCardSubmission,
      normalizedCardType: string,
      pending3DS?: CardAdd3DSPending,
      showGlobalLoader = true,
    ): Promise<string | undefined> => {
      if (!selectedAccount) {
        return;
      }

      const activeProvider = getActiveWorldpayProvider(paymentProviders);

      if (!isSecure3dsEnabled(activeProvider)) {
        return;
      }

      const companyCodeDetail = companyCodes?.find(
        (code) => code.companyCode === selectedAccount.companyCode,
      );

      if (companyCodeDetail?.is3dsDisabled) {
        return;
      }

      const sapCardType = paymentCard.sapCardType || '';
      const cardType =
        paymentCard.gatewayCardType ||
        getGatewayCardType(
          paymentCard.paymentCardType ||
            normalizedCardType ||
            sapCardType ||
            'CC',
          paymentCardsConfig,
        );
      if (cardType === 'EC') {
        return;
      }

      const secure3dsVersion = getSecure3dsVersion(activeProvider);
      if (!secure3dsVersion) {
        throw new Error(
          '3DS is enabled but secure3dsVersion is not configured',
        );
      }

      const preAuthConfig = paymentCardsConfig?.find(
        (card) => card.gatewayCardType === cardType,
      );
      const amount =
        preAuthConfig?.preauthorizationAmount &&
        preAuthConfig.preauthorizationAmount > 0
          ? preAuthConfig.preauthorizationAmount
          : 0.1;
      const currency = companyCodeDetail?.currencyKey || 'USD';

      const tokenPaymentMethod: PaymentMethod = {
        name: paymentCard.paymentCardName || '',
        dropDownDisplayName: paymentCard.paymentCardName || '',
        key: '',
        cardType:
          paymentCard.paymentCardType || normalizedCardType || sapCardType,
        sapCardType: sapCardType || undefined,
        gatewayCardType: cardType,
        default: false,
        token: paymentCard.paymentCardToken,
        validFrom: paymentCard.validFrom || '',
        validTo: paymentCard.validTo || '',
      };

      const accessResp = await getAccessToken(
        selectedAccount.primaryAcct,
        selectedPayer,
        null,
        currency,
        getCardAdd3dsRedirectUri(),
        amount,
        tokenPaymentMethod,
        impersonatedUserId,
        undefined,
        selectedAccount.companyCode,
        showGlobalLoader,
      );

      if (pending3DS) {
        savePendingCardAdd3DS({
          ...pending3DS,
          accessToken: accessResp.accessToken,
        });
      }

      const paymetricData = window.$XIPlugin.createJSRequestPacket(
        accessResp.merchantId,
        accessResp.accessToken,
      );

      paymetricData.addField(
        window.$XIPlugin.createField('PAYMET', false, 'CC'),
      );
      paymetricData.addField(
        window.$XIPlugin.createField('CCINS', false, cardType),
      );
      paymetricData.addField(
        window.$XIPlugin.createField(
          'CCNUM',
          true,
          paymentCard.paymentCardToken,
        ),
      );

      try {
        await paymetric3DSCheck(
          accessResp.paymetricUrl,
          paymetricData,
          secure3dsVersion,
          showGlobalLoader,
        );

        // Frictionless 3DS completed — return the access token so the caller
        // can include it in the addPaymentMethod request as proof of 3DS.
        clearPendingCardAdd3DS();
        return accessResp.accessToken;
      } catch (error) {
        clearPendingCardAdd3DS();
        throw error;
      }
    },
    [
      selectedAccount,
      paymentProviders,
      companyCodes,
      paymentCardsConfig,
      getAccessToken,
      selectedPayer,
      impersonatedUserId,
      paymetric3DSCheck,
    ],
  );

  const processPaymentMethod = useCallback(
    async (
      paymentCardData: PaymentCardSource,
      options: {
        saveOnFile: boolean;
        defaultCard: boolean;
        isCard: boolean;
        accessToken?: string;
        threeDSAccessToken?: string;
        skip3DSValidation?: boolean;
        showGlobalLoader?: boolean;
        onSuccessBeforeRefresh?: boolean;
      },
    ) => {
      const {
        saveOnFile,
        defaultCard,
        isCard,
        accessToken,
        threeDSAccessToken,
        skip3DSValidation,
        showGlobalLoader = true,
        onSuccessBeforeRefresh = false,
      } = options;

      const cardType = (
        paymentCardData.gatewayCardType ||
        paymentCardData.type ||
        (isCard ? 'CC' : 'EC')
      ).toUpperCase();
      const cardToken =
        paymentCardData.paymentCardToken || paymentCardData.token || '';
      const cardName =
        paymentCardData.paymentCardName || paymentCardData.name || '';
      const cardLast4Digit =
        paymentCardData.cardLast4Digit ||
        extractLastCardNumbers(cardType, cardToken);
      const paymentCardType = isCard
        ? paymentCardData.paymentCardType ||
          paymentCardData.type ||
          paymentCardData.sapCardType ||
          'CC'
        : 'EC';
      const sapCardType = isCard ? paymentCardData.sapCardType || '' : 'EC';
      const gatewayCardType = isCard
        ? paymentCardData.gatewayCardType ||
          getGatewayCardType(paymentCardType, paymentCardsConfig)
        : 'EC';

      const { info, error: matchError } = findMatchingCard(
        cardToken,
        cardType,
        allPayerCards,
        intl,
      );

      if (matchError) {
        showToastMessage('error', info);
        onError?.(info);
        return;
      }

      const newPaymentMethod: PaymentCard = {
        paymentCardType,
        sapCardType: sapCardType || undefined,
        gatewayCardType,
        paymentCardToken: cardToken,
        paymentCardName: cardName,
        validFrom: paymentCardData.validFrom || '',
        validTo: paymentCardData.validTo || '',
        electronicCheckAccountType:
          paymentCardData.electronicCheckAccountType || (isCard ? '' : 'C'),
        electronicCheckRdfiNumber:
          paymentCardData.electronicCheckRdfiNumber || '',
        default: defaultCard ? 'X' : '',
        isSession: !saveOnFile,
        cardLast4Digit,
        threeDSAccessToken: threeDSAccessToken,
        cardinalData: paymentCardData.cardinalData,
        vRef: paymentCardData.vRef,
      };

      const requestPaymentMethod: PaymentCardSubmission = {
        ...newPaymentMethod,
        paymentCardType: sapCardType || paymentCardType,
        cardValidationCode: paymentCardData.cardValidationCode || '',
        threeDSAccessToken: threeDSAccessToken,
      };

      setIsSubmitting(true);
      if (showGlobalLoader) {
        loadingCtx.increment();
      }

      try {
        if (saveOnFile && !selectedAccount) {
          throw new Error('Selected account is required');
        }

        if (isCard && !skip3DSValidation) {
          const frictionlessToken = await validateCardAdd3DS(
            requestPaymentMethod,
            cardType,
            {
              paymentCardData: requestPaymentMethod,
              saveOnFile,
              defaultCard,
              isCard,
              accessToken,
            },
            showGlobalLoader,
          );
          if (frictionlessToken) {
            requestPaymentMethod.threeDSAccessToken = frictionlessToken;
          }
        }

        if (saveOnFile) {
          const payerDetails: PayerDetails = {
            customerNumber: selectedPayer,
            companyCode: selectedAccount?.companyCode ?? '',
            paymentCards: [],
          };

          const response = await addPaymentMethod(
            payerDetails,
            requestPaymentMethod,
            impersonatedUserId,
            showGlobalLoader,
          );

          if (response.message_type?.toLowerCase() === 's') {
            showToastMessage(
              'success',
              isCard
                ? f('payment_methods.adding_card.success_message')
                : f('payment_methods.adding_check.success_message'),
            );

            if (isCard && defaultCard) {
              dispatch(updateDefaultCard(defaultCard.toString()));
            }

            if (onSuccessBeforeRefresh) {
              onSuccess?.(newPaymentMethod);
            }

            await refreshPayerDetails(true);

            if (!onSuccessBeforeRefresh) {
              onSuccess?.(newPaymentMethod);
            }
          } else {
            const errorMessage = response.message_line_string || '';
            const errorNumber = Number(response.message_number);
            if (errorNumber === 74) {
              const match = errorMessage.match(/ending in (\d{4})/i);
              const last4 = match?.[1] ? `ending in ${match[1]}` : '';
              showToastMessage(
                'error',
                f('payment_methods.existing_card.error_message', { last4 }),
              );
            } else if (errorNumber === 76) {
              const match = errorMessage.match(
                /already assigned to account\s+(\d+)/i,
              );
              const accountNumber = match?.[1] || '';
              showToastMessage(
                'error',
                f('payment_methods.assigned_card.error_message', {
                  accountNumber,
                }),
              );
            } else {
              showToastMessage(
                'error',
                f('payment_methods.adding_card.error_message'),
              );
            }
            onError?.(errorMessage);
          }
        } else {
          // Guest / Session flow
          newPaymentMethod.cardLast4Digit = cardLast4Digit;
          dispatch(
            addSessionCard({
              paymentCard: newPaymentMethod,
              payer: selectedPayer,
            }),
          );
          onSuccess?.(requestPaymentMethod);
        }
      } catch (err: unknown) {
        const errorMsg = extractErrorMessage(err);
        showToastMessage('error', errorMsg);
        onError?.(errorMsg);
      } finally {
        if (showGlobalLoader) {
          loadingCtx.decrement();
        }
        setIsSubmitting(false);
      }
    },
    [
      allPayerCards,
      intl,
      selectedPayer,
      selectedAccount,
      impersonatedUserId,
      addPaymentMethod,
      dispatch,
      refreshPayerDetails,
      showToastMessage,
      onSuccess,
      onError,
      validateCardAdd3DS,
    ],
  );

  const processedAccessTokens = useRef<Set<string>>(new Set());

  const processHostedAddPaymentMethodCallback = useCallback(async () => {
    const search = new URLSearchParams(window.location.search);
    const accessToken = search.get('id') || search.get('access_token');
    const pmStatus = search.get('status');
    const hostedSession = getHostedPaymentSession();
    const isCardAdd3dsReturn =
      search.get(CARD_ADD_3DS_RETURN_PARAM) === CARD_ADD_3DS_RETURN_VALUE;

    if (!accessToken && !pmStatus) return;

    // Prevent double processing of the same token (re-render double trigger)
    if (accessToken && processedAccessTokens.current.has(accessToken)) {
      return;
    }

    if (pmStatus === 'error' || pmStatus === 'cancelled') {
      const errorMsg =
        search.get('error_message') || f('payment.hosted_cancelled_or_failed');
      showToastMessage('error', errorMsg);
      if (isCardAdd3dsReturn) {
        clearPendingCardAdd3DS();
      }
      cleanUrlAfterHostedPayment();
      onError?.(errorMsg);
      return;
    }

    if (!accessToken) return;

    // Mark as processed
    processedAccessTokens.current.add(accessToken);

    try {
      setIsSubmitting(true);
      loadingCtx.increment();

      let paymentCard: PaymentCardSource | undefined;
      let originalAccessToken = accessToken;
      let saveOnFile = hostedSession?.saveOnFile ?? !isSession;
      let defaultCard = hostedSession?.defaultCard ?? false;

      if (isCardAdd3dsReturn) {
        const pending3DS = getPendingCardAdd3DS();
        if (!pending3DS?.paymentCardData) {
          throw new Error(f('payment.hosted_no_card_data'));
        }

        const authResult = await get3DSAuthenticationResult({
          accessToken: pending3DS.accessToken || accessToken || '',
        });

        paymentCard = {
          ...pending3DS.paymentCardData,
          cardinalData: authResult.cardinalData,
          vRef: authResult.vRef || pending3DS.paymentCardData.vRef,
        };

        originalAccessToken = pending3DS.accessToken || accessToken;
        saveOnFile = pending3DS.saveOnFile;
        defaultCard = pending3DS.defaultCard;
      } else {
        const tokenizeResponse = await getTokenizeResponse({
          action: PAYMENT_METHOD_UPDATE_ACTION,
          accessToken: accessToken,
        });

        paymentCard = {
          ...tokenizeResponse.paymentCard,
          ...normalizeHostedPaymentCard(
            (tokenizeResponse.paymentCard ?? {}) as Record<string, unknown>,
          ),
          vRef: tokenizeResponse.vRef || tokenizeResponse.v_ref,
        };
      }

      if (!paymentCard) {
        throw new Error(f('payment.hosted_no_card_data'));
      }

      const rawType = inferHostedPaymentCardType(paymentCard.type);
      const resolvedSapCardType =
        rawType === 'EC'
          ? 'EC'
          : paymentCard.sapCardType || paymentCard.paymentCardType || rawType;
      const isCard = resolvedSapCardType !== 'EC';

      const cardData = {
        ...paymentCard,
        type: rawType,
        paymentCardType: resolvedSapCardType,
        sapCardType: resolvedSapCardType,
        gatewayCardType:
          paymentCard.gatewayCardType ||
          (resolvedSapCardType === 'EC' ? 'EC' : undefined),
        electronicCheckAccountType: inferHostedAccountType(
          search.get('account_type'),
        ),
      };

      if (isSession) {
        dispatch(removeIsSession());
      }

      await processPaymentMethod(cardData, {
        saveOnFile,
        defaultCard,
        isCard,
        accessToken: originalAccessToken,
        threeDSAccessToken: isCardAdd3dsReturn
          ? originalAccessToken
          : undefined,
        skip3DSValidation: isCardAdd3dsReturn,
      });

      if (isCardAdd3dsReturn) {
        clearPendingCardAdd3DS();
      }
      cleanUrlAfterHostedPayment();
    } catch (err: unknown) {
      const errorMsg = extractErrorMessage(err);
      showToastMessage('error', errorMsg);
      onError?.(errorMsg);
      // Ensure we clean the URL even on error to stop potential infinite loops
      if (isCardAdd3dsReturn) {
        clearPendingCardAdd3DS();
      }
      cleanUrlAfterHostedPayment();
    } finally {
      dispatch(clearDefaultCard());
      loadingCtx.decrement();
      setIsSubmitting(false);
    }
  }, [
    getTokenizeResponse,
    isSession,
    dispatch,
    processPaymentMethod,
    showToastMessage,
    onError,
    f,
  ]);

  return {
    processPaymentMethod,
    processHostedAddPaymentMethodCallback,
    isSubmitting,
  };
};
