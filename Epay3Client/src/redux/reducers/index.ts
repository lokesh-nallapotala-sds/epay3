// Import accountReducer and actions from AccountReducer file
import accountReducer, {
  impersonatedAccountSelector,
  setImpersonatedAccount,
  setSelectedAccount,
  setAccounts,
  selectedAccountSelector,
  selectAllAccountsSelector,
} from './accountSlice';

// Import addressValidationReducer and actions from AddressValidationReducer file
import addressValidationReducer, {
  addressSelector,
  setAddressInputValue,
  setCityInputValue,
  setStateInputValue,
  setZipcodeInputValue,
  setAddressValidationErrorMessage,
  setAddressValidationIsEnabled,
  setAddressValidationIsExpanded,
  setAddressValidationIsComplete,
  setAddressValidationIsEditable,
  setPaymentMethodIsExpanded,
  setPaymentMethodIsComplete,
  setPaymentMethodIsEditable,
  setPaymentMethodIsCreditCard,
  resetAddressConfirmationState,
  clearAddressValidation,
  editAddressValidation,
} from './addressValidationSlice';

// Import configReducer and actions from ConfigReducer file
import configReducer, {
  setLanguage,
  setIsPartialPaymentAllowed,
  setOverpaymentAllowed,
  setDomainTheme,
  setMaxCreditAmountAllowed,
  setMaxECAmountAllowed,
  languageSelector,
  setApplicationConfig,
  setCustomConfig,
  setPaymentConfig,
  isPartialPaymentAllowedSelector,
  overpaymentAllowedSelector,
  domainThemeSelector,
  maxCreditAmount,
  maxECAmount,
  paymentConfigSelector,
  paymentConfigLoadedSelector,
} from './configSlice';

// Import invoiceReducer and actions from InvoiceReducer file
import invoiceReducer, {
  setSelectedInvoices,
  setSoldTo,
  setPayer,
  addValidatedAccount,
  clearValidatedAccounts,
  selectedInvoicesSelector,
  soldToSelector,
  invoicePayerSelector,
  validatedAccountsSelector,
} from './invoiceSlice';

// Import paymentReducer and actions from PaymentReducer file
import paymentReducer, {
  setPaymentMethods,
  setGuestPaymentMethods,
  setSelectedPayer,
  setPaymentCurrency,
  setMappedInvoices,
  setSelectedPaymentMethod,
  setDepositDetails,
  setDefaultCard,
  clearDepositDetails,
  clearDefaultCard,
  clearSelectedPaymentMethod,
  clearMappedInvoices,
  setScheduleDate,
  clearScheduleDate,
  mappedInvoicesSelector,
  paymentMethodsSelector,
  guestPaymentMethodsSelector,
  payerSelector,
  paymentCurrencySelector,
  selectedPaymentMethodSelector,
  depositDetailsSelector,
  defaultCardSelector,
} from './paymentSlice';

// Import sessionCardsReducer and actions from SessionCardsReducer file
import sessionCardsReducer, {
  addIsSession,
  removeIsSession,
  addSessionCard,
  updateSessionCard,
  deleteSessionCard,
  sessionCardsSelector,
  isSessionSelector,
} from './sessionCardsSlice';

// Import maintenanceReducer and actions from MaintenanceReducer file
import maintenanceReducer, {
  setMaintenanceStatus,
  setMaintenanceLoaded,
  clearMaintenanceStatus,
  maintenanceModeSelector,
  maintenanceConfigSelector,
  maintenanceMessageSelector,
  maintenanceFallbackUrlSelector,
  maintenanceLoadedSelector,
  isMaintenanceActiveSelector,
  isMaintenanceUnavailableSelector,
  isMaintenanceBlockingSelector,
} from './maintenanceSlice';

import { clearUserStore, clearStore } from './StoreAction';

// Import userReducer and actions from UserReducer file
import userReducer, {
  loginSuccess,
  loginFailed,
  logout,
  impersonateUser,
  unimpersonateUser,
  setRegionalFormat,
  userSelector,
  userHasAbility,
  impersonatedUserSelector,
  impersonatedUserIdSelector,
  regionalFormatSelector,
  UserDatum,
} from './userSlice';

import {
  selectAccountState,
  selectImpersonatedAccountState,
  selectImpersonatedUserState,
  selectUserState,
} from '../selectors/uiSelectors';

// Exporting both the reducers and the actions
export {
  // Account Reducer & Actions
  accountReducer,
  impersonatedAccountSelector,
  setImpersonatedAccount,
  setSelectedAccount,
  setAccounts,
  selectedAccountSelector,
  selectAllAccountsSelector,

  // Address Validation Reducer & Actions
  addressValidationReducer,
  addressSelector,
  setAddressInputValue,
  setCityInputValue,
  setStateInputValue,
  setZipcodeInputValue,
  setAddressValidationErrorMessage,
  setAddressValidationIsEnabled,
  setAddressValidationIsExpanded,
  setAddressValidationIsComplete,
  setAddressValidationIsEditable,
  setPaymentMethodIsExpanded,
  setPaymentMethodIsComplete,
  setPaymentMethodIsEditable,
  setPaymentMethodIsCreditCard,
  resetAddressConfirmationState,
  clearAddressValidation,
  editAddressValidation,

  // Config Reducer & Actions
  configReducer,
  setLanguage,
  setIsPartialPaymentAllowed,
  setOverpaymentAllowed,
  setDomainTheme,
  setMaxCreditAmountAllowed,
  setMaxECAmountAllowed,
  setApplicationConfig,
  setCustomConfig,
  setPaymentConfig,
  languageSelector,
  isPartialPaymentAllowedSelector,
  overpaymentAllowedSelector,
  domainThemeSelector,
  maxCreditAmount,
  maxECAmount,
  paymentConfigSelector,
  paymentConfigLoadedSelector,

  // Invoice Reducer & Actions
  invoiceReducer,
  setSelectedInvoices,
  setSoldTo,
  setPayer,
  addValidatedAccount,
  clearValidatedAccounts,
  selectedInvoicesSelector,
  soldToSelector,
  invoicePayerSelector,
  validatedAccountsSelector,

  // Payment Reducer & Actions
  paymentReducer,
  setPaymentMethods,
  setGuestPaymentMethods,
  setSelectedPayer,
  setPaymentCurrency,
  setMappedInvoices,
  setSelectedPaymentMethod,
  setDepositDetails,
  setDefaultCard,
  clearDepositDetails,
  clearDefaultCard,
  clearSelectedPaymentMethod,
  clearMappedInvoices,
  setScheduleDate,
  clearScheduleDate,
  mappedInvoicesSelector,
  paymentMethodsSelector,
  guestPaymentMethodsSelector,
  payerSelector,
  paymentCurrencySelector,
  selectedPaymentMethodSelector,
  depositDetailsSelector,
  defaultCardSelector,

  // Session Cards Reducer & Actions
  sessionCardsReducer,
  addIsSession,
  removeIsSession,
  addSessionCard,
  updateSessionCard,
  deleteSessionCard,
  sessionCardsSelector,
  isSessionSelector,

  // Maintenance Reducer & Actions
  maintenanceReducer,
  setMaintenanceStatus,
  setMaintenanceLoaded,
  clearMaintenanceStatus,
  maintenanceModeSelector,
  maintenanceConfigSelector,
  maintenanceMessageSelector,
  maintenanceFallbackUrlSelector,
  maintenanceLoadedSelector,
  isMaintenanceActiveSelector,
  isMaintenanceUnavailableSelector,
  isMaintenanceBlockingSelector,

  //Store Action
  clearUserStore,
  clearStore,

  // User Reducer & Actions
  userReducer,
  UserDatum,
  loginSuccess,
  loginFailed,
  logout,
  impersonateUser,
  unimpersonateUser,
  setRegionalFormat,
  userSelector,
  userHasAbility,
  impersonatedUserSelector,
  impersonatedUserIdSelector,
  regionalFormatSelector,

  //Selectors
  selectAccountState,
  selectImpersonatedAccountState,
  selectImpersonatedUserState,
  selectUserState,
};
