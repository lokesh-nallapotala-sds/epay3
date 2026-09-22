import { useCallback, useEffect } from 'react';
import { useLocation } from 'react-router';

import { useAppDispatch, useAppSelector } from 'redux/hooks';
import {
  clearUserStore,
  logout,
  maintenanceModeSelector,
  setMaintenanceLoaded,
  setMaintenanceStatus,
} from 'redux/reducers';
import { clearSelectedAccountId } from 'utilities/accountPersistence';
import {
  clearMaintenanceUnavailableRedirect,
  isMaintenanceAdminPath,
  isMaintenanceUnavailableRedirectPending,
  MAINTENANCE_UNAVAILABLE_PATH,
  markMaintenanceSignedOut,
  redirectToMaintenanceUnavailable,
} from 'utilities/maintenance';
import { MaintenanceStatusResponse } from 'types/AppConfigRequest';
import { useEpayQuery } from './EpayQueryProvider';

/**
 * Single, application-level owner of maintenance status.
 *
 * Fetches the status on app load, on login-state changes, and on every route
 * change — navigation is the activity signal, so a window that opens
 * mid-session is caught on the user's next move even when the target page
 * serves cached data and fires no API call. There is no polling: between
 * navigations, maintenance is detected reactively by the HTTP layers
 * (handleMaintenanceHttpResponse / RTK Query) when the backend middleware
 * rejects a request with a maintenance payload. Pages and route guards read
 * the status from Redux selectors rather than calling the API themselves.
 */
export default function MaintenanceProvider() {
  const api = useEpayQuery();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const loggedIn = useAppSelector((state) => state.user.loggedIn);
  const mode = useAppSelector(maintenanceModeSelector);

  const refreshStatus = useCallback(async () => {
    try {
      const response = await api.getMaintenanceModeStatus();
      if (!response.ok) {
        dispatch(setMaintenanceLoaded(true));
        return;
      }

      const payload = (await response.json()) as MaintenanceStatusResponse;
      dispatch(setMaintenanceStatus(payload));
    } catch {
      // Network/parse failure: don't block the UI, just mark resolved.
      dispatch(setMaintenanceLoaded(true));
    }
  }, [api, dispatch]);

  // Fetch on mount, when the login state changes, and on every route change
  // (one lightweight anonymous GET per navigation).
  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus, loggedIn, location.pathname]);

  // React to the resolved status. Admins are exempt so they can reach the
  // admin login / maintenance screens while maintenance is active.
  useEffect(() => {
    const pathname = location.pathname;

    if (
      isMaintenanceAdminPath(pathname) ||
      pathname === '/login/admin' ||
      pathname === '/admin/recovery'
    ) {
      return;
    }

    if (pathname === MAINTENANCE_UNAVAILABLE_PATH) {
      clearMaintenanceUnavailableRedirect();
    }

    if (mode === 'maintenance_unavailable') {
      if (
        pathname !== MAINTENANCE_UNAVAILABLE_PATH &&
        !isMaintenanceUnavailableRedirectPending()
      ) {
        if (loggedIn) {
          clearSelectedAccountId();
          dispatch(clearUserStore());
        }
        redirectToMaintenanceUnavailable();
      }
      return;
    }

    if (mode === 'maintenance_active' && loggedIn) {
      // Consumed by LoginPage (mounted by the IfNotLoggedIn guard right after
      // the store clears) to explain the sign-out.
      markMaintenanceSignedOut();
      clearSelectedAccountId();
      dispatch(clearUserStore());
      dispatch(logout());
    }
  }, [mode, loggedIn, dispatch, location.pathname]);

  return null;
}
