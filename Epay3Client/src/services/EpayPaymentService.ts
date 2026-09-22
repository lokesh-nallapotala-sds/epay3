import {
  GuestPaymentRequest,
  PayedList,
  PayerDetails,
  GuestPaymentCardSubmission,
  PaymentCardSubmission,
  PaymentMethod,
} from 'types';
import { ErrorInfo } from 'types/ErrorInfo';
import { DepositDetails } from 'types/DepositDetails';
import {
  ThreeDSAuthenticationResultRequest,
  ThreeDSAuthenticationResultResponse,
  ThreeDSCardinalData,
  PaymentAccessToken,
  TokenResponse,
  TokenizeResponse,
} from 'types/AccountResponse';
import {
  CardOperationResponse,
  PaymentReceiptResponse,
  SapHttpStatus,
} from 'types/Payed';
import { Invoice } from 'types/InvoicesSearchRequest';
import {
  InvoicesSearchRequest,
  PaymentInvoice,
} from 'types/InvoicesSearchRequest';
import { GuestTransactionAccessTokenRequest } from 'types/Guest3DS';
import { useEpayQuery } from '../providers/EpayQueryProvider';
import { useEpayLoading } from '../providers/EpayLoadingProvider';
import { AddressData } from 'types/Payment';
import { tryParseJson } from 'utilities/utilities';

const normalizePreAuthCardOperationResponse = (
  response: CardOperationResponse | null,
): CardOperationResponse => {
  if (!response) {
    return {};
  }

  const status = response.status;
  if (!status) {
    return response;
  }

  return {
    ...response,
    message_type: response.message_type ?? status.message_type,
    message_identification:
      response.message_identification ?? status.message_identification,
    message_number: response.message_number ?? status.message_number,
    message_line_string:
      response.message_line_string ?? status.message_line_string,
  };
};

type LoadingControls = {
  increment: () => void;
  decrement: () => void;
};

const withOptionalGlobalLoader = async <T>(
  loading: LoadingControls,
  showGlobalLoader: boolean,
  action: () => Promise<T>,
): Promise<T> => {
  if (showGlobalLoader) {
    loading.increment();
  }

  try {
    return await action();
  } finally {
    if (showGlobalLoader) {
      loading.decrement();
    }
  }
};

const parseJsonText = <T>(text: string, resp: Response, fallback: T): T => {
  if (!text) {
    return fallback;
  }

  const parsed = tryParseJson<T>(text);
  if (!parsed.success) {
    throw new ErrorInfo(
      'Invalid JSON response received from the server.',
      resp.statusText,
      resp.status,
    );
  }

  return parsed.value;
};

export const EpayPaymentService = {
  useGetPaymentMethodEntryToken(): (
    action: string,
    paymentMethod: string,
    selectedAccount: string,
    cardinalData: ThreeDSCardinalData | undefined,
    userId: string,
    showGlobalLoader?: boolean,
  ) => Promise<TokenResponse> {
    const ctx = useEpayQuery();
    const loading = useEpayLoading();

    const execute = async (
      action: string,
      paymentMethod: string,
      selectedAccount: string,
      cardinalData: ThreeDSCardinalData | undefined,
      userId: string,
      showGlobalLoader = true,
    ) =>
      withOptionalGlobalLoader(loading, showGlobalLoader, async () => {
        const resp = await ctx.getPaymentMethodEntryToken(
          action,
          paymentMethod,
          selectedAccount,
          cardinalData,
          userId,
        );
        if (resp?.ok) {
          const text = await resp.text();
          return parseJsonText<TokenResponse>(text, resp, {} as TokenResponse);
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      });

    return execute;
  },

  useGetGuestPaymentMethodEntryToken(): (
    action: string,
    paymentMethod: string,
    cardinalData: ThreeDSCardinalData | undefined,
  ) => Promise<TokenResponse> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (
      action: string,
      paymentMethod: string,
      cardinalData: ThreeDSCardinalData | undefined,
    ) => {
      try {
        increment();
        const resp = await ctx.getGuestPaymentMethodEntryToken(
          action,
          paymentMethod,
          '0',
          cardinalData,
        );
        if (resp?.ok) {
          if (resp == null) {
            return {};
          }
          return await resp.json();
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  useGetGuestTokenizeResponse(): (
    body: Record<string, unknown>,
  ) => Promise<TokenizeResponse> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (body: Record<string, unknown>) => {
      try {
        increment();
        const resp = await ctx.getGuestPaymentTokenizeResponse(body);
        if (resp?.ok) {
          return await resp.json();
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  useGetAccessToken(): (
    selectedAccount: string,
    payer: string,
    cardKey: string | null,
    currency: string,
    redirectUrl: string,
    amount: number,
    paymentMethod?: PaymentMethod | null,
    userId?: string,
    cvv?: string,
    companyCode?: string,
    showGlobalLoader?: boolean,
  ) => Promise<PaymentAccessToken> {
    const ctx = useEpayQuery();
    const loading = useEpayLoading();

    const execute = async (
      selectedAccount: string,
      payer: string,
      cardKey: string | null,
      currency: string,
      redirectUrl: string,
      amount: number,
      paymentMethod?: PaymentMethod | null,
      userId?: string,
      cvv?: string,
      companyCode?: string,
      showGlobalLoader = true,
    ) =>
      withOptionalGlobalLoader(loading, showGlobalLoader, async () => {
        const resp = await ctx.getAccessToken(
          selectedAccount,
          payer,
          cardKey,
          currency,
          redirectUrl,
          amount,
          paymentMethod,
          userId,
          cvv,
          companyCode,
        );
        if (resp?.ok) {
          const text = await resp.text();
          return parseJsonText<PaymentAccessToken>(
            text,
            resp,
            {} as PaymentAccessToken,
          );
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      });

    return execute;
  },

  useGetGuestTransactionAccessToken(): (
    request: GuestTransactionAccessTokenRequest,
  ) => Promise<PaymentAccessToken> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (request: GuestTransactionAccessTokenRequest) => {
      try {
        increment();
        const resp = await ctx.getGuestTransactionAccessToken(request);
        if (resp?.ok) {
          const text = await resp.text();
          return parseJsonText<PaymentAccessToken>(
            text,
            resp,
            {} as PaymentAccessToken,
          );
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  useGetPaymetric3DSCheck(): (
    url: string,
    data: XIPluginRequestPacket,
    version: string,
    showGlobalLoader?: boolean,
  ) => Promise<unknown> {
    const loading = useEpayLoading();

    const execute = async (
      url: string,
      data: XIPluginRequestPacket,
      version: string,
      showGlobalLoader = true,
    ) =>
      withOptionalGlobalLoader(
        loading,
        showGlobalLoader,
        () =>
          new Promise((resolve, reject) => {
            window.$XIPlugin.ajax({
              url: url + '/Cardinal3DSWithToken',
              type: 'POST',
              data: data,
              success: function (resp: unknown) {
                resolve(resp);
              },
              error: function (error: unknown, textStatus?: unknown) {
                reject({ status: error, text_status: textStatus });
              },
              threeDSVersion: version,
            });
          }),
      );

    return execute;
  },

  useGetPaymetricResponse(): (
    url: string,
    data: XIPluginRequestPacket,
    version: string,
  ) => Promise<unknown> {
    const { increment, decrement } = useEpayLoading();

    const execute = async (
      url: string,
      data: XIPluginRequestPacket,
      version: string,
    ) => {
      try {
        increment();

        return new Promise((resolve, reject) => {
          window.$XIPlugin.ajax({
            url: url + '/Ajax',
            type: 'POST',
            data: data,
            success: function () {
              resolve(data);
            },
            error: function (error: unknown, textStatus?: unknown) {
              reject({ status: error, text_status: textStatus });
            },
            threeDSVersion: version,
          });
        });
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  useGet3DSAuthenticationResult(): (
    body: ThreeDSAuthenticationResultRequest,
  ) => Promise<ThreeDSAuthenticationResultResponse> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (body: ThreeDSAuthenticationResultRequest) => {
      try {
        increment();
        const resp = await ctx.get3DSAuthenticationResult(body);
        if (resp?.ok) {
          const text = await resp.text();
          return parseJsonText<ThreeDSAuthenticationResultResponse>(
            text,
            resp,
            {},
          );
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  useGetGuest3DSAuthenticationResult(): (
    body: ThreeDSAuthenticationResultRequest,
  ) => Promise<ThreeDSAuthenticationResultResponse> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (body: ThreeDSAuthenticationResultRequest) => {
      try {
        increment();
        const resp = await ctx.getGuest3DSAuthenticationResult(body);
        if (resp?.ok) {
          const text = await resp.text();
          return parseJsonText<ThreeDSAuthenticationResultResponse>(
            text,
            resp,
            {},
          );
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  useGetTokenizeResponse(): (
    body: Record<string, unknown>,
    showGlobalLoader?: boolean,
  ) => Promise<TokenizeResponse> {
    const ctx = useEpayQuery();
    const loading = useEpayLoading();

    const execute = async (
      body: Record<string, unknown>,
      showGlobalLoader = true,
    ) =>
      withOptionalGlobalLoader(loading, showGlobalLoader, async () => {
        const resp = await ctx.getPaymentTokenizeResponse(body);

        if (resp?.ok) {
          const data = await resp.json();
          return data;
        } else {
          // Handle error response
          const message = (await resp.text()) ?? resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      });

    return execute;
  },

  useGetPaymentHistory(): (
    request: InvoicesSearchRequest,
  ) => Promise<PaymentInvoice> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (request: InvoicesSearchRequest) => {
      try {
        increment();
        const resp = await ctx.getPaymentHistory(request);
        if (resp?.ok) {
          return await resp.json();
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  usePostPayment(): (
    selectedAccount: string,
    payer: string,
    invoices: Invoice[],
    cardinalData: ThreeDSCardinalData | undefined,
    paymentMethod: PaymentMethod | null,
    cvv: string | undefined,
    userId?: string,
    threeDSAccessToken?: string,
    vRef?: string,
    companyCode?: string,
  ) => Promise<PaymentReceiptResponse> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (
      selectedAccount: string,
      payer: string,
      invoices: Invoice[],
      cardinalData: ThreeDSCardinalData | undefined,
      paymentMethod: PaymentMethod | null,
      cvv: string | undefined,
      userId?: string,
      threeDSAccessToken?: string,
      vRef?: string,
      companyCode?: string,
    ) => {
      try {
        increment();
        const resp = await ctx.postPayment(
          selectedAccount,
          payer,
          invoices,
          cardinalData,
          paymentMethod,
          cvv,
          userId,
          threeDSAccessToken,
          vRef,
          companyCode,
        );
        if (resp?.ok) {
          const text = await resp.text();
          const data = parseJsonText<PaymentReceiptResponse>(
            text,
            resp,
            {} as PaymentReceiptResponse,
          );

          if (data?.error) {
            throw new ErrorInfo(
              data.error.line ?? 'Invalid payment response.',
              'WARNING',
              resp.status,
            );
          }
          return data;
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  usePostGuestPayment(): (
    payment: GuestPaymentRequest,
  ) => Promise<PaymentReceiptResponse> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (payment: GuestPaymentRequest) => {
      try {
        increment();
        const resp = await ctx.postGuestPayment(payment);
        if (resp?.ok) {
          const text = await resp.text();
          const data = parseJsonText<PaymentReceiptResponse>(
            text,
            resp,
            {} as PaymentReceiptResponse,
          );

          if (data?.error) {
            throw new ErrorInfo(
              data.error.line ?? 'Invalid payment response.',
              'WARNING',
              resp.status,
            );
          }
          return data;
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  useAddPaymentCard(): (
    payer: PayerDetails,
    paymentCards: PaymentCardSubmission,
    userId?: string,
    showGlobalLoader?: boolean,
  ) => Promise<CardOperationResponse> {
    const ctx = useEpayQuery();
    const loading = useEpayLoading();

    const execute = async (
      payer: PayerDetails,
      paymentCards: PaymentCardSubmission,
      userId?: string,
      showGlobalLoader = true,
    ) =>
      withOptionalGlobalLoader(loading, showGlobalLoader, async () => {
        const resp = await ctx.sendAddPaymentCardRequest(
          payer,
          paymentCards,
          userId,
        );
        if (resp?.ok) {
          const text = await resp.text();
          return parseJsonText<CardOperationResponse>(
            text,
            resp,
            {} as CardOperationResponse,
          );
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      });

    return execute;
  },

  DoPreAuthentication(): (
    payer: PayerDetails,
    paymentCards: PaymentCardSubmission,
    userId?: string,
    addressData?: AddressData,
  ) => Promise<CardOperationResponse> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (
      payer: PayerDetails,
      paymentCards: PaymentCardSubmission,
      userId?: string,
      addressData?: AddressData,
    ) => {
      try {
        increment();
        const resp = await ctx.DoPreAuthentication(
          payer,
          paymentCards,
          userId,
          addressData,
        );
        if (resp?.ok) {
          return normalizePreAuthCardOperationResponse(await resp.json());
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  DoGuestPaymentPreAuthentication(): (
    payer: PayerDetails,
    paymentCards: GuestPaymentCardSubmission,
    userId?: string,
    addressData?: AddressData,
  ) => Promise<CardOperationResponse> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (
      payer: PayerDetails,
      paymentCards: GuestPaymentCardSubmission,
      userId?: string,
      addressData?: AddressData,
    ) => {
      try {
        increment();
        const resp = await ctx.DoGuestPaymentPreAuthentication(
          payer,
          paymentCards,
          userId,
          addressData,
        );
        if (resp?.ok) {
          return normalizePreAuthCardOperationResponse(await resp.json());
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  useUpdatePaymentCard(): (
    payer: PayerDetails,
    paymentCards: PaymentCardSubmission,
    userId?: string,
  ) => Promise<CardOperationResponse> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (
      payer: PayerDetails,
      paymentCards: PaymentCardSubmission,
      userId?: string,
    ) => {
      try {
        increment();
        const resp = await ctx.sendUpdatePaymentCardRequest(
          payer,
          paymentCards,
          userId,
        );
        if (resp?.ok) {
          return await resp.json();
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  useDeletePaymentCard(): (
    payer: PayerDetails,
    paymentCards: PaymentCardSubmission,
    userId?: string,
  ) => Promise<CardOperationResponse> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (
      payer: PayerDetails,
      paymentCards: PaymentCardSubmission,
      userId?: string,
    ) => {
      try {
        increment();
        const resp = await ctx.sendDeletePaymentCardRequest(
          payer,
          paymentCards,
          userId,
        );
        if (resp?.ok) {
          return await resp.json();
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  usePostDeposit(): (
    selectedAccount: string,
    payer: string,
    depositDetails: DepositDetails,
    cardinalData: ThreeDSCardinalData | undefined,
    paymentMethod: PaymentMethod | null,
    cvv: string | undefined,
    userId?: string,
    companyCode?: string,
    threeDSAccessToken?: string,
    vRef?: string,
  ) => Promise<PayedList> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (
      selectedAccount: string,
      payer: string,
      depositDetails: DepositDetails,
      cardinalData: ThreeDSCardinalData | undefined,
      paymentMethod: PaymentMethod | null,
      cvv: string | undefined,
      userId?: string,
      companyCode?: string,
      threeDSAccessToken?: string,
      vRef?: string,
    ) => {
      try {
        increment();
        const resp = await ctx.postDeposit(
          selectedAccount,
          depositDetails,
          payer,
          cardinalData,
          paymentMethod,
          cvv,
          userId,
          companyCode,
          threeDSAccessToken,
          vRef,
        );
        if (resp?.ok) {
          const text = await resp.text();
          const data = parseJsonText<PayedList & { error?: { line?: string } }>(
            text,
            resp,
            {} as PayedList & { error?: { line?: string } },
          );

          if (data?.error) {
            throw new ErrorInfo(
              data.error.line ?? 'Invalid deposit response.',
              'WARNING',
              resp.status,
            );
          }
          return data;
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  useEnableAutoPayCard(): (
    selectedAccount: string,
    payer: string,
    companyCode: string,
    cardToken: string,
    isAutoPayEnrolled?: boolean,
    userId?: string,
  ) => Promise<CardOperationResponse> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (
      selectedAccount: string,
      payer: string,
      companyCode: string,
      cradToken: string,
      isAutoPayEnrolled?: boolean,
      userId?: string,
    ) => {
      try {
        increment();
        const resp = await ctx.EnableCardAutoPay(
          selectedAccount,
          payer,
          companyCode,
          cradToken,
          isAutoPayEnrolled,
          userId,
        );
        if (resp?.ok) {
          return await resp.json();
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  usePostScheduledPayment(): (
    selectedAccount: string,
    payer: string,
    invoices: Invoice[],
    cardinalData: ThreeDSCardinalData | undefined,
    paymentMethod: PaymentMethod | null,
    cvv: string | undefined,
    userId?: string,
    scheduledDate?: string,
    threeDSAccessToken?: string,
    vRef?: string,
    companyCode?: string,
  ) => Promise<SapHttpStatus> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (
      selectedAccount: string,
      payer: string,
      invoices: Invoice[],
      cardinalData: ThreeDSCardinalData | undefined,
      paymentMethod: PaymentMethod | null,
      cvv: string | undefined,
      userId?: string,
      scheduledDate?: string,
      threeDSAccessToken?: string,
      vRef?: string,
      companyCode?: string,
    ) => {
      try {
        increment();
        const resp = await ctx.postScheduledPayment(
          selectedAccount,
          payer,
          invoices,
          cardinalData,
          paymentMethod,
          cvv,
          userId,
          scheduledDate,
          threeDSAccessToken,
          vRef,
          companyCode,
        );
        if (resp?.ok) {
          const text = await resp.text();
          const data = parseJsonText<
            SapHttpStatus & { error?: { line?: string } }
          >(text, resp, {} as SapHttpStatus & { error?: { line?: string } });

          if (data?.error) {
            throw new ErrorInfo(
              data.error.line ?? 'Invalid schedule response.',
              'WARNING',
              resp.status,
            );
          }
          return data;
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  useDeleteScheduledPayment(): (
    scheduledPaymentId: string,
    companyCode: string,
    customerNumber: string,
    payer: string,
    userId?: string,
  ) => Promise<void> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (
      scheduledPaymentId: string,
      companyCode: string,
      customerNumber: string,
      payer: string,
      userId?: string,
    ) => {
      try {
        increment();
        const resp = await ctx.deleteScheduledPayment(
          scheduledPaymentId,
          companyCode,
          customerNumber,
          payer,
          userId,
        );
        if (resp?.ok) {
          const text = await resp.text();
          const data = parseJsonText<{ error?: { line?: string } }>(
            text,
            resp,
            {},
          );

          if (data?.error) {
            throw new ErrorInfo(
              data.error.line ?? 'Invalid delete response.',
              'WARNING',
              resp.status,
            );
          }
          return;
        } else {
          const message = (await resp.text()) || resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  useUnEnrollAutoPay(): (
    selectedAccount: string,
    payer: string,
    companyCode: string,
    userId?: string,
  ) => Promise<CardOperationResponse> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (
      selectedAccount: string,
      payer: string,
      companyCode: string,
      userId?: string,
    ) => {
      try {
        increment();
        const resp = await ctx.UnEnrollAutoPay(
          selectedAccount,
          payer,
          companyCode,
          userId,
        );
        if (resp?.ok) {
          return await resp.json();
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  // Cache controls removed per request
};
