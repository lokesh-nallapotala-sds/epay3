import {
  combineReducers,
  configureStore,
  type UnknownAction,
} from '@reduxjs/toolkit';
import { clearSelectedAccount } from 'utilities/accountPersistence';
import { clearPaymentSession3DS } from './reducers/paymentSlice';

import { ePayApi } from './api/ePayApi';
import ConfigReducer from './reducers/configSlice';
import { StoreAction } from './reducers/StoreAction';
import UserReducer from './reducers/userSlice';
import AccountReducer from './reducers/accountSlice';
import InvoiceReducer, { clearInvoiceSession } from './reducers/invoiceSlice';
import PaymentReducer from './reducers/paymentSlice';
import SessionCardsReducer from './reducers/sessionCardsSlice';
import AddressValidationReducer from './reducers/addressValidationSlice';
import MaintenanceReducer from './reducers/maintenanceSlice';

const appReducer = combineReducers({
  user: UserReducer,
  account: AccountReducer,
  payment: PaymentReducer,
  config: ConfigReducer,
  sessionCards: SessionCardsReducer,
  invoice: InvoiceReducer,
  address: AddressValidationReducer,
  [ePayApi.reducerPath]: ePayApi.reducer,
  maintenance: MaintenanceReducer,
});

type AppState = ReturnType<typeof appReducer>;

const rootReducer = (
  state: AppState | undefined,
  action: UnknownAction,
): AppState => {
  if (action.type === StoreAction.ClearAll) {
    return appReducer(undefined, action);
  }

  if (action.type === StoreAction.ClearUser) {
    clearSelectedAccount();
    clearPaymentSession3DS();
    clearInvoiceSession();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return appReducer({ config: state?.config } as any, action);
  }

  return appReducer(state, action);
};

const EpayStore = configureStore({
  reducer: rootReducer,

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(ePayApi.middleware) as any,
});

//used for wrapping the components for jest tests
export const setupStore = (preloadedState?: Partial<RootState>) => {
  return configureStore({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reducer: rootReducer as any,

    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(ePayApi.middleware) as any,
    preloadedState,
  });
};
export type AppStore = ReturnType<typeof setupStore>;

export default EpayStore;
export type RootState = ReturnType<typeof EpayStore.getState>;
export type AppDispatch = typeof EpayStore.dispatch;
