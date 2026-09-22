import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { handleMaintenanceStatusPayload } from 'utilities/maintenance';
import type { HelpConfigRequest } from 'types/AppConfigRequest';
import type PaymentReasonCode from 'types/SapConfig/PaymentReasonCode';
import type {
  PayerDetails,
  PaymentCard,
  PaymentCardSubmission,
  PaymentConfig,
} from 'types/Payment';
import type { UserAccountsResponse } from 'types/Account';
import type { CardOperationResponse } from 'types/Payed';

// Safe HTTP methods that don't require a CSRF token
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);

// Module-level CSRF token cache — mirrors DotNetService.getCsrfToken()
let csrfCache: string | null = null;
let csrfInflight: Promise<string | null> | null = null;

async function fetchCsrfToken(): Promise<string | null> {
  if (csrfCache) return csrfCache;
  if (csrfInflight) return csrfInflight;

  csrfInflight = fetch('/api/csrf/token', {
    method: 'GET',
    credentials: 'include',
  })
    .then(async (r) => {
      if (!r.ok) return null;
      const body = (await r.json()) as { token: string };
      csrfCache = body.token ?? null;
      return csrfCache;
    })
    .catch(() => null)
    .finally(() => {
      csrfInflight = null;
    });

  return csrfInflight;
}

export function clearEpayCsrfToken(): void {
  csrfCache = null;
  csrfInflight = null;
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/',
  credentials: 'include',
  prepareHeaders: (headers) => {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    headers.set('Accept-Language', localStorage.getItem('language') ?? 'en');
    headers.set('X-Country', localStorage.getItem('country') ?? 'us');
    return headers;
  },
});

const epayBaseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const method = (
    typeof args === 'string' ? 'GET' : (args.method ?? 'GET')
  ).toUpperCase();

  if (!SAFE_METHODS.has(method)) {
    const token = await fetchCsrfToken();
    if (token) {
      const normalized: FetchArgs =
        typeof args === 'string' ? { url: args } : { ...args };
      normalized.headers = {
        ...((normalized.headers as Record<string, string>) ?? {}),
        'X-CSRF-Token': token,
      };
      const result = await rawBaseQuery(normalized, api, extraOptions);
      handleMaintenanceResult(result);
      return result;
    }
  }

  const result = await rawBaseQuery(args, api, extraOptions);
  handleMaintenanceResult(result);
  return result;
};

function handleMaintenanceResult(result: {
  error?: FetchBaseQueryError;
  data?: unknown;
}): void {
  const status = result.error?.status;
  if (status !== 401 && status !== 403 && status !== 503) {
    return;
  }

  handleMaintenanceStatusPayload(result.error?.data, {
    signedOut: status === 401,
  });
}

export const ePayApi = createApi({
  reducerPath: 'ePayApi',
  baseQuery: epayBaseQuery,
  tagTypes: [
    'PaymentMethods',
    'Accounts',
    'Config',
    'PaymentConfig',
    'ReasonCodes',
    'HelpConfig',
  ],
  endpoints: (builder) => ({
    getPaymentReasonCodes: builder.query<PaymentReasonCode[], void>({
      query: () => 'api/payment/paymentreasoncodes',
      providesTags: ['ReasonCodes'],
    }),
    getHelpConfig: builder.query<HelpConfigRequest, void>({
      query: () => 'api/config/help',
      providesTags: ['HelpConfig'],
    }),
    getPaymentConfig: builder.query<PaymentConfig, void>({
      query: () => 'api/config/payment',
      providesTags: ['PaymentConfig'],
    }),
    getAccounts: builder.query<
      UserAccountsResponse,
      { userId?: string; forceRefresh?: boolean }
    >({
      query: ({ userId, forceRefresh }) => {
        const params = new URLSearchParams();
        if (userId) params.append('userId', userId);
        if (forceRefresh) params.append('forceRefresh', 'true');
        const qs = params.toString();
        return `api/user/accounts${qs ? `?${qs}` : ''}`;
      },
      // Cache by userId only — forceRefresh is a server-cache directive, not a data variant
      serializeQueryArgs: ({ queryArgs }) => ({ userId: queryArgs.userId }),
      providesTags: ['Accounts'],
    }),
    deletePaymentCard: builder.mutation<
      CardOperationResponse,
      {
        payerData: PayerDetails;
        paymentCard: PaymentCardSubmission;
        userId?: string;
      }
    >({
      query: ({ payerData, paymentCard, userId }) => ({
        url: 'api/customer/paymentcards/delete',
        method: 'POST',
        body: { payerData, paymentCard, userId },
      }),
      invalidatesTags: ['PaymentMethods'],
    }),
    updatePaymentCard: builder.mutation<
      CardOperationResponse,
      { payerData: PayerDetails; paymentCard: PaymentCard; userId?: string }
    >({
      query: ({ payerData, paymentCard, userId }) => ({
        url: 'api/customer/paymentcards/update',
        method: 'POST',
        body: { payerData, paymentCard, userId },
      }),
      invalidatesTags: ['PaymentMethods'],
    }),
    enableAutoPay: builder.mutation<
      CardOperationResponse,
      {
        selectedAccount: string;
        payer: string;
        companyCode: string;
        cardToken: string;
        isAutoPayEnrolled?: boolean;
        userId?: string;
      }
    >({
      query: (args) => ({
        url: 'api/customer/enableCardAutoPay',
        method: 'POST',
        body: args,
      }),
      invalidatesTags: ['PaymentMethods'],
    }),
  }),
});

export const {
  useGetPaymentReasonCodesQuery,
  useGetPaymentConfigQuery,
  useGetHelpConfigQuery,
  useGetAccountsQuery,
  useDeletePaymentCardMutation,
  useUpdatePaymentCardMutation,
  useEnableAutoPayMutation,
} = ePayApi;
