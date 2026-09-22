import { InvoiceBulkPdfRequest } from 'types';
import {
  EmailConfig,
  GuestPaymentRequest,
  ValidateInvoiceAccount,
} from 'types';

import { User } from 'types/User';
import { UpdateProfileRequest } from 'types/UpdateProfileRequest';
import { Account } from 'types/Account';
import { ThemeConfig } from 'types/ThemeConfig';
import { SmtpConfig } from 'types/SmtpConfig';
import { DepositDetails } from 'types/DepositDetails';
import {
  ThreeDSAuthenticationResultRequest,
  ThreeDSCardinalData,
} from 'types/AccountResponse';
import { GuestTransactionAccessTokenRequest } from 'types/Guest3DS';
import { InvoicePdfRequest } from 'types/InvoicePdfRequest';
import { ITransactionHeader } from 'types/ITransactionHeader';
import { InvoiceDetailRequest } from 'types/InvoiceDetailRequest';
import { AutoRegisterRequest } from 'types/AutoRegisterRequest';
import {
  Invoice,
  InvoiceRequestBody,
  InvoicesSearchRequest,
} from 'types/InvoicesSearchRequest';
import { ValidateInvoiceAccountResponse } from 'types/Invoice';
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

export interface EpayService {
  getMaintenanceModeStatus(): Promise<Response>;
  getMaintenanceConfig(): Promise<Response>;
  getHelpConfig(): Promise<Response>;
  updateHelpConfig(request: HelpConfigRequest): Promise<Response>;
  getAppConfig(isRefresh?: boolean): Promise<Response>;
  getThemeConfig(): Promise<Response>;
  getThemeForUrl(url: string): Promise<Response>;
  getCustomConfig(isRefresh?: boolean): Promise<Response>;
  getPaymentCardType(): Promise<Response>;
  getLanguage(language: string): Promise<Response>;
  getEmailConfig(key: string): Promise<Response>;
  getCheckAllEmailTemplates(key: string): Promise<Response>;
  getDefaultEmailTemplate(key: string, language: string): Promise<Response>;
  getSmtpConfig(): Promise<Response>;
  updateAppConfig(
    request: ApplicationConfigRequest,
    language: string,
  ): Promise<Response>;
  updateThemeConfig(
    request: ThemeConfig[],
    language: string,
  ): Promise<Response>;
  deleteThemeConfig(
    request: ThemeConfig[],
    language: string,
  ): Promise<Response>;
  updateEmailConfig(
    request: EmailConfigRequest,
    language: string,
  ): Promise<Response>;
  updateMaintenanceConfig(
    request: MaintenanceConfigRequest,
    language: string,
  ): Promise<Response>;

  updateEmailTemplateConfig(
    key: string,
    request: EmailConfig,
    language: string,
  ): Promise<Response>;
  smtpTest(request: SmtpConfig): Promise<Response>;

  login(
    user: string,
    password: string,
    isAdminLogin?: boolean,
  ): Promise<Response>;
  getSession(): Promise<Response>;
  logout(): Promise<Response>;
  changePassword(
    currentPassword: string,
    newPassword: string,
    newPasswordConfirmation: string,
  ): Promise<Response>;

  getUsers(): Promise<Response>;
  getUserById(userId: string): Promise<Response>;
  saveUser(user: User): Promise<Response>;
  updateProfile(request: UpdateProfileRequest): Promise<Response>;
  requestEmailChange(
    newEmail: string,
    currentPassword: string,
  ): Promise<Response>;
  confirmEmailChange(token: string): Promise<Response>;
  createAutoAccount(request: AutoRegisterRequest): Promise<Response>;
  deleteUser(userId: string): Promise<Response>;

  addAccountManual(userId: string, account: Account): Promise<Response>;
  addAccountByInvoice(
    userId: string,
    accountNr: string,
    invoiceNr: string,
    invoiceAmt: number,
  ): Promise<Response>;
  updateAccount(userId: string, account: Account): Promise<Response>;
  deleteAccount(userId: string, accountId: string): Promise<Response>;

  getCustomers(userId?: string, forceRefresh?: boolean): Promise<Response>;

  getInvoices(search: InvoicesSearchRequest): Promise<Response>;
  getInvoiceSearch(request: InvoiceRequestBody): Promise<Response>;
  getInvoiceDetails(request: InvoiceDetailRequest): Promise<Response>;
  getInvoicePdf(request: InvoicePdfRequest): Promise<Response>;
  getBulkPdf(request: InvoiceBulkPdfRequest[]): Promise<Response>;

  getPaymentConfig(): Promise<Response>;
  getPaymentHistory(request: InvoicesSearchRequest): Promise<Response>;
  getPaymentMethods(
    account: string,
    payer: string,
    userId?: string,
  ): Promise<Response>;
  getConfigParameter(): Promise<Response>;
  getGuestPayerDetails(
    payerDetailsRequest: PayerDetailsRequest,
  ): Promise<Response>;
  getPaymentReasonCodes(): Promise<Response>;
  getPaymentCards(): Promise<Response>;
  getPaymentHistory(request: InvoicesSearchRequest): Promise<Response>;
  getPaymentMethodEntryToken(
    action: string,
    paymentMethod: string,
    selectedAccount: string,
    cardinalData: ThreeDSCardinalData | undefined,
    userId: string,
  ): Promise<Response>;

  getGuestPaymentMethodEntryToken(
    action: string,
    paymentMethod: string,
    selectedAccount: string,
    cardinalData: ThreeDSCardinalData | undefined,
  ): Promise<Response>;
  getAccessToken(
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
  ): Promise<Response>;
  getGuestTransactionAccessToken(
    request: GuestTransactionAccessTokenRequest,
  ): Promise<Response>;

  get3DSAuthenticationResult(
    body: ThreeDSAuthenticationResultRequest,
  ): Promise<Response>;
  getGuest3DSAuthenticationResult(
    body: ThreeDSAuthenticationResultRequest,
  ): Promise<Response>;
  getPaymentTokenizeResponse(body: Record<string, unknown>): Promise<Response>;
  getGuestPaymentTokenizeResponse(
    body: Record<string, unknown>,
  ): Promise<Response>;
  postPayment(
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
  ): Promise<Response>;
  postScheduledPayment(
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
  ): Promise<Response>;
  deleteScheduledPayment(
    scheduledPaymentId: string,
    companyCode: string,
    customerNumber: string,
    payer: string,
    userId?: string,
  ): Promise<Response>;
  postDeposit(
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
  ): Promise<Response>;
  postGuestPayment(request: GuestPaymentRequest): Promise<Response>;

  updateAppConfig(
    request: ApplicationConfigRequest,
    language: string,
  ): Promise<Response>;
  updateEmailConfig(
    request: EmailConfigRequest,
    language: string,
  ): Promise<Response>;
  updateMaintenanceConfig(
    request: MaintenanceConfigRequest,
    language: string,
  ): Promise<Response>;
  updateEmailTemplateConfig(
    key: string,
    request: EmailConfig,
    language: string,
  ): Promise<Response>;
  smtpTest(request: SmtpConfig): Promise<Response>;

  sendManagePaymentCardsRequest(
    payerData: PayerDetails,
    action: PaymentMethodActionType,
    paymentCards: PaymentCardSubmission,
    userId?: string,
  ): Promise<Response>;

  sendAddPaymentCardRequest(
    payerData: PayerDetails,
    paymentCard: PaymentCardSubmission,
    userId?: string,
  ): Promise<Response>;

  sendUpdatePaymentCardRequest(
    payerData: PayerDetails,
    paymentCard: PaymentCardSubmission,
    userId?: string,
  ): Promise<Response>;

  sendDeletePaymentCardRequest(
    payerData: PayerDetails,
    paymentCard: PaymentCardSubmission,
    userId?: string,
  ): Promise<Response>;

  DoPreAuthentication(
    payerData: PayerDetails,
    paymentCards: PaymentCardSubmission,
    userId?: string,
    addressData?: AddressData,
  ): Promise<Response>;

  DoGuestPaymentPreAuthentication(
    payerData: PayerDetails,
    paymentCard: GuestPaymentCardSubmission,
    userId?: string,
    addressData?: AddressData,
  ): Promise<Response>;

  validateAccount(
    validateInvoiceAccount: ValidateInvoiceAccount,
  ): Promise<ValidateInvoiceAccountResponse>;

  getAccounts(): Promise<Response>;
  adminRecovery(
    adminAccessKey: string,
    recoveryKey: string,
    user: string,
    mode: string,
    password: string,
    firstname: string,
    lastname: string,
    company: string,
    email: string,
    accountType: string,
    role: string,
  ): Promise<Response>;
  startAdminRecovery(
    adminAccessKey: string,
    recoveryKey: string,
    user: string,
  ): Promise<Response>;
  resendConfirmation(email: string): Promise<Response>;
  resetPassword(email: string): Promise<Response>;
  blackOut(request: blackoutConfigRequest): Promise<Response>;
  getApplicableTheme(): Promise<Response>;
  confirmAccount(token: string): Promise<Response>;

  createPassword(
    id: string,
    newPassword: string,
    newPasswordConfirmation: string,
  ): Promise<Response>;
  completeRegistration(
    id: string,
    newPassword: string,
    newPasswordConfirmation: string,
  ): Promise<Response>;
  worldpayVerifyAddress(
    transactionHeader: ITransactionHeader,
  ): Promise<Response>;
  guestWorldpayVerifyAddress(
    transactionHeader: ITransactionHeader,
  ): Promise<Response>;

  EnableCardAutoPay(
    selectedAccount: string,
    payer: string,
    companyCode: string,
    cardToken: string,
    isAutoPayEnrolled?: boolean,
    userId?: string,
  ): Promise<Response>;

  UnEnrollAutoPay(
    selectedAccount: string,
    payer: string,
    companyCode: string,
    userId?: string,
  ): Promise<Response>;
}
