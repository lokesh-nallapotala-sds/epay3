import { User } from 'types/User';
import { UpdateProfileRequest } from 'types/UpdateProfileRequest';
import { Account } from 'types/Account';
import { ThemeConfig } from 'types/ThemeConfig';
import { SmtpConfig } from 'types/SmtpConfig';
import { EmailConfig } from 'types/EmailConfig';
import { DepositDetails } from 'types/DepositDetails';
import {
  ValidateInvoiceAccount,
  ValidateInvoiceAccountResponse,
} from 'types/Invoice';
import { InvoicePdfRequest } from 'types/InvoicePdfRequest';
import { ITransactionHeader } from 'types/ITransactionHeader';
import { GuestPaymentRequest } from 'types/GuestPaymentRequest';
import { InvoiceDetailRequest } from 'types/InvoiceDetailRequest';
import { InvoiceBulkPdfRequest } from 'types/InvoiceBulkPdfRequest';
import { AutoRegisterRequest } from 'types/AutoRegisterRequest';
import {
  Invoice,
  InvoiceRequestBody,
  InvoicesSearchRequest,
} from 'types/InvoicesSearchRequest';
import {
  ThreeDSAuthenticationResultRequest,
  ThreeDSCardinalData,
} from 'types/AccountResponse';
import { GuestTransactionAccessTokenRequest } from 'types/Guest3DS';
import {
  AddressData,
  GuestPaymentCardSubmission,
  PayerDetails,
  PayerDetailsRequest,
  PaymentCardSubmission,
  PaymentMethod,
  PaymentMethodActionType,
} from 'types/Payment';
import {
  ApplicationConfigRequest,
  blackoutConfigRequest,
  EmailConfigRequest,
  HelpConfigRequest,
  MaintenanceConfigRequest,
} from 'types/AppConfigRequest';
import { isMaintenanceRedirectInProgress } from 'utilities/maintenance';

import { EpayService } from './EpayService';

export class DotNetService implements EpayService {
  public fetchFn: typeof fetch;
  private readonly rawFetch: typeof fetch;
  private csrfToken: string | null = null;
  private csrfTokenAuthKey: string | null = null;
  private csrfTokenPromise: Promise<string | null> | null = null;
  private csrfTokenPromiseAuthKey: string | null = null;
  private unauthorizedHandled = false;

  constructor(
    fetchWithLang: typeof fetch = fetch,
    private readonly onUnauthorized?: () => void,
  ) {
    this.rawFetch = fetchWithLang;

    // override fetchFn so it always prepends headers
    this.fetchFn = async (input, init: RequestInit = {}) => {
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Accept-Language': localStorage.getItem('language') ?? 'en',
        'X-Country': localStorage.getItem('country') ?? 'us',
      });

      // merge supplied headers (if any)
      if (init.headers) {
        const userHeaders = new Headers(init.headers);
        userHeaders.forEach((value, key) => headers.set(key, value));
      }

      if (this.requiresCsrfToken(input, init)) {
        const csrfToken = await this.getCsrfToken();
        if (csrfToken) {
          headers.set('X-CSRF-Token', csrfToken);
        }
      }

      // call the original (lang-aware) fetch
      const response = await this.rawFetch(input, {
        ...init,
        credentials: 'include',
        headers,
      });

      // Maintenance responses are handled by the fetch layer
      // (handleMaintenanceHttpResponse); this only covers session expiry.
      // Stand down while a maintenance redirect is underway — its
      // sessionStorage.clear() would wipe the signed-out flag set there.
      if (
        response.status === 401 &&
        !this.unauthorizedHandled &&
        !this.isLoginRequest(input) &&
        !isMaintenanceRedirectInProgress()
      ) {
        this.unauthorizedHandled = true;
        this.onUnauthorized?.();
      }

      return response;
    };
  }

  private async getCsrfToken(forceRefresh = false): Promise<string | null> {
    const authKey = 'cookie-session';

    if (!forceRefresh && this.csrfToken && this.csrfTokenAuthKey === authKey) {
      return this.csrfToken;
    }

    if (
      !forceRefresh &&
      this.csrfTokenPromise &&
      this.csrfTokenPromiseAuthKey === authKey
    ) {
      return this.csrfTokenPromise;
    }

    this.csrfTokenPromiseAuthKey = authKey;
    this.csrfTokenPromise = this.rawFetch('/api/csrf/token', {
      method: 'GET',
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        const body: { token: string } = await response.json();
        this.csrfToken = body.token ?? null;
        this.csrfTokenAuthKey = authKey;
        return this.csrfToken;
      })
      .catch(() => {
        this.csrfToken = null;
        this.csrfTokenAuthKey = null;
        return null;
      })
      .finally(() => {
        this.csrfTokenPromise = null;
        this.csrfTokenPromiseAuthKey = null;
      });

    return this.csrfTokenPromise;
  }

  private clearCsrfToken(): void {
    this.csrfToken = null;
    this.csrfTokenAuthKey = null;
    this.csrfTokenPromise = null;
    this.csrfTokenPromiseAuthKey = null;
  }

  private isLoginRequest(input: RequestInfo | URL): boolean {
    const rawInput =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    try {
      const url = new URL(rawInput, window.location.origin);
      return url.pathname === '/api/auth/login';
    } catch {
      return rawInput.includes('api/auth/login');
    }
  }

  private requiresCsrfToken(
    input: RequestInfo | URL,
    init: RequestInit,
  ): boolean {
    const method =
      init.method ??
      (input instanceof Request ? input.method : undefined) ??
      'GET';

    return !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method.toUpperCase());
  }

  //#region config
  async getAppConfig(isRefresh: boolean = false): Promise<Response> {
    const url = isRefresh
      ? 'api/config/application?isRefresh=true'
      : 'api/config/application';
    return this.fetchFn(url, {
      method: 'GET',
    });
  }

  async getCustomConfig(isRefresh?: boolean): Promise<Response> {
    const url = isRefresh
      ? 'api/config/custom?isRefresh=true'
      : 'api/config/custom';
    return this.fetchFn(url, {
      method: 'GET',
    });
  }

  async getPaymentCardType(): Promise<Response> {
    const url = 'api/config/paymentcardtype?isRefresh=true';
    return this.fetchFn(url, {
      method: 'GET',
    });
  }

  async getLanguage(language: string): Promise<Response> {
    return this.fetchFn(`api/config/language/${language}`, {
      method: 'GET',
    });
  }

  async getSmtpConfig(): Promise<Response> {
    return this.fetchFn('api/config/smtp', {
      method: 'GET',
    });
  }

  async getEmailConfig(key: string): Promise<Response> {
    const uri: string = `/api/config/email/${key}`;
    return this.fetchFn(uri, {
      method: 'GET',
    });
  }
  async getCheckAllEmailTemplates(_key: string): Promise<Response> {
    const uri: string = `/api/config/email`;
    return this.fetchFn(uri, {
      method: 'GET',
    });
  }

  getDefaultEmailTemplate(key: string, language: string): Promise<Response> {
    const uri: string = `/api/config/email/default/${key}?language=${language}`;
    return this.fetchFn(uri, { method: 'GET' });
  }

  async smtpTest(request: SmtpConfig): Promise<Response> {
    return this.fetchFn('api/config/smtp-test', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    });
  }

  async updateAppConfig(
    request: ApplicationConfigRequest,
    language: string,
  ): Promise<Response> {
    return this.fetchFn(`api/config/update/application/${language}`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    });
  }

  async getThemeConfig(): Promise<Response> {
    return this.fetchFn('api/config/theme', {
      method: 'GET',
    });
  }

  async getThemeForUrl(url: string): Promise<Response> {
    return this.fetchFn(
      `/api/config/GetThemeForUrl?url=${encodeURIComponent(url)}`,
      {
        method: 'GET',
      },
    );
  }

  async getApplicableTheme(): Promise<Response> {
    const val = {
      backgroundColor: '#FFFFFF',
      primaryColor: '#FFFFFF',
      contrastColor: '#FFFFFF',
      hoverColor: '#FFFFFF',
      buttonColor: '#FFFFFF',
      buttonTextColor: '#FFFFFF',
      buttonHoverColor: '#FFFFFF',
      buttonHoverTextColor: '#FFFFFF',
      buttonBorderColor: '#FFFFFF',
      buttonBorderHoverColor: '#FFFFFF',
      highlightColor: '#FFFFFF',
    };
    // Create a Response object with JSON
    const response = new Response(JSON.stringify(val));
    return Promise.resolve(response);
  }

  async updateThemeConfig(
    request: ThemeConfig[],
    language: string,
  ): Promise<Response> {
    return this.fetchFn(`api/config/update/themes/${language}`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    });
  }

  async deleteThemeConfig(
    request: ThemeConfig[],
    language: string,
  ): Promise<Response> {
    return this.fetchFn(`api/config/delete/themes/${language}`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    });
  }

  async updateEmailConfig(
    request: EmailConfigRequest,
    language: string,
  ): Promise<Response> {
    return this.fetchFn(`api/config/update/emailconfig/${language}`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    });
  }

  async updateEmailTemplateConfig(
    key: string,
    request: EmailConfig,
    language: string,
  ): Promise<Response> {
    return this.fetchFn(
      `api/config/update/emailtemplateconfig/${key}/${language}`,
      {
        method: 'PUT',
        credentials: 'include',
        body: JSON.stringify(request),
      },
    );
  }

  async updateMaintenanceConfig(
    request: MaintenanceConfigRequest,
    language: string,
  ): Promise<Response> {
    return this.fetchFn(`api/config/update/maintenance/${language}`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    });
  }

  //#region user
  async login(
    user: string,
    password: string,
    isAdminLogin: boolean = false,
  ): Promise<Response> {
    const data = {
      userName: user,
      password: password,
      isAdminLogin,
    };

    const uri = 'api/auth/login';

    const response = await this.fetchFn(uri, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (response.ok) {
      this.clearCsrfToken();
    }

    return response;
  }

  async getSession(): Promise<Response> {
    return this.fetchFn('api/auth/session', {
      method: 'GET',
    });
  }

  async logout(): Promise<Response> {
    const response = await this.fetchFn('api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    this.clearCsrfToken();
    return response;
  }

  async getUsers(): Promise<Response> {
    const uri: string = 'api/user';
    const request: RequestInit = {
      method: 'GET',
    };

    return this.fetchFn(uri, request);
  }

  async getUserById(userId: string): Promise<Response> {
    const uri: string = `api/user/getById?userId=${userId}`;
    const request: RequestInit = {
      method: 'GET',
    };

    return this.fetchFn(uri, request);
  }

  async saveUser(user: User): Promise<Response> {
    let uri: string;
    const request: RequestInit = {
      body: JSON.stringify(user),
    };

    if (user.userId) {
      uri = 'api/user/update';
      request.method = 'put';
    } else {
      uri = 'api/user/create';
      request.method = 'post';
    }

    return this.fetchFn(uri, request);
  }

  async updateProfile(request: UpdateProfileRequest): Promise<Response> {
    return this.fetchFn('api/user/update-profile', {
      method: 'PUT',
      credentials: 'include',
      body: JSON.stringify(request),
    });
  }

  async requestEmailChange(
    newEmail: string,
    currentPassword: string,
  ): Promise<Response> {
    return this.fetchFn('api/user/request-email-change', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ newEmail, currentPassword }),
    });
  }

  async confirmEmailChange(token: string): Promise<Response> {
    return this.fetchFn(`api/auth/confirm-email-change/${token}`, {
      method: 'POST',
      credentials: 'include',
    });
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
    newPasswordConfirmation: string,
  ): Promise<Response> {
    const data = {
      CurrentPassword: currentPassword,
      NewPassword: newPassword,
      NewPasswordConfirmation: newPasswordConfirmation,
    };
    const request: RequestInit = {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(data),
    };

    return this.fetchFn('api/user/changepassword', request);
  }

  async deleteUser(userId: string): Promise<Response> {
    const uri: string = `api/user/${userId}`;
    const request: RequestInit = {
      method: 'DELETE',
    };

    return this.fetchFn(uri, request);
  }

  //#region user linked accounts
  async addAccountManual(userId: string, account: Account): Promise<Response> {
    const uri = `api/user/${userId}/accounts/addmanual`;
    const request: RequestInit = {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(account),
    };

    return this.fetchFn(uri, request);
  }

  async addAccountByInvoice(
    userId: string,
    accountNr: string,
    invoiceNr: string,
    invoiceAmt: number,
  ): Promise<Response> {
    const uri = `api/user/${userId}/accounts/addbyinvoice`;
    const body = {
      accountNumber: accountNr,
      invoiceNumber: invoiceNr,
      invoiceAmount: invoiceAmt,
    };
    const request: RequestInit = {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(body),
    };

    return this.fetchFn(uri, request);
  }

  async updateAccount(userId: string, account: Account): Promise<Response> {
    const uri = `api/user/${userId}/accounts/${account.accountId}`;
    const request: RequestInit = {
      method: 'PUT',
      credentials: 'include',
      body: JSON.stringify(account),
    };

    return this.fetchFn(uri, request);
  }

  async deleteAccount(userId: string, accountId: string): Promise<Response> {
    const uri = `api/user/${userId}/accounts/${accountId}`;
    const request: RequestInit = {
      method: 'DELETE',
      credentials: 'include',
    };

    return this.fetchFn(uri, request);
  }

  //#region customer / account
  async getCustomers(
    userId?: string,
    forceRefresh?: boolean,
  ): Promise<Response> {
    let uri = 'api/user/accounts';
    if (userId) {
      uri = this.appendQueryParam(uri, 'userId', userId);
    }
    if (forceRefresh) {
      uri = this.appendQueryParam(uri, 'forceRefresh', 'true');
    }

    return this.fetchFn(uri, {
      method: 'GET',
    });
  }

  async getInvoices(request: InvoicesSearchRequest): Promise<Response> {
    return this.fetchFn('api/invoices', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    });
  }

  async getInvoiceSearch(request: InvoiceRequestBody): Promise<Response> {
    return this.fetchFn('api/invoices/getInvoiceSearch', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    });
  }

  async getInvoiceDetails(
    invoiceDetailRequest: InvoiceDetailRequest,
  ): Promise<Response> {
    return this.fetchFn('api/invoices/details', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(invoiceDetailRequest),
    });
  }

  async getInvoicePdf(request: InvoicePdfRequest): Promise<Response> {
    return this.fetchFn('api/invoices/pdf/request', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    });
  }

  async getBulkPdf(request: InvoiceBulkPdfRequest[]): Promise<Response> {
    return this.fetchFn('api/invoices/bulk-pdf', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    });
  }

  //#region payments
  async getPaymentConfig(): Promise<Response> {
    return this.fetchFn('api/config/payment', {
      method: 'GET',
    });
  }

  async getPaymentHistory(request: InvoicesSearchRequest): Promise<Response> {
    return this.fetchFn('/api/invoices/GetPaymentsHistory', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    });
  }

  async getPaymentMethods(
    account: string,
    payer: string,
    userId?: string,
  ): Promise<Response> {
    let uri = `api/payment/methods/${account}?payer=${payer}`;
    if (userId) {
      uri = this.appendQueryParam(uri, 'userId', userId);
    }
    return this.fetchFn(uri, {
      method: 'GET',
    });
  }

  async getGuestPayerDetails(
    payerDetailsRequest: PayerDetailsRequest,
  ): Promise<Response> {
    return this.fetchFn(`api/guestPayment/guestPayer`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(payerDetailsRequest),
    });
  }

  async getPaymentReasonCodes(): Promise<Response> {
    return this.fetchFn('/api/payment/paymentreasoncodes', {
      method: 'GET',
    });
  }

  async getPaymentCards(): Promise<Response> {
    return this.fetchFn('/api/config/paymentcards', {
      method: 'GET',
    });
  }

  async getAccessToken(
    selectedAccount: string,
    payer: string,
    cardKey: string | null,
    currency: string,
    redirectUri: string,
    amount: number,
    paymentMethod?: PaymentMethod | null,
    userId?: string,
    cvv?: string,
    companyCode?: string,
  ): Promise<Response> {
    const request = {
      selectedAccount,
      payer,
      cardKey,
      amount,
      currency,
      redirectUri,
      paymentMethod: paymentMethod || null,
      userId,
      cvv,
      companyCode,
    };
    return this.fetchFn('api/payment-token/transaction-access-token', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    });
  }

  async getGuestTransactionAccessToken(
    request: GuestTransactionAccessTokenRequest,
  ): Promise<Response> {
    return this.fetchFn('api/payment-token/guest/transaction-access-token', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    });
  }

  async getPaymentMethodEntryToken(
    action: string,
    paymentMethod: string,
    selectedAccount: string,
    cardinalData: ThreeDSCardinalData | undefined,
    userId?: string,
  ): Promise<Response> {
    const request = {
      action,
      paymentMethod,
      selectedAccount,
      cardinalData,
    };
    const queryParams = new URLSearchParams();
    if (userId) queryParams.append('userId', userId);
    return this.fetchFn(
      `api/payment-token/payment-method-entry-token?${queryParams.toString()}`,
      {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(request),
      },
    );
  }

  async getGuestPaymentMethodEntryToken(
    action: string,
    paymentMethod: string,
    selectedAccount: string,
    cardinalData: ThreeDSCardinalData | undefined,
  ): Promise<Response> {
    const request = {
      action,
      paymentMethod,
      selectedAccount,
      cardinalData,
    };
    return this.fetchFn('api/payment-token/guest/payment-method-entry-token', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    });
  }

  async get3DSAuthenticationResult(
    body: ThreeDSAuthenticationResultRequest,
  ): Promise<Response> {
    return this.fetchFn('api/payment-token/3ds-authentication-result', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json', // Ensure this header is present
      },
      body: JSON.stringify(body),
    });
  }

  async getGuest3DSAuthenticationResult(
    body: ThreeDSAuthenticationResultRequest,
  ): Promise<Response> {
    return this.fetchFn('api/payment-token/guest/3ds-authentication-result', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  async getPaymentTokenizeResponse(
    body: Record<string, unknown>,
  ): Promise<Response> {
    return this.fetchFn('api/payment-token/tokenization-response', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(body),
    });
  }

  async getGuestPaymentTokenizeResponse(
    body: Record<string, unknown>,
  ): Promise<Response> {
    return this.fetchFn('api/payment-token/guest/tokenization-response', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(body),
    });
  }

  async postPayment(
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
  ): Promise<Response> {
    const uri = 'api/payment/pay';
    const request = {
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
    };

    return this.fetchFn(uri, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    });
  }

  async postScheduledPayment(
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
  ): Promise<Response> {
    const uri = 'api/payment/scheduledpayment';
    const request = {
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
    };

    return this.fetchFn(uri, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    });
  }

  async deleteScheduledPayment(
    scheduledPaymentId: string,
    companyCode: string,
    customerNumber: string,
    payer: string,
    userId?: string,
  ): Promise<Response> {
    const uri = 'api/payment/deletescheduledpayment';

    const request = {
      ScheduleId: scheduledPaymentId,
      CustomerNumber: customerNumber,
      CompanyCode: companyCode,
      UserId: userId,
      Payer: payer,
    };

    return this.fetchFn(uri, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    });
  }

  async postGuestPayment(request: GuestPaymentRequest): Promise<Response> {
    return this.fetchFn('api/guestpayment/pay', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    });
  }

  async postDeposit(
    selectedAccount: string,
    depositDetails: DepositDetails,
    payer: string,
    cardinalData: ThreeDSCardinalData | undefined,
    paymentMethod: PaymentMethod | null,
    cvv: string | undefined,
    userId?: string,
    companyCode?: string,
    threeDSAccessToken?: string,
    vRef?: string,
  ): Promise<Response> {
    const uri = 'api/payment/deposit';
    const request = {
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
    };

    return this.fetchFn(uri, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    });
  }

  async sendManagePaymentCardsRequest(
    payerData: PayerDetails,
    action: PaymentMethodActionType,
    paymentCards: PaymentCardSubmission,
    userId?: string,
  ): Promise<Response> {
    const uri = 'api/customer/paymentcards';
    const paymentCardArray = Array<PaymentCardSubmission>();
    paymentCardArray.push(paymentCards);
    const request = {
      payerData,
      action,
      paymentCards: paymentCardArray,
      vRef: paymentCards.vRef,
      userId,
    };

    return this.fetchFn(uri, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    });
  }

  private async sendPaymentCardActionRequest(
    uri: string,
    payerData: PayerDetails,
    paymentCard: PaymentCardSubmission,
    userId?: string,
  ): Promise<Response> {
    const request = {
      payerData,
      paymentCard,
      vRef: paymentCard.vRef,
      userId,
    };

    return this.fetchFn(uri, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    });
  }

  async sendAddPaymentCardRequest(
    payerData: PayerDetails,
    paymentCard: PaymentCardSubmission,
    userId?: string,
  ): Promise<Response> {
    return this.sendPaymentCardActionRequest(
      'api/customer/paymentcards/add',
      payerData,
      paymentCard,
      userId,
    );
  }

  async sendUpdatePaymentCardRequest(
    payerData: PayerDetails,
    paymentCard: PaymentCardSubmission,
    userId?: string,
  ): Promise<Response> {
    return this.sendPaymentCardActionRequest(
      'api/customer/paymentcards/update',
      payerData,
      paymentCard,
      userId,
    );
  }

  async sendDeletePaymentCardRequest(
    payerData: PayerDetails,
    paymentCard: PaymentCardSubmission,
    userId?: string,
  ): Promise<Response> {
    return this.sendPaymentCardActionRequest(
      'api/customer/paymentcards/delete',
      payerData,
      paymentCard,
      userId,
    );
  }

  async DoPreAuthentication(
    payerData: PayerDetails,
    paymentCard: PaymentCardSubmission,
    userId?: string,
    addressData?: AddressData,
  ): Promise<Response> {
    const uri = 'api/customer/paymentcards/pre-auth';
    const request = {
      payerData,
      paymentCard,
      userId,
      addressData,
    };

    return this.fetchFn(uri, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    });
  }

  async DoGuestPaymentPreAuthentication(
    payerData: PayerDetails,
    paymentCard: GuestPaymentCardSubmission,
    userId?: string,
    addressData?: AddressData,
  ): Promise<Response> {
    const uri = 'api/guestpayment/pre-auth';
    const request = {
      payerData,
      paymentCard,
      userId,
      addressData,
      vRef: paymentCard.vRef,
    };

    return this.fetchFn(uri, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    });
  }

  //#region accounts
  getAccounts(): Promise<Response> {
    throw new Error('Method not implemented.');
  }

  async validateAccount(
    validateInvoiceAccount: ValidateInvoiceAccount,
  ): Promise<ValidateInvoiceAccountResponse> {
    const request = {
      ...validateInvoiceAccount,
    };

    const response = await this.fetchFn('api/account/validate', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const error = await response.json();

      throw new Error(error.message || 'No Data Found');
    }
    const result = await response.json();
    return result;
  }

  async createAutoAccount(request: AutoRegisterRequest): Promise<Response> {
    try {
      const response = await this.fetchFn('api/account/autoregister', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Something went wrong');
      }
      const result = await response.json();
      return result;
    } catch (error) {
      throw error;
    }
  }

  async adminRecovery(
    adminAccessKey: string,
    recoveryKey: string,
    user: string,
    mode: string,
    password: string,
    firstName: string,
    lastName: string,
    company: string,
    email: string,
    accountType: string,
    role: string,
  ): Promise<Response> {
    const data = {
      key: recoveryKey,
      user: user,
      mode: mode,
      password: password,
      firstName: firstName,
      lastName: lastName,
      company: company,
      email: email,
      accountType: accountType,
      role: role,
    };

    const uri = this.appendQueryParam(
      '/api/account/admin/recovery',
      'key',
      adminAccessKey,
    );

    return this.fetchFn(uri, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(data),
    });
  }

  async startAdminRecovery(
    adminAccessKey: string,
    recoveryKey: string,
    user: string,
  ): Promise<Response> {
    const uri = this.appendQueryParam(
      '/api/account/admin/recovery/start',
      'key',
      adminAccessKey,
    );

    return this.fetchFn(uri, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        key: recoveryKey,
        user,
      }),
    });
  }

  async resendConfirmation(email: string): Promise<Response> {
    const uri = `api/account/auto-register/resend-confirmation?email=${email}`;
    const request: RequestInit = {
      method: 'PUT',
      credentials: 'include',
    };

    return this.fetchFn(uri, request);
  }

  async blackOut(request: blackoutConfigRequest): Promise<Response> {
    return this.fetchFn('api/config/blackout', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    });
  }

  async getMaintenanceConfig(): Promise<Response> {
    return this.fetchFn('api/config/maintenance', {
      method: 'GET',
    });
  }

  async getHelpConfig(): Promise<Response> {
    return this.fetchFn('api/config/help', {
      method: 'GET',
    });
  }

  async updateHelpConfig(request: HelpConfigRequest): Promise<Response> {
    return this.fetchFn('api/config/update/help', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    });
  }

  async getMaintenanceModeStatus(): Promise<Response> {
    return this.fetchFn('api/config/maintenancemode', {
      method: 'GET',
    });
  }

  //#end region
  async resetPassword(email: string): Promise<Response> {
    const passwordReset = {
      email: email,
    };

    const uri = 'api/user/password-reset-request';
    const request: RequestInit = {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(passwordReset),
    };

    return this.fetchFn(uri, request);
  }

  async confirmAccount(token: string): Promise<Response> {
    const uri = `api/Auth/auto-register/user-confirm/${token}`;
    const request: RequestInit = {
      method: 'POST',
      credentials: 'include',
    };

    return this.fetchFn(uri, request);
  }

  async createPassword(
    id: string,
    newPassword: string,
    newPasswordConfirmation: string,
  ): Promise<Response> {
    const data = {
      ConfirmPassword: newPasswordConfirmation,
      Id: id,
      Password: newPassword,
    };
    const request: RequestInit = {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(data),
    };

    return this.fetchFn('api/user/complete-password-reset', request);
  }

  async completeRegistration(
    id: string,
    newPassword: string,
    newPasswordConfirmation: string,
  ): Promise<Response> {
    const data = {
      ConfirmPassword: newPasswordConfirmation,
      Id: id,
      Password: newPassword,
    };
    const request: RequestInit = {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(data),
    };

    return this.fetchFn('api/auth/complete-registration', request);
  }

  async worldpayVerifyAddress(
    transactionHeader: ITransactionHeader,
  ): Promise<Response> {
    const data = transactionHeader;

    const request: RequestInit = {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    };

    return this.fetchFn('api/AddressValidation/WorldpayVerifyAddress', request);
  }

  async guestWorldpayVerifyAddress(
    transactionHeader: ITransactionHeader,
  ): Promise<Response> {
    const data = transactionHeader;

    const request: RequestInit = {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    };

    return this.fetchFn(
      'api/AddressValidation/GuestWorldpayVerifyAddress',
      request,
    );
  }

  async EnableCardAutoPay(
    selectedAccount: string,
    payer: string,
    companyCode: string,
    cardToken: string,
    isAutoPayEnrolled?: boolean,
    userId?: string,
  ): Promise<Response> {
    const uri = `api/customer/enableCardAutoPay`;
    const enableAutoPayCardRequest = {
      selectedAccount: selectedAccount,
      payer: payer,
      companyCode: companyCode,
      cardToken: cardToken,
      isAutoPayEnrolled: isAutoPayEnrolled,
      userId: userId,
    };
    const request: RequestInit = {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(enableAutoPayCardRequest),
    };
    return await this.fetchFn(uri, request);
  }

  async UnEnrollAutoPay(
    selectedAccount: string,
    payer: string,
    companyCode: string,
    userId?: string,
  ): Promise<Response> {
    const uri = `api/customer/unenrollautopay`;
    const unEnrollAutoPayRequest = {
      selectedAccount: selectedAccount,
      payer: payer,
      companyCode: companyCode,
      userId: userId,
    };
    const request: RequestInit = {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(unEnrollAutoPayRequest),
    };
    return await this.fetchFn(uri, request);
  }

  private appendQueryParam(
    baseUri: string,
    keyRaw: string,
    valueRaw: string,
  ): string {
    let uri = baseUri;
    if (!!keyRaw && !!valueRaw) {
      const key = encodeURIComponent(keyRaw);
      const val = encodeURIComponent(valueRaw);
      if (key === keyRaw) {
        // param name should not contain special chars
        uri = uri.concat(uri.indexOf('?') < 0 ? '?' : '&', key, '=', val);
      }
    }
    return uri;
  }

  async getConfigParameter(): Promise<Response> {
    return this.fetchFn('api/config/avs-parameter', {
      method: 'GET',
    });
  }
}
