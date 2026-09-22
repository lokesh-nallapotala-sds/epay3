import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import {
  MaintenanceConfigRequest,
  MaintenanceStatusMode,
  MaintenanceStatusResponse,
} from 'types/AppConfigRequest';

import { RootState } from '../EpayStore';

export interface MaintenanceSliceState {
  mode: MaintenanceStatusMode;
  config: MaintenanceConfigRequest | null;
  message: string | null;
  fallbackUrl: string | null;
  // Whether the central status has been resolved at least once. Guards and
  // pages use this to avoid acting (e.g. redirecting) before the first fetch.
  loaded: boolean;
}

export const maintenanceSliceInitialState: MaintenanceSliceState = {
  mode: 'none',
  config: null,
  message: null,
  fallbackUrl: null,
  loaded: false,
};

export const maintenanceSlice = createSlice({
  name: 'maintenance',
  initialState: maintenanceSliceInitialState,
  reducers: {
    setMaintenanceStatus: (
      state,
      action: PayloadAction<MaintenanceStatusResponse>,
    ) => {
      const payload = action.payload;
      state.mode = payload.mode ?? payload.code ?? 'none';
      state.config = payload.maintenanceConfig ?? null;
      state.message = payload.message ?? null;
      state.fallbackUrl = payload.fallbackUrl ?? null;
      state.loaded = true;
    },
    // Used when a status fetch fails so guards can stop blocking render.
    setMaintenanceLoaded: (state, action: PayloadAction<boolean>) => {
      state.loaded = action.payload;
    },
    clearMaintenanceStatus: (state) => {
      state.mode = 'none';
      state.config = null;
      state.message = null;
      state.fallbackUrl = null;
    },
  },
});

export const {
  setMaintenanceStatus,
  setMaintenanceLoaded,
  clearMaintenanceStatus,
} = maintenanceSlice.actions;

export const maintenanceModeSelector = (state: RootState) =>
  state.maintenance.mode;
export const maintenanceConfigSelector = (state: RootState) =>
  state.maintenance.config;
export const maintenanceMessageSelector = (state: RootState) =>
  state.maintenance.message;
export const maintenanceFallbackUrlSelector = (state: RootState) =>
  state.maintenance.fallbackUrl;
export const maintenanceLoadedSelector = (state: RootState) =>
  state.maintenance.loaded;
export const isMaintenanceActiveSelector = (state: RootState) =>
  state.maintenance.mode === 'maintenance_active';
export const isMaintenanceUnavailableSelector = (state: RootState) =>
  state.maintenance.mode === 'maintenance_unavailable';
export const isMaintenanceBlockingSelector = (state: RootState) =>
  state.maintenance.mode === 'maintenance_active' ||
  state.maintenance.mode === 'maintenance_unavailable';

export default maintenanceSlice.reducer;
