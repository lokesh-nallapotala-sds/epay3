import { Navigate, Outlet } from 'react-router';

import { useAppSelector } from 'redux/hooks';
import {
  maintenanceLoadedSelector,
  maintenanceModeSelector,
} from 'redux/reducers';
import { MAINTENANCE_UNAVAILABLE_PATH } from 'utilities/maintenance';

/**
 * Route guard for public, unauthenticated pages (Create Account, Forgot
 * Password, Guest Payment, etc.). Blocks direct-URL access while maintenance
 * is active or the system is unavailable, using the central maintenance status
 * (no per-page API call).
 *
 * While maintenance is active the user is sent to the login page, which renders
 * the maintenance banner. When the system is unavailable they are sent to the
 * dedicated unavailable page.
 */
export default function RequireNoMaintenance() {
  const loaded = useAppSelector(maintenanceLoadedSelector);
  const mode = useAppSelector(maintenanceModeSelector);

  // Wait for the first status resolution before rendering protected public
  // content, so direct-URL access can't slip through before the check runs.
  if (!loaded) {
    return null;
  }

  if (mode === 'maintenance_unavailable') {
    // External fallback URLs are handled by MaintenanceProvider via a full
    // navigation; here we only need the internal unavailable route.
    return <Navigate to={MAINTENANCE_UNAVAILABLE_PATH} replace />;
  }

  if (mode === 'maintenance_active') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
