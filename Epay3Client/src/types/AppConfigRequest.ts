import {
  ServerScheduledPaymentPolicy,
  ScheduledPaymentPolicy,
} from './ScheduledPaymentPolicy';

export interface ApplicationLinkItem {
  id: string;
  label: string;
  url: string;
}

export interface ApplicationConfigRequest {
  // Shared properties
  allowRegistration: boolean;
  disablePaymentsGlobally: boolean;
  allowCVV: boolean;
  allowGuestPayment: boolean;
  maxPaymentAllowed: string;
  maxECheckPaymentAllowed: string;
  addressValidationOptions: string;
  isSchedulePaymentsEnabled?: boolean;

  // Payment integration type: 'iframe' for embedded iframe, 'hosted' for external hosted page
  paymentIntegrationType?: 'iframe' | 'hosted';

  // Application-specific properties
  isAccountLinkingEnabled: boolean;
  isAutoPayEnabled?: boolean;
  scheduledPaymentPolicy?:
    | ServerScheduledPaymentPolicy
    | ScheduledPaymentPolicy
    | null;

  // Footer-specific properties
  copyrightYear?: string;
  isPaymentDisabled?: boolean;
  isPaymentsDisable?: boolean;
  maintenancePeriod?: string;
  notificationText?: string;
  maintenanceUrl?: string;
  selectedlanguage?: string;
  fromDateLocal?: Date;
  toDateLocal?: Date;
  isSignInDisable?: boolean;

  // Optional properties (can be undefined)
  registrationEmail?: string;
  registrationEmailExpiration?: string;
  expirationMessage?: string;
  privacyPolicy?: string;
  termsAndConditions?: string;
  contactUs?: string;
  applicationLinks?: ApplicationLinkItem[];
  messageLanguage?: string;
  paymentDisableMessageText?: { [key: string]: string };
  notificationLanguage?: string;
  companyCodeDisplayNames?: { [key: string]: string };
  showInvoicePdfActions?: boolean;
  ShowInvoiceDaysTillDue?: boolean;
  showInvoiceHistoryFilter?: boolean;
  showPaymentHistoryFilter?: boolean;
  enablePreAuth?: boolean;
}

export interface EmailConfigRequest {
  smtpAddress: string;
  smtpPort: string;
  smtpUseUser: boolean;
  smtpUser: string;
  smtpPassword?: string;
  registrationRequestEmail: string;
  overrideEmail: string;
  securityEmail: string;
  fromAddress: string;
  fromAddressName: string;
  registrationRequestEmailContent: string;
  welcomeEmailContent: string;
  resetPasswordEmailContent: string;
  emailConfirmationContent: string;
  applicationUrl: string;
  companyName: string;
  hasPassword: boolean;
}

export interface MaintenanceConfigRequest {
  isSignInDisable: boolean;
  notificationLanguage: string;
  notificationText: { [key: string]: string };
  maintenanceUrl: string;
  fromDateLocal: string;
  toDateLocal: string;
}

export type MaintenanceStatusMode =
  | 'none'
  | 'maintenance_active'
  | 'maintenance_unavailable';

export interface MaintenanceStatusResponse {
  mode: MaintenanceStatusMode;
  code: MaintenanceStatusMode;
  maintenanceConfig?: MaintenanceConfigRequest | null;
  message?: string | null;
  fallbackUrl?: string | null;
}
export interface HelpScreenConfig {
  // Friendly label shown in the admin Screen dropdown, e.g. "Home".
  name: string;
  // The screen's route, e.g. "/home" — the client-side route-match key, kept
  // separate from `name` so a display-label typo can't silently break matching.
  path: string;
  // Keyed by language code (e.g. "en", "fr") matching SUPPORTED_LANGUAGES in
  // constants/languages.ts — the client resolves the entry for its current
  // locale, falling back to "en" if that screen hasn't been translated yet.
  helpText: Record<string, string>;
}

export interface HelpConfigRequest {
  // Set by the server when the config could not be read (e.g. SAP unavailable)
  // and the payload is an empty placeholder rather than the real state — the
  // admin tab must not allow saving over it.
  loadFailed?: boolean;
  isHelpEnabled: boolean;
  screens: HelpScreenConfig[];
}

export interface blackoutConfigRequest {
  notificationLanguage: string;
  notificationText: { language: string; message: string }[];
  isPaymentsDisable: boolean;
  fromDateLocal: Date; // Typing as Date since you're initializing with new Date()
  toDateLocal: Date; // Typing as Date for the same reason
}
