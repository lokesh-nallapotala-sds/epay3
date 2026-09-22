import { useEffect, useRef, useState } from 'react';

import { useSelector } from 'react-redux';

import useEpayNavigate from 'hooks/useEpayNavigate';
import {
  enrichPaymentMethodTypeFields,
  removeIframeById,
} from 'utilities/utilities';
import { useAppDispatch, useAppSelector } from 'redux/hooks';
import { EpayPaymentService } from 'services/EpayPaymentService';
import { PaymentMethod } from 'types/Payment';
import { PaymentReceiptResponse } from 'types/Payed';
import {
  impersonatedUserSelector,
  mappedInvoicesSelector,
  payerSelector,
  setPayer as removeSelectedPayer,
  setSoldTo as removeSelectedSoldTo,
  selectedPaymentMethodSelector,
} from 'redux/reducers';
import { clearPaymentSession3DS } from 'redux/reducers/paymentSlice';

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
    cardLast4Digit: search.get('pml4') || undefined,
  });
};

export default function ProcessingPaymentPage() {
  const { location, navigate } = useEpayNavigate();

  const search = new URLSearchParams(location.search);
  const dispatch = useAppDispatch();
  const mappedInvoices = useSelector(mappedInvoicesSelector);
  const paymentMethod = useSelector(selectedPaymentMethodSelector);
  const payer = useSelector(payerSelector);
  const impersonatedUser = useAppSelector(impersonatedUserSelector);
  const impersonatedUserId = impersonatedUser
    ? impersonatedUser.userId
    : undefined;

  const selectedAccount = useAppSelector(
    (state) => state.account.selectedAccount,
  );
  const accessToken = search.get('id');
  const get3DSAuthenticationResult =
    EpayPaymentService.useGet3DSAuthenticationResult();
  const postPayment = EpayPaymentService.usePostPayment();

  const [shouldNavigate, setShouldNavigate] = useState(false);
  const [paymentResponse, setPaymentResponse] =
    useState<PaymentReceiptResponse | null>(null);
  const [receiptPaymentMethod, setReceiptPaymentMethod] =
    useState(paymentMethod);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const hasCalled = useRef(false);

  useEffect(() => {
    if (hasCalled.current) return;

    if (accessToken && selectedAccount) {
      hasCalled.current = true;

      (async () => {
        try {
          const { cardinalData, vRef, v_ref } =
            await get3DSAuthenticationResult({
              accessToken: accessToken,
            });
          const urlPaymentMethod = getPaymentMethodFromSearch(search);
          const resolvedPaymentMethod = paymentMethod ?? urlPaymentMethod;
          const storedVRef =
            sessionStorage.getItem('payment.vRef') || undefined;
          sessionStorage.removeItem('payment.vRef');
          const resolvedVRef = vRef || v_ref || storedVRef || undefined;
          setReceiptPaymentMethod(resolvedPaymentMethod ?? null);

          postPayment(
            selectedAccount.primaryAcct,
            payer,
            mappedInvoices,
            cardinalData,
            resolvedPaymentMethod,
            undefined,
            impersonatedUserId,
            accessToken,
            resolvedVRef,
            selectedAccount.companyCode,
          ).then(
            (response) => {
              setPaymentResponse(response);
              setShouldNavigate(true);
            },
            (error) => {
              setErrorMessage(error?.message || 'Unknown error occurred');
              setIsError(true);
            },
          );
        } catch (error) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unknown error occurred',
          );
          setIsError(true);
        }
      })();
    } else if (!accessToken) {
      navigate('/home');
    }
  }, [accessToken, selectedAccount]);

  const cleanup = () => {
    dispatch(removeSelectedPayer(''));
    dispatch(removeSelectedSoldTo(''));
    removeIframeById('cardinal_iframe_post');
    clearPaymentSession3DS();
  };

  useEffect(() => {
    if (shouldNavigate && paymentResponse) {
      cleanup();
      navigate('/payment/session/receipt', {
        state: {
          invoices: mappedInvoices,
          responseData: paymentResponse,
          payment: receiptPaymentMethod,
          error: {
            isError: false,
            message: '',
          },
        },
      });
    }
  }, [shouldNavigate, paymentResponse, navigate]);

  useEffect(() => {
    if (!isError) return;
    navigate('/payment/session/receipt', {
      state: {
        invoices: mappedInvoices,
        responseData: [],
        payment: receiptPaymentMethod,
        error: {
          isError: true,
          message: errorMessage,
        },
      },
    });
    cleanup();
  }, [isError, errorMessage]);

  return <div />;
}
