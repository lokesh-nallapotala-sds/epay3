import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../EpayStore';
import { ApplicationConfigRequest } from 'types/AppConfigRequest';
import { SapConfig } from 'types/SapConfig/SapConfig';
import CompanyCodeDetail from 'types/SapConfig/CompanyCodeDetail';
import PaymentCardDetail from 'types/SapConfig/PaymentCardDetail';
import PaymentProviderDetail from 'types/SapConfig/PaymentProviderDetail';
import { PaymentConfig } from 'types/Payment';

const EMPTY_COMPANY_CODES: CompanyCodeDetail[] = [];
const EMPTY_PAYMENT_CARDS: PaymentCardDetail[] = [];
const EMPTY_PAYMENT_PROVIDERS: PaymentProviderDetail[] = [];
const EMPTY_SALES_ORGANIZATIONS: SapConfig['salesOrganizations'] = [];
const EMPTY_PAYMENT_REASON_CODES: SapConfig['paymentReasonCodes'] = [];
const EMPTY_PAYMENT_DISABLE_MESSAGE_TEXT: { [key: string]: string } = {};

// Base config selectors
export const selectApplicationConfig = (
  state: RootState,
): ApplicationConfigRequest | null => state.config.applicationConfig;

export const selectCustomConfig = (state: RootState): SapConfig | null =>
  state.config.customConfig;

export const selectIsCVVAllowedFromCustomConfig = (state: RootState): boolean =>
  state.config.customConfig?.generalData?.cvvUseControl === '1';

export const selectConfigLoaded = (state: RootState): boolean =>
  state.config.configLoaded;

export const selectConfigError = (state: RootState): string | null =>
  state.config.configError;
export const selectPaymentConfig = (state: RootState): PaymentConfig | null =>
  state.config.paymentConfig;
export const selectPaymentConfigLoaded = (state: RootState): boolean =>
  state.config.paymentConfigLoaded;

// Application config field selectors
export const selectIsAccountLinkingEnabled = (state: RootState): boolean =>
  state.config.applicationConfig?.isAccountLinkingEnabled ?? false;

export const selectIsSchedulePaymentsEnabled = (state: RootState): boolean =>
  state.config.applicationConfig?.isSchedulePaymentsEnabled ?? false;

export const selectIsAutoPayEnabled = (state: RootState): boolean =>
  state.config.applicationConfig?.isAutoPayEnabled ?? false;

export const selectScheduledPaymentPolicy = (state: RootState) =>
  state.config.applicationConfig?.scheduledPaymentPolicy ?? null;

export const selectPaymentDisableMessageText = (
  state: RootState,
): { [key: string]: string } =>
  state.config.applicationConfig?.paymentDisableMessageText ??
  EMPTY_PAYMENT_DISABLE_MESSAGE_TEXT;

export const selectAllowGuestPayment = (state: RootState): boolean =>
  state.config.applicationConfig?.allowGuestPayment ?? false;

export const selectShowInvoicePdfActions = (state: RootState): boolean =>
  state.config.applicationConfig?.showInvoicePdfActions ?? false;
export const selectShowInvoiceDaysTillDue = (state: RootState): boolean =>
  state.config.applicationConfig?.ShowInvoiceDaysTillDue ?? false;

export const selectShowInvoiceHistoryFilter = (state: RootState): boolean =>
  state.config.applicationConfig?.showInvoiceHistoryFilter ?? false;
export const selectShowPaymentHistoryFilter = (state: RootState): boolean =>
  state.config.applicationConfig?.showPaymentHistoryFilter ?? false;
export const selectEnablePreAuth = (state: RootState): boolean =>
  state.config.applicationConfig?.enablePreAuth ?? true;

export const selectDisablePaymentsGlobally = (state: RootState): boolean =>
  state.config.applicationConfig?.disablePaymentsGlobally ?? false;

export const selectMaxPaymentAllowed = (state: RootState): string =>
  state.config.applicationConfig?.maxPaymentAllowed ?? '';

export const selectMaxECheckPaymentAllowed = (state: RootState): string =>
  state.config.applicationConfig?.maxECheckPaymentAllowed ?? '';

export const selectAddressValidationOptions = (state: RootState): string =>
  state.config.applicationConfig?.addressValidationOptions ?? '';

// Custom config field selectors
export const selectCompanyCodes = createSelector(
  selectCustomConfig,
  (customConfig): CompanyCodeDetail[] =>
    customConfig?.companyCodes ?? EMPTY_COMPANY_CODES,
);

export const selectPaymentCards = createSelector(
  selectCustomConfig,
  (customConfig): PaymentCardDetail[] =>
    customConfig?.paymentCards ?? EMPTY_PAYMENT_CARDS,
);

export const selectPaymentProviders = createSelector(
  selectCustomConfig,
  (customConfig): PaymentProviderDetail[] =>
    customConfig?.paymentProviders ?? EMPTY_PAYMENT_PROVIDERS,
);

export const selectSalesOrganizations = createSelector(
  selectCustomConfig,
  (customConfig): SapConfig['salesOrganizations'] =>
    customConfig?.salesOrganizations ?? EMPTY_SALES_ORGANIZATIONS,
);

export const selectPaymentReasonCodes = createSelector(
  selectCustomConfig,
  (customConfig): SapConfig['paymentReasonCodes'] =>
    customConfig?.paymentReasonCodes ?? EMPTY_PAYMENT_REASON_CODES,
);

export const selectPaymentIntegrationType = createSelector(
  (state: RootState) => state.config.applicationConfig,
  (config): 'iframe' | 'hosted' => {
    if (!config) return 'iframe';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = config as any;
    const type = raw.paymentIntegrationType || raw.PaymentIntegrationType;
    return type?.toLowerCase() === 'hosted' ? 'hosted' : 'iframe';
  },
);
