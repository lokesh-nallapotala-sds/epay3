import { ThemeConfig } from 'types/ThemeConfig';
import { SapConfig } from 'types/SapConfig/SapConfig';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ApplicationConfigRequest } from 'types/AppConfigRequest';
import { PaymentConfig } from 'types/Payment';

import { RootState } from '../EpayStore';

const ConfigDatum = {
  PaymentCardsType: 'config.paymentCardsType',
} as const;

const defaultTheme: ThemeConfig = {
  name: '',
  urls: [],
  banners: [],
  brandLogo: '',
  brandIcon: '',
  brandTitle: '',
  backgroundColor: '',
  headerBackgroundColor: '',
  primaryColor: '',
  contrastColor: '',
  hoverColor: '',
  buttonColor: '',
  buttonTextColor: '',
  buttonHoverColor: '',
  buttonHoverTextColor: '',
  buttonBorderColor: '',
  buttonBorderHoverColor: '',
  highlightColor: '',
  applicationName: '',
};
export const configSlice = createSlice({
  name: 'config',
  initialState: {
    language: 'en',
    isPartialPaymentAllowed: true,
    overpaymentAllowed: false,
    maxCreditAmount: 0,
    maxECAmount: 0,
    domainTheme: defaultTheme,
    paymentCardsType:
      sessionStorage.getItem(ConfigDatum.PaymentCardsType) || '',
    applicationConfig: null as ApplicationConfigRequest | null,
    customConfig: null as SapConfig | null,
    paymentConfig: null as PaymentConfig | null,
    paymentConfigLoaded: false,
    configLoaded: false,
    configError: null as string | null,
    configRefreshTrigger: 0,
  },
  reducers: {
    setLanguage: (state, action) => {
      state.language = action.payload;
    },
    setIsPartialPaymentAllowed: (state, action) => {
      state.isPartialPaymentAllowed = action.payload;
    },
    setOverpaymentAllowed: (state, action) => {
      state.overpaymentAllowed = action.payload;
    },
    setDomainTheme: (state, action) => {
      state.domainTheme = action.payload;
    },
    setMaxCreditAmountAllowed: (state, action) => {
      state.maxCreditAmount = action.payload;
    },
    setMaxECAmountAllowed: (state, action) => {
      state.maxECAmount = action.payload;
    },
    setPaymentCardsType: (state, action: PayloadAction<string>) => {
      state.paymentCardsType = action.payload;
      sessionStorage.setItem(ConfigDatum.PaymentCardsType, action.payload);
    },
    clearPaymentCardsType: (state) => {
      state.paymentCardsType = '';
      sessionStorage.removeItem(ConfigDatum.PaymentCardsType);
    },
    setApplicationConfig: (
      state,
      action: PayloadAction<ApplicationConfigRequest>,
    ) => {
      state.applicationConfig = action.payload;
    },
    setCustomConfig: (state, action: PayloadAction<SapConfig>) => {
      state.customConfig = action.payload;
    },
    setPaymentConfig: (state, action: PayloadAction<PaymentConfig>) => {
      state.paymentConfig = action.payload;
      state.paymentConfigLoaded = true;
    },
    clearPaymentConfig: (state) => {
      state.paymentConfig = null;
      state.paymentConfigLoaded = false;
    },
    setConfigLoaded: (state, action: PayloadAction<boolean>) => {
      state.configLoaded = action.payload;
    },
    setConfigError: (state, action: PayloadAction<string | null>) => {
      state.configError = action.payload;
    },
    refreshConfig: (state) => {
      state.configRefreshTrigger += 1;
    },
  },
});

export const {
  setLanguage,
  setIsPartialPaymentAllowed,
  setOverpaymentAllowed,
  setDomainTheme,
  setMaxCreditAmountAllowed,
  setMaxECAmountAllowed,
  setPaymentCardsType,
  clearPaymentCardsType,
  setApplicationConfig,
  setCustomConfig,
  setPaymentConfig,
  clearPaymentConfig,
  setConfigLoaded,
  setConfigError,
  refreshConfig,
} = configSlice.actions;
export const languageSelector = (state: RootState) => state.config.language;
export const isPartialPaymentAllowedSelector = (state: RootState) =>
  state.config.isPartialPaymentAllowed;
export const overpaymentAllowedSelector = (state: RootState) =>
  state.config.overpaymentAllowed;
export const domainThemeSelector = (state: RootState) =>
  state.config.domainTheme;
export const maxCreditAmount = (state: RootState) =>
  state.config.maxCreditAmount;
export const maxECAmount = (state: RootState) => state.config.maxECAmount;
export const paymentCardsTypeSelector = (state: RootState) =>
  state.config.paymentCardsType;
export const paymentConfigSelector = (state: RootState) =>
  state.config.paymentConfig;
export const paymentConfigLoadedSelector = (state: RootState) =>
  state.config.paymentConfigLoaded;

export default configSlice.reducer;
