import { ChangeEvent, useEffect, useRef, useState } from 'react';

import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

import { Address } from 'types/Address';
import { useTheme } from '@mui/material';
import EpayBox from 'shared/components/EpayBox';
import {
  extractErrorMessage,
  getGuestCardAdd3dsRedirectUri,
  extractLastCardNumbers,
} from 'utilities/utilities';
import useEpayNavigate from 'hooks/useEpayNavigate';
import EpayCheckBox from 'shared/components/EpayCheckBox';
import {
  AddressData,
  GuestPaymentCardSubmission,
  PayerDetails,
  PaymentCardSubmission,
  PaymentDetail,
} from 'types/Payment';
import { useEpayToast } from 'providers/EpayToastProvider';
import { useEpayLoading } from 'providers/EpayLoadingProvider';
import { CurrencySymbols } from 'constants/CurrencySymbols';
import EpayAccordion from 'shared/components/EpayAccordion';
import { useAppDispatch, useAppSelector } from 'redux/hooks';
import { GuestPaymentRequest } from 'types/GuestPaymentRequest';
import { Invoice, PayerData } from 'types/InvoicesSearchRequest';
import { EpayPaymentService } from 'services/EpayPaymentService';
import AddressValidation from 'components/payment/AddressValidation';
import EpayPageHeaderText from 'shared/components/EpayPageHeaderText';
import { toCurrencyString, toCurrencySymbol } from 'utilities/utilities';
import {
  useGuest3DSValidation,
  getPendingGuest3DS,
  clearPendingGuest3DS,
} from 'hooks/useGuest3DSValidation';
import { useSetGlobalSettings } from 'hooks/usePaymentHelpers';
import {
  cleanUrlAfterHostedPayment,
  inferHostedAccountType,
  inferHostedPaymentCardType,
} from 'hooks/useHostedPayment';
import {
  Box,
  Button,
  FormControlLabel,
  Grid,
  Link,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { EpayModal } from 'shared/components/EpayModalLayout';
import AddCardIcon from '@mui/icons-material/AddCard';
import {
  addressSelector,
  clearAddressValidation,
  editAddressValidation,
  regionalFormatSelector,
  resetAddressConfirmationState,
  setAddressValidationErrorMessage,
  setAddressValidationIsComplete,
  setAddressValidationIsEditable,
  setAddressValidationIsExpanded,
  setPaymentMethodIsComplete,
  setPaymentMethodIsCreditCard,
  setPaymentMethodIsEditable,
  setPaymentMethodIsExpanded,
} from 'redux/reducers';

import PaymentInvoiceList, {
  PaymentInvoiceListHandle,
} from '../../payment/PaymentInvoiceList';
import { CreditCardList } from '../../payment/CreditCardList';
import AddressZipValidation from '../../payment/AddressZipValidation';
import { GuestPaymentMethodFormRouter } from '../../cards/PaymentMethodFormRouter';
import {
  ADDRESS_VALIDATION_OFF,
  ADDRESS_VALIDATION_ZIP,
  PaymentTypes,
} from '../../../constants/UiOptions';
import {
  selectPaymentIntegrationType,
  selectAddressValidationOptions,
  selectEnablePreAuth,
  selectIsCVVAllowedFromCustomConfig,
  selectPaymentConfig,
} from '../../../redux/selectors/configSelectors';
import { CardOperationResponse } from 'types/Payed';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

const GUEST_PAYMENT_INVOICES_KEY = 'guest_payment_invoices';
const GUEST_PAYMENT_ADDRESS_KEY = 'guest_payment_address';
const GUEST_PAYMENT_PAYER_KEY = 'guest_payment_payer';

const loadSessionJson = <T,>(key: string, fallback: T): T => {
  try {
    const saved = sessionStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
};

function GuestPaymentComponent() {
  const { location } = useEpayNavigate();
  const theme = useTheme();
  const primaryButtonColor = theme.palette.primary.main;
  useSetGlobalSettings();

  const intl = useIntl();
  const regionalFormat = useAppSelector(regionalFormatSelector);
  const f = (id: string) =>
    intl.formatMessage({
      id: id,
    });

  // State persistence for redirects
  useEffect(() => {
    if (location.state?.invoiceData) {
      sessionStorage.setItem(
        GUEST_PAYMENT_INVOICES_KEY,
        JSON.stringify(location.state.invoiceData),
      );
    }
    if (location.state?.partnerAddress) {
      sessionStorage.setItem(
        GUEST_PAYMENT_ADDRESS_KEY,
        JSON.stringify(location.state.partnerAddress),
      );
    }
    if (location.state?.payerData) {
      sessionStorage.setItem(
        GUEST_PAYMENT_PAYER_KEY,
        JSON.stringify(location.state.payerData),
      );
    }
  }, [location.state]);

  const [guestInvoices, setGuestInvoices] = useState<Invoice[]>(() => {
    if (location.state?.invoiceData) return location.state.invoiceData;
    return loadSessionJson<Invoice[]>(GUEST_PAYMENT_INVOICES_KEY, []);
  });

  const [persistedAddress] = useState<Address | undefined>(() => {
    if (location.state?.partnerAddress) return location.state.partnerAddress;
    return loadSessionJson<Address | undefined>(
      GUEST_PAYMENT_ADDRESS_KEY,
      undefined,
    );
  });

  const [persistedPayerData] = useState<PayerData>(() => {
    if (location.state?.payerData) {
      return location.state.payerData;
    }
    return loadSessionJson<PayerData>(GUEST_PAYMENT_PAYER_KEY, {} as PayerData);
  });

  // Use persisted data if state is lost
  const finalInvoices = guestInvoices;
  const finalAddress = persistedAddress;
  const finalPayerData = persistedPayerData;

  const [payInvoice, setPayInvoice] = useState<Invoice>(finalInvoices[0]);
  const clearGuestSessionStorage = () => {
    Object.keys(sessionStorage).forEach((key) => {
      if (
        key.startsWith('guest_payment_') ||
        key.startsWith('guest_status_') ||
        key.includes('3ds-pending')
      ) {
        sessionStorage.removeItem(key);
      }
    });
  };
  const [open, setOpen] = useState<boolean>(false);
  const [isPaymentAdded, setIsPaymentAdded] = useState<boolean>(false);
  const [paymentCards, setPaymentCards] = useState<PaymentCardSubmission[]>([]);
  const [cardValidationCode, setCardValidationCode] = useState('');
  const postGuestPayment = EpayPaymentService.usePostGuestPayment();
  const getGuestTokenizeResponse =
    EpayPaymentService.useGetGuestTokenizeResponse();
  const getGuest3DSAuthenticationResult =
    EpayPaymentService.useGetGuest3DSAuthenticationResult();
  const validateGuest3DS = useGuest3DSValidation();
  const handleOpen = () => setOpen(true);
  const [startPay, setStartPay] = useState<boolean>(false);
  const currencyOptions = finalInvoices.map(
    (invoice: Invoice) => CurrencySymbols[invoice?.currencyKey || 'USD'],
  );
  const [currencyKey] = useState<string>(
    currencyOptions.length > 0 ? currencyOptions[0].code : 'USD',
  );
  const [paymentTotal, setPaymentTotal] = useState(() => {
    return finalInvoices.reduce(
      (acc, invoice) => acc + (invoice.paymentAmount || 0),
      0,
    );
  });

  const [paymentMethodType, setPaymentMethodType] = useState('CC');
  const [sendEmailReceipt, setSendEmailReceipt] = useState(false);
  const [email, setEmail] = useState<string>('');
  const [emailError, setEmailError] = useState('');
  const paymentConfig = useAppSelector(selectPaymentConfig);
  const [paymentNote, setpaymentNote] = useState('');

  const guest3DSContext = {
    payer: finalPayerData,
    billingAddress: finalAddress,
    amount: paymentTotal,
    currency: currencyKey,
    guestUserEmail: email,
  };
  const dispatch = useAppDispatch();
  const loadingCtx = useEpayLoading();
  const integrationType = useAppSelector(selectPaymentIntegrationType);
  const isHosted = integrationType === 'hosted';
  const isCVVValidationEnabled = useAppSelector(
    selectIsCVVAllowedFromCustomConfig,
  );
  const doPreAuthentication =
    EpayPaymentService.DoGuestPaymentPreAuthentication();

  const {
    addressInputValue,
    cityInputValue,
    stateInputValue,
    zipcodeInputValue,
    addressValidationIsEditable,
    addressValidationIsComplete,
    paymentMethodIsExpanded,
    paymentMethodIsComplete,
    paymentMethodIsEditable,
    paymentMethodIsCreditCard = true,
  } = useSelector(addressSelector);

  const addressValidationOptions = useAppSelector(
    selectAddressValidationOptions,
  );
  const enablePreAuth = useAppSelector(selectEnablePreAuth);

  const isCreditCardPaymentMethod = (card?: PaymentCardSubmission) =>
    (card?.paymentCardType || card?.gatewayCardType) !== 'EC';

  const isAddressValidationRequired =
    enablePreAuth &&
    addressValidationOptions?.toLowerCase() !== ADDRESS_VALIDATION_OFF &&
    paymentMethodIsCreditCard;
  useEffect(() => {
    dispatch(resetAddressConfirmationState());
  }, [dispatch]);

  const search = new URLSearchParams(location.search);
  const idToken = search.get('id');
  const pmAccessToken = search.get('access_token');
  const pmStatus = search.get('status');
  const accessToken = idToken || pmAccessToken;

  useEffect(() => {
    const epay3dsMarker = new URLSearchParams(location.search).get('epay3ds');
    if ((accessToken || pmStatus) && epay3dsMarker !== 'card-add') {
      if (pmStatus === 'error' || pmStatus === 'cancel') {
        if (pmStatus === 'cancel') {
          showToastMessage('info', f('payment.hosted.cancelled'));
        } else {
          showToastMessage(
            'error',
            search.get('error_message') || 'Payment was cancelled or failed',
          );
        }

        cleanUrlAfterHostedPayment();
        return;
      }

      if (!accessToken) return;

      loadingCtx.increment();
      (async () => {
        try {
          const tokenizeResponse = await getGuestTokenizeResponse({
            action: '02',
            accessToken: accessToken,
          });
          const paymentCard = tokenizeResponse.paymentCard;
          if (!paymentCard) {
            throw new Error('No payment card data received');
          }

          type RawPaymentCard = typeof paymentCard & {
            payment_card_token?: string;
            token?: string;
            payment_card_name?: string;
            name?: string;
            keys?: Array<{ key: string; value: string }>;
            valid_to?: string;
            expiration?: string;
          };
          const raw = paymentCard as RawPaymentCard;

          const rawType = inferHostedPaymentCardType(paymentCard.type);

          const cardToken =
            paymentCard.paymentCardToken || raw.payment_card_token || raw.token;

          const card: PaymentCardSubmission = {
            paymentCardType:
              paymentCard.sapCardType || paymentCard.paymentCardType || rawType,
            sapCardType: paymentCard.sapCardType,
            gatewayCardType: paymentCard.gatewayCardType || paymentCard.type,
            paymentCardToken: cardToken ?? '',
            cardLast4Digit: paymentCard.cardLast4Digit,
            paymentCardName:
              (paymentCard.paymentCardName ||
                raw.payment_card_name ||
                raw.name ||
                raw.keys?.find((k) => k.key === 'CARD_HOLDER_NAME')?.value) ??
              '',
            validFrom: '',
            validTo: paymentCard.validTo || raw.valid_to || raw.expiration,
            electronicCheckAccountType: inferHostedAccountType(
              search.get('account_type'),
            ),
            electronicCheckRdfiNumber: '',
            cardValidationCode: paymentCard.cardValidationCode,
            isSession: true,
            vRef: tokenizeResponse.vRef || tokenizeResponse.v_ref,
          };

          // Hosted payment tokens are not in Cardinal's 3DS session (Cardinal only
          // tracks iframe-entered cards). Try 3DS but proceed without it on failure â€”
          // Paymetric's hosted page handles authentication on their end.
          try {
            const threeDSResult = await validateGuest3DS({
              paymentCard: card,
              context: guest3DSContext,
              redirectUri: getGuestCardAdd3dsRedirectUri(),
            });

            if (threeDSResult?.cardinalData) {
              card.cardinalData = threeDSResult.cardinalData;
            }
            if (threeDSResult?.accessToken) {
              card.threeDSAccessToken = threeDSResult.accessToken;
            }
          } catch {
            // 3DS skipped â€” hosted page handles authentication on their end
          }

          handleCardProccessing(card, true);
        } catch (error: unknown) {
          showToastMessage('error', extractErrorMessage(error));
        } finally {
          loadingCtx.decrement();
          cleanUrlAfterHostedPayment();
        }
      })();
    }
  }, [accessToken, pmStatus]);

  useEffect(() => {
    const epay3ds = search.get('epay3ds');
    if (epay3ds === 'card-add') {
      const pending = getPendingGuest3DS();
      if (pending) {
        (async () => {
          loadingCtx.increment();
          try {
            const authResult = await getGuest3DSAuthenticationResult({
              accessToken: pending.accessToken,
            });

            const card: PaymentCardSubmission = {
              ...pending.paymentCard,
              cardLast4Digit: pending.paymentCard.cardLast4Digit,
              paymentCardName:
                pending.paymentCard.paymentCardName ||
                authResult.cardinalData?.transactionId?.substring(0, 10) ||
                'Card',
              cardinalData: authResult.cardinalData,
              threeDSAccessToken: pending.accessToken,
              vRef:
                authResult.vRef || authResult.v_ref || pending.paymentCard.vRef,
            };

            handleCardProccessing(card, true);
          } catch (error) {
            showToastMessage('error', extractErrorMessage(error));
          } finally {
            clearPendingGuest3DS();
            loadingCtx.decrement();
            cleanUrlAfterHostedPayment();
          }
        })();
      }
    }
  }, [location.search]);

  const { navigate } = useEpayNavigate();
  const [paymentType, setPaymentType] = useState('card');
  const paymentInvoiceListRef = useRef<PaymentInvoiceListHandle>(null);
  const { showToastMessage } = useEpayToast();
  useEffect(() => {
    dispatch(setPaymentMethodIsCreditCard(paymentType !== 'check'));
  }, [dispatch, paymentType]);

  const handleClose = () => {
    setOpen(false);
  };
  const handleCardProccessing = (
    e: PaymentCardSubmission,
    fromRedirect = false,
  ) => {
    const isCC = isCreditCardPaymentMethod(e);
    const requiresAddressValidation =
      isCC &&
      addressValidationOptions?.toLowerCase() !== ADDRESS_VALIDATION_OFF;

    setIsPaymentAdded(true);
    const totalCreditCards: PaymentCardSubmission[] = [];
    totalCreditCards.push(e);
    setPaymentCards(totalCreditCards);
    setCardValidationCode(e.cardValidationCode ?? '');
    setPaymentType(isCC ? 'card' : 'check');
    setPaymentMethodType(isCC ? 'CC' : 'EC');
    dispatch(setPaymentMethodIsCreditCard(isCC));

    // Only auto-advance after a redirect when no further validation step is
    // required. If address validation is still needed, keep the payment
    // section open so the user can continue through the normal flow.
    if (fromRedirect && !requiresAddressValidation) {
      dispatch(setPaymentMethodIsComplete(true));
      dispatch(setPaymentMethodIsEditable(true));
      dispatch(setPaymentMethodIsExpanded(false));
      dispatch(setAddressValidationIsExpanded(false));
      dispatch(setAddressValidationIsComplete(true));
      setStartPay(true);
    }
  };
  const dataChange = (invoice: Invoice) => {
    setGuestInvoices((previousInvoices) => {
      const updatedInvoices = previousInvoices.map((item: Invoice) =>
        item.billingDocumentNumber === invoice.billingDocumentNumber
          ? invoice
          : item,
      );

      sessionStorage.setItem(
        GUEST_PAYMENT_INVOICES_KEY,
        JSON.stringify(updatedInvoices),
      );

      return updatedInvoices;
    });
    setPayInvoice(invoice);
    setPaymentTotal(invoice.paymentAmount || 0);
  };

  const onPaymentTypeChange = (event) => {
    const selectedPaymentType = event.target.value;
    dispatch(setPaymentMethodIsCreditCard(selectedPaymentType === 'card'));
    setPaymentType(selectedPaymentType);
    setPaymentMethodType(selectedPaymentType === 'card' ? 'CC' : 'EC');
  };

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

  const doPreAuthenticationIfRequired = async (
    shouldPreAuthenticate: boolean,
    isFromAddressValidation = false,
  ) => {
    if (!shouldPreAuthenticate) {
      return true;
    }

    const activeCard = paymentCards[0];
    if (!activeCard) {
      return false;
    }

    const selectedPayerData = finalPayerData;

    const payerAccountDetails: PayerDetails = {
      customerNumber: selectedPayerData.customerNumber ?? '',
      companyCode: selectedPayerData.companyCode ?? '',
      paymentCards: [],
    };

    const requestPaymentMethod: GuestPaymentCardSubmission = {
      paymentCardType: activeCard.sapCardType || activeCard.paymentCardType,
      paymentCardToken: activeCard.paymentCardToken || '',
      paymentCardName: activeCard.paymentCardName,
      validFrom: activeCard.validFrom || '',
      validTo: activeCard.validTo || '',
      default: activeCard?.default ? 'X' : '',
      cardValidationCode: isCVVValidationEnabled ? cardValidationCode : '',
      vRef: activeCard.vRef,
    };

    const isAVSIsFullAddressLevel =
      addressValidationOptions?.toLowerCase() !== ADDRESS_VALIDATION_OFF &&
      addressValidationOptions?.toLowerCase() !== 'zip';

    const requestAddressData: AddressData = {
      name: isAVSIsFullAddressLevel ? addressInputValue : '',
      name2: '',
      city: isAVSIsFullAddressLevel ? cityInputValue : '',
      district: '',
      street: '',
      postalCodeCity: zipcodeInputValue,
      region: isAVSIsFullAddressLevel ? stateInputValue : '', // Todo: confirm if state should be sent in region or district field
      country: '',
    };

    try {
      const response = await doPreAuthentication(
        payerAccountDetails,
        requestPaymentMethod,
        undefined,
        isFromAddressValidation ? requestAddressData : undefined,
      );

      const isAmexPreAuthAllowedResponse =
        activeCard.paymentCardType === 'AMEX' &&
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

        setStartPay(false);

        if (addressValidationErrorMessage) {
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
          showToastMessage('error', cvvValidationErrorMessage);
          return false;
        }

        if (isFromAddressValidation) {
          dispatch(
            setAddressValidationErrorMessage(f('avs.page.address.nomatch')),
          );
          dispatch(setAddressValidationIsExpanded(true));
          dispatch(setAddressValidationIsEditable(false));
        } else {
          dispatch(setPaymentMethodIsEditable(false));
          dispatch(setPaymentMethodIsExpanded(true));
        }

        return false;
      }

      dispatch(setAddressValidationErrorMessage(''));
      return true;
    } catch {
      setStartPay(false);
      showToastMessage('error', 'Failed the pre-authentication check');
      return false;
    }
  };

  const continueClick = () => {
    const isValid = paymentInvoiceListRef.current?.validateAll() ?? false;
    if (isValid) {
      dispatch(setPaymentMethodIsComplete(true));
      dispatch(setPaymentMethodIsEditable(true));
      dispatch(setPaymentMethodIsExpanded(false));
      dispatch(
        setAddressValidationIsExpanded(
          enablePreAuth && paymentMethodIsCreditCard,
        ),
      );
    }

    if (
      isValid &&
      (!enablePreAuth ||
        addressValidationOptions?.toLowerCase() === ADDRESS_VALIDATION_OFF ||
        !paymentMethodIsCreditCard ||
        addressValidationIsComplete)
    ) {
      setStartPay(true);
    }
  };

  const cancelClick = () => {
    setStartPay(false);
    setIsPaymentAdded(false);
    dispatch(setPaymentMethodIsEditable(false));
    setPaymentCards([]);
    setCardValidationCode('');
  };

  const onPay = async () => {
    const isValid = paymentInvoiceListRef.current?.validateAll() ?? false;
    if (!isValid || finalInvoices.length === 0) {
      showToastMessage('error', f('error.correct_prompt'));
      return;
    }

    if (sendEmailReceipt) {
      if (email.trim().length === 0) {
        setEmailError(f('user.error.email'));
        showToastMessage('error', f('error.correct_prompt'));
        return;
      } else if (!emailValidationRegex.test(email.trim().toLowerCase())) {
        setEmailError(f('user.error.email.bad'));
        showToastMessage('error', f('error.correct_prompt'));
        return;
      }
    }

    //build invoice object
    const buildDocument: Invoice = {
      documentNumberFinance: payInvoice.documentNumberFinance,
      lineItemInTheRelevantInvoice: payInvoice.lineItemInTheRelevantInvoice,
      fiscalYearOfTheRelevantInvoice: payInvoice.fiscalYearOfTheRelevantInvoice,
      openAmount: payInvoice.openAmount,
      paymentAmount: payInvoice.paymentAmount,
      currencyKey: currencyKey,
      reason: payInvoice.reason,
      referenceNumber: payInvoice.referenceNumber,
      billingDocumentNumber: payInvoice.billingDocumentNumber,
      description: payInvoice.description,
      documentDate: payInvoice.documentDate,
      soldtoNumber: payInvoice.soldtoNumber ?? '',
      payerNumber: payInvoice.payerNumber ?? '',
    };

    const address = finalAddress;
    const selectedPayerData = finalPayerData;

    const mappedInvoices: Invoice[] = [buildDocument];

    const paymentCard = paymentCards[0];
    const cardinalData = paymentCard.cardinalData;
    const threeDSAccessToken = paymentCard.threeDSAccessToken;

    const paymentDetails: PaymentDetail = {
      paymentMethod: paymentCard.paymentCardType === 'EC' ? 'EC' : 'CC',
      paymentCardType: paymentCard.sapCardType || paymentCard.paymentCardType,
      paymentCardToken: paymentCard.paymentCardToken,
      paymentCardName: paymentCard.paymentCardName,
      validTo: paymentCard.validTo ? paymentCard.validTo : '',
      electronicCheckAccountType: paymentCard.electronicCheckAccountType ?? '',
      electronicCheckRdfiNumber: paymentCard.electronicCheckRdfiNumber ?? '',
      cardValidationCode: paymentCard.vRef ? '' : cardValidationCode,
      validFrom: '',
      companyAddress: address,
      cardinalData: cardinalData,
    };

    const paymentRequest: GuestPaymentRequest = {
      payer: selectedPayerData,
      payment: paymentDetails,
      soldTo: {
        accountNumber: selectedPayerData.customerNumber ?? '',
      },
      invoices: mappedInvoices,
      guestUserEmail: email,
      threeDSAccessToken: threeDSAccessToken,
      cardinalData: cardinalData,
      vRef: paymentCard.vRef,
    };

    const paidInvoices: Invoice[] = [payInvoice];

    postGuestPayment(paymentRequest).then(
      (response) => {
        navigate('/payment/guest/receipt', {
          state: {
            invoices: paidInvoices,
            responseData: response,
            payment: paymentCard,
          },
        });
      },
      (error) => {
        navigate('/payment/guest/receipt', {
          state: {
            invoices: paidInvoices,
            responseData: {},
            payment: paymentCard,
            error: {
              isError: true,
              message: extractErrorMessage(error),
            },
          },
        });
      },
    );
  };

  const emailValidationRegex =
    /(?:[a-z0-9!#$%&"*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&"*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const s: string = e.currentTarget.value;
    setEmail(s);

    if (s.trim().length === 0) {
      setEmailError(f('user.error.email'));
    } else if (!emailValidationRegex.test(s.trim().toLowerCase())) {
      setEmailError(f('user.error.email.bad'));
    } else {
      setEmailError('');
    }
  };

  // Handle Address Validation
  const handleAddressValidation = async () => {
    const isPreAuthenticationSuccessful = await doPreAuthenticationIfRequired(
      true,
      true,
    );

    if (!isPreAuthenticationSuccessful) {
      return;
    }

    dispatch(setAddressValidationIsComplete(true));
    dispatch(setAddressValidationIsExpanded(false));
    dispatch(setPaymentMethodIsEditable(true));
    dispatch(setAddressValidationIsEditable(true));
    setStartPay(true);
  };

  const handleClearAddressValidation = () => {
    dispatch(setAddressValidationErrorMessage(''));
    dispatch(clearAddressValidation());
    setStartPay(false);
  };

  const handleEditAddressValidation = (sectionType: string) => {
    dispatch(editAddressValidation(sectionType));
    if (sectionType === 'Payment') {
      setStartPay(false);
    }
  };

  useEffect(() => {
    if (!paymentCards) return;

    const ccMax = paymentConfig?.maximumAllowedCCAmount || 0;
    const ecMax = paymentConfig?.maximumAllowedECAmount || 0;
    const symbol = toCurrencySymbol(currencyKey);

    const limits = {
      [PaymentTypes.CC]: {
        max: ccMax,
        noteKey: 'payment.cclimt',
        formatted: `${symbol}${ccMax}`,
      },
      [PaymentTypes.EC]: {
        max: ecMax,
        noteKey: 'payment.eclimt',
        formatted: `${symbol}${ecMax}`,
      },
    };

    const { max, noteKey, formatted } =
      limits[paymentMethodType] || limits[PaymentTypes.CC];

    // set note
    setpaymentNote(max === 0 ? ' ' : f(noteKey).replace('{amount}', formatted));
  }, [paymentCards, paymentConfig]);

  return (
    <>
      <Box
        width="100%"
        marginTop="1rem"
        sx={{
          flexGrow: 1,
        }}
      >
        <Grid container flexDirection="column" rowGap="2rem">
          <Grid
            container
            spacing={{ xs: 2, sm: 0 }}
            sx={{ minHeight: '56px', alignItems: 'flex-start' }}
          >
            <EpayPageHeaderText
              header={f('guest.header.GuestPayment')}
              subheader={null}
            />
          </Grid>

          <Grid item container flexDirection="row" xs={12}>
            <Grid
              item
              container
              sm={8}
              md={8}
              lg={8}
              sx={{ paddingRight: { xs: 0, md: '12px' } }}
            >
              <EpayBox
                sx={{
                  padding: '0px',
                  minWidth: { xs: 'auto', sm: '100%' },
                  position: 'relative',
                }}
              >
                <Grid
                  item
                  container
                  sm={12}
                  md={12}
                  lg={12}
                  direction={'column'}
                >
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
                    sm={12}
                    sx={{
                      backgroundColor: '#F8F9F9',
                      borderRadius: `${theme.shape.borderRadius}px`,
                      borderColor: '#DFE1E6 !important',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      margin: '20px',
                    }}
                  >
                    <PaymentInvoiceList
                      ref={paymentInvoiceListRef}
                      invoices={finalInvoices}
                      config={paymentConfig}
                      currencyOptions={currencyOptions}
                      onChange={dataChange}
                      paymentSource="Guest"
                      companyCode={finalPayerData.companyCode}
                      paymentMethodType={paymentMethodType}
                    />
                  </Grid>
                </Grid>
              </EpayBox>
            </Grid>
            <Grid
              item
              container
              sm={4}
              md={4}
              lg={4}
              sx={{ paddingLeft: { xs: 0, md: '12px' } }}
            >
              <Grid
                container
                sx={{
                  minHeight: '100%',
                }}
                justifyContent="space-between"
              >
                <Grid item xs={12} sm={12} md={12} lg={12}>
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
                    {!isPaymentAdded && (
                      <>
                        <Grid
                          item
                          container
                          flex={'row'}
                          xs={12}
                          sm={12}
                          lg={12}
                        >
                          <RadioGroup
                            row
                            aria-labelledby="demo-radio-buttons-group-label"
                            defaultValue={paymentType}
                            name="radio-buttons-group"
                            onChange={onPaymentTypeChange}
                            sx={{ gap: '50px' }}
                          >
                            <FormControlLabel
                              value="card"
                              control={
                                <Radio
                                  size="small"
                                  sx={{
                                    color: primaryButtonColor,
                                    '&.Mui-checked': {
                                      color: primaryButtonColor,
                                    },
                                  }}
                                />
                              }
                              label={
                                <Typography variant="body2">
                                  {f('payment.type.creditcard')}
                                </Typography>
                              }
                            />
                            <FormControlLabel
                              value="check"
                              control={
                                <Radio
                                  size="small"
                                  sx={{
                                    color: primaryButtonColor,
                                    '&.Mui-checked': {
                                      color: primaryButtonColor,
                                    },
                                  }}
                                />
                              }
                              label={
                                <Typography variant="body2">
                                  {f('payment.type.echeck')}
                                </Typography>
                              }
                            />
                          </RadioGroup>
                        </Grid>

                        <Grid item>
                          <Stack
                            direction="row"
                            alignItems="center"
                            sx={{
                              cursor: 'pointer',
                              color: theme.palette.interactiveColor,
                              padding: '20px 20px 0px 0px',
                            }}
                            spacing={1}
                            onClick={handleOpen}
                          >
                            <AddCardIcon />
                            <Typography variant="body2">
                              Add Payment Method
                            </Typography>
                          </Stack>
                        </Grid>
                      </>
                    )}
                    {/* Cards Section */}
                    {isPaymentAdded && (
                      <>
                        <Grid
                          item
                          sm={6}
                          lg={12}
                          sx={{
                            padding: '5px 0 1.3rem 0',
                          }}
                        >
                          <Box
                            sx={{
                              '& .MuiGrid-item': {
                                margin: '0 !important',
                              },
                              width: '100%',
                            }}
                          >
                            <CreditCardList
                              cards={paymentCards}
                              type={'card'}
                              isGuestPayment={true}
                            ></CreditCardList>
                          </Box>
                        </Grid>
                        {paymentMethodType && (
                          <Grid
                            item
                            sm={6}
                            lg={12}
                            sx={{
                              padding: '0',
                            }}
                          >
                            <Box
                              mb="1.3rem"
                              sx={{
                                color: theme.palette.error.main,
                              }}
                            >
                              <Typography
                                variant="fieldHeader"
                                display={
                                  paymentMethodType === '' ? 'none' : 'block'
                                }
                              >
                                {paymentNote}
                              </Typography>
                            </Box>
                          </Grid>
                        )}
                        {!startPay && (
                          <Grid
                            item
                            container
                            sm={12}
                            lg={12}
                            direction={'row'}
                            justifyContent="flex-end"
                          >
                            <Grid item>
                              <Button
                                variant="outlined"
                                color="secondary"
                                onClick={cancelClick}
                              >
                                {f('payment_methods.cancel_button')}
                              </Button>
                            </Grid>
                            <Grid item sx={{ marginLeft: '15px' }}>
                              <Button
                                variant="contained"
                                color="primary"
                                onClick={continueClick}
                              >
                                {f('user.register.continue')}
                              </Button>
                            </Grid>
                          </Grid>
                        )}
                      </>
                    )}
                  </EpayAccordion>
                </Grid>
                <Grid item xs={12} sm={12} md={12} lg={12}>
                  {enablePreAuth &&
                    addressValidationOptions?.toLowerCase() ===
                      ADDRESS_VALIDATION_ZIP &&
                    paymentMethodIsCreditCard && (
                      <Box
                        id="sidebar"
                        width="100%"
                        sx={{
                          minHeight: '100%',
                        }}
                        justifyContent="space-between"
                      >
                        <AddressZipValidation
                          handleAddressValidation={handleAddressValidation}
                          editAddressValidation={handleEditAddressValidation}
                          clearAddressValidation={handleClearAddressValidation}
                        />
                      </Box>
                    )}
                  {enablePreAuth &&
                    addressValidationOptions?.toLowerCase() !==
                      ADDRESS_VALIDATION_OFF &&
                    addressValidationOptions?.toLowerCase() !==
                      ADDRESS_VALIDATION_ZIP &&
                    paymentMethodIsCreditCard && (
                      <Box
                        id="sidebar"
                        width="100%"
                        sx={{
                          minHeight: '100%',
                        }}
                        justifyContent="space-between"
                      >
                        <AddressValidation
                          handleAddressValidation={handleAddressValidation}
                          editAddressValidation={handleEditAddressValidation}
                          clearAddressValidation={handleClearAddressValidation}
                        />
                      </Box>
                    )}
                </Grid>
                {/* This will be at the bottom */}
                <Grid
                  item
                  sm={12}
                  md={12}
                  lg={12}
                  sx={{
                    flexGrow: 1, // This pushes the Box to the bottom
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    marginTop: '1rem',
                  }}
                >
                  <EpayBox>
                    <Grid
                      container
                      item
                      flexDirection="column"
                      sm={12}
                      md={12}
                      lg={12}
                    >
                      <Grid
                        item
                        container
                        sm={12}
                        md={12}
                        lg={12}
                        sx={{
                          padding: '1.3rem',
                        }}
                      >
                        <Grid
                          container
                          sx={{ justifyContent: 'space-between' }}
                        >
                          <Grid item lg={9}>
                            <Typography
                              variant="fieldHeader"
                              sx={{
                                color: '#808897',
                              }}
                            >
                              {f('payment.pay_amount')}
                            </Typography>
                          </Grid>

                          <Grid item lg={3}>
                            <Typography
                              variant="body2"
                              sx={{ textAlign: 'right' }}
                            >
                              {`${toCurrencyString(currencyKey, paymentTotal, false, regionalFormat)}`}
                            </Typography>
                          </Grid>
                        </Grid>
                        <Grid
                          container
                          sx={{
                            paddingTop: '10px',
                            borderTop: '1px solid',
                            borderTopColor: '#E0E0E0',
                            marginTop: 2,
                            justifyContent: 'space-between',
                          }}
                        >
                          <Grid item lg={9}>
                            <Typography
                              variant="fieldHeader"
                              sx={{
                                color: '#808897',
                              }}
                            >
                              {f('invoices.table.total')}
                            </Typography>
                          </Grid>
                          <Grid item lg={3}>
                            <Typography
                              variant="body2"
                              sx={{ textAlign: 'right' }}
                            >
                              {`${toCurrencyString(currencyKey, paymentTotal, false, regionalFormat)}`}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Grid>
                      <Grid
                        item
                        container
                        direction={'column'}
                        padding="0 20px 20px"
                      >
                        <Grid container alignItems="center">
                          <EpayCheckBox
                            checked={sendEmailReceipt}
                            onClick={() => {
                              setSendEmailReceipt(!sendEmailReceipt);
                              setEmailError('');
                            }}
                          />
                          <Typography
                            variant="fieldHeader"
                            sx={{
                              color: '#808897',
                              marginLeft: '0.5rem',
                              marginTop: '5px',
                            }}
                          >
                            {f('guest.email.checkbox')}
                          </Typography>
                        </Grid>
                        {sendEmailReceipt && (
                          <Grid marginTop="1rem">
                            <Grid item>
                              <Typography
                                variant="fieldHeader"
                                sx={{
                                  color: '#808897',
                                  '&::after': {
                                    content: '" *"',
                                    color: 'red',
                                    marginTop: '4px',
                                  },
                                }}
                              >
                                {f('guest.email.address')}
                              </Typography>
                            </Grid>
                            <Grid item paddingTop="0.5rem">
                              <TextField
                                type="email"
                                fullWidth
                                value={email || ''}
                                onChange={handleEmailChange}
                                error={!!emailError}
                                helperText={emailError}
                                required
                                sx={(muiTheme) => ({
                                  ...getCompactFilterFieldSx(muiTheme),
                                })}
                              />
                            </Grid>
                          </Grid>
                        )}
                      </Grid>
                      <Grid
                        item
                        container
                        sx={{
                          padding: '1rem 1.3rem 1.3rem',
                        }}
                      >
                        <Button
                          sx={{ height: '48px', fontSize: '16px' }}
                          variant={'contained'}
                          disabled={
                            paymentTotal <= 0 ||
                            !startPay ||
                            (isAddressValidationRequired &&
                              !addressValidationIsComplete)
                          }
                          onClick={onPay}
                          fullWidth
                        >
                          {f('payment.pay')}
                        </Button>
                      </Grid>
                    </Grid>
                  </EpayBox>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        <Grid item container justifyContent="center" marginTop="1.3rem">
          <Grid item>
            <Link
              href="/"
              onClick={clearGuestSessionStorage}
              sx={{
                textDecoration: 'none',
              }}
            >
              <Typography
                variant="body1"
                sx={{ color: theme.palette.interactiveColor }}
              >
                {f('user.go_back_login')}
              </Typography>
            </Link>
          </Grid>
        </Grid>
      </Box>
      <EpayModal
        open={open}
        onClose={handleClose}
        hideHeader
        hideFooter
        disableBackdropClose
        maxWidth={false}
        fullScreenOnMobile={false}
        paperSx={{
          width: '90%',
          maxWidth: isHosted ? '450px' : '550px',
        }}
        bodySx={{
          p: 0,
          '&.MuiDialogContent-root': {
            p: 0,
          },
          '&.MuiDialogContent-root:first-of-type': {
            p: 0,
          },
          '& > .EpayModal-bodyFrame': {
            p: 0,
            m: 0,
            minHeight: 'auto',
          },
        }}
      >
        <Grid container direction={'column'}>
          <GuestPaymentMethodFormRouter
            paymentType={paymentType as 'card' | 'check'}
            onClose={handleClose}
            handleCardProccessing={handleCardProccessing}
            guest3DSContext={guest3DSContext}
          />
        </Grid>
      </EpayModal>
    </>
  );
}

export default GuestPaymentComponent;
