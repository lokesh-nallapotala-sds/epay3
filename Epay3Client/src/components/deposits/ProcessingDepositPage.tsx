import { useEffect, useRef, useState } from 'react';

import { PayedList } from 'types';
import { useSelector } from 'react-redux';

import useEpayNavigate from 'hooks/useEpayNavigate';
import {
  enrichPaymentMethodTypeFields,
  removeIframeById,
} from 'utilities/utilities';
import { Deposit3dsRedirectSession } from 'utilities/deposit3dsRedirectSession';
import { useAppDispatch, useAppSelector } from 'redux/hooks';
import { EpayPaymentService } from 'services/EpayPaymentService';
import { PaymentMethod } from 'types/Payment';
import {
  clearDepositDetails,
  depositDetailsSelector,
  impersonatedUserSelector,
  payerSelector,
  selectedPaymentMethodSelector,
} from 'redux/reducers';

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

export default function ProcessingDepositPage() {
  const { location, navigate } = useEpayNavigate();
  const dispatch = useAppDispatch();
  const search = new URLSearchParams(location.search);
  const depositDetails = useSelector(depositDetailsSelector);
  const paymentMethod = useSelector(selectedPaymentMethodSelector);
  const payer = useSelector(payerSelector);
  const redirectSessionRef = useRef(Deposit3dsRedirectSession.load());
  const redirectSession = redirectSessionRef.current;
  const resolvedDepositDetails =
    depositDetails ?? redirectSession?.depositDetails ?? null;
  const resolvedPaymentMethod =
    paymentMethod ?? redirectSession?.paymentMethod ?? null;
  const resolvedPayer = payer || redirectSession?.payer || '';
  const impersonatedUser = useAppSelector(impersonatedUserSelector);
  const impersonatedUserId = impersonatedUser
    ? impersonatedUser.userId
    : undefined;

  const selectedAccount = useAppSelector(
    (state) => state.account.selectedAccount,
  );

  const get3DSAuthenticationResult =
    EpayPaymentService.useGet3DSAuthenticationResult();
  const postDeposit = EpayPaymentService.usePostDeposit();

  const [shouldNavigate, setShouldNavigate] = useState(false);
  const [paymentResponse, setPaymentResponse] = useState<PayedList | null>(
    null,
  );
  const [receiptPaymentMethod, setReceiptPaymentMethod] = useState(
    resolvedPaymentMethod,
  );
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const hasCalled = useRef(false);
  const accessToken = search.get('id');

  const cleanup = () => {
    dispatch(clearDepositDetails());
    Deposit3dsRedirectSession.clear();
    removeIframeById('cardinal_iframe_post');
  };

  useEffect(() => {
    if (hasCalled.current) return;

    if (accessToken && selectedAccount && resolvedDepositDetails) {
      hasCalled.current = true;

      (async () => {
        const { cardinalData, vRef, v_ref } = await get3DSAuthenticationResult({
          accessToken: accessToken,
        });
        const urlPaymentMethod = getPaymentMethodFromSearch(search);
        const resolvedReceiptPaymentMethod =
          resolvedPaymentMethod ?? urlPaymentMethod;
        const resolvedVRef =
          vRef || v_ref || redirectSession?.vRef || undefined;
        setReceiptPaymentMethod(resolvedReceiptPaymentMethod ?? null);

        postDeposit(
          selectedAccount.primaryAcct,
          resolvedPayer,
          resolvedDepositDetails,
          cardinalData,
          resolvedReceiptPaymentMethod,
          undefined,
          impersonatedUserId,
          selectedAccount.companyCode,
          accessToken,
          resolvedVRef,
        ).then(
          (resp) => {
            setPaymentResponse(resp);
            setShouldNavigate(true);
          },
          (error) => {
            setErrorMessage(error?.message || 'Unknown error occurred');
            setIsError(true);
          },
        );
      })();
    } else if (!accessToken) {
      navigate('/home');
    }
  }, [
    accessToken,
    get3DSAuthenticationResult,
    impersonatedUserId,
    navigate,
    postDeposit,
    redirectSession,
    resolvedDepositDetails,
    resolvedPayer,
    resolvedPaymentMethod,
    search,
    selectedAccount,
  ]);

  useEffect(() => {
    if (shouldNavigate && paymentResponse) {
      cleanup();
      navigate('/payment/deposits/receipt', {
        state: {
          depositDetails: resolvedDepositDetails,
          responseData: paymentResponse,
          payment: receiptPaymentMethod,
        },
      });
    }
  }, [
    navigate,
    paymentResponse,
    receiptPaymentMethod,
    resolvedDepositDetails,
    shouldNavigate,
  ]);

  useEffect(() => {
    if (!isError) return;
    cleanup();
    navigate('/payment/deposits/receipt', {
      state: {
        depositDetails: resolvedDepositDetails,
        responseData: null,
        payment: receiptPaymentMethod,
        error: {
          isError: true,
          message: errorMessage,
        },
      },
    });
  }, [
    errorMessage,
    isError,
    navigate,
    receiptPaymentMethod,
    resolvedDepositDetails,
  ]);

  return <div />;
}
