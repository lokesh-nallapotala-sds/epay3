import dayjs from 'dayjs';

import {
  MaintenanceConfigRequest,
  MaintenanceStatusMode,
  MaintenanceStatusResponse,
} from 'types/AppConfigRequest';
import { clearSelectedAccountId } from 'utilities/accountPersistence';

export const MAINTENANCE_UNAVAILABLE_PATH = '/maintenance/unavailable';
export const MAINTENANCE_EVENT_NAME = 'epay:maintenance-status';
const LOCATION_CHANGE_EVENT_NAME = 'epay:location-change';

const MAINTENANCE_UNAVAILABLE_REDIRECT_FLAG =
  'maintenance_unavailable_redirect_pending';
const maintenanceStatusModes = new Set<MaintenanceStatusMode>([
  'none',
  'maintenance_active',
  'maintenance_unavailable',
]);

const protectedUserPathPrefixes = [
  '/home',
  '/history',
  '/payment',
  '/payments',
  '/scheduleddetails',
  '/settings',
  '/configuration',
];

const protectedSessionPathPrefixes = [
  ...protectedUserPathPrefixes,
  '/admin/maintenance',
];

const publicGuestPaymentPathPrefixes = [
  '/payment/guest',
  '/payment/guest/receipt',
];

export function isMaintenanceStatusResponse(
  value: unknown,
): value is MaintenanceStatusResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const response = value as Partial<MaintenanceStatusResponse>;
  return (
    isMaintenanceStatusMode(response.mode) ||
    isMaintenanceStatusMode(response.code)
  );
}

function isMaintenanceStatusMode(
  value: unknown,
): value is MaintenanceStatusMode {
  return (
    typeof value === 'string' &&
    maintenanceStatusModes.has(value as MaintenanceStatusMode)
  );
}

export function redirectToMaintenanceUnavailable(
  fallbackUrl?: string | null,
): void {
  sessionStorage.setItem(MAINTENANCE_UNAVAILABLE_REDIRECT_FLAG, 'true');
  window.location.href = fallbackUrl || MAINTENANCE_UNAVAILABLE_PATH;
}

export function isMaintenanceUnavailableRedirectPending(): boolean {
  return (
    sessionStorage.getItem(MAINTENANCE_UNAVAILABLE_REDIRECT_FLAG) === 'true'
  );
}

export function clearMaintenanceUnavailableRedirect(): void {
  sessionStorage.removeItem(MAINTENANCE_UNAVAILABLE_REDIRECT_FLAG);
}

const MAINTENANCE_SIGNED_OUT_FLAG = 'maintenance_signed_out_pending';

// True while a maintenance-triggered full-page navigation is underway.
// Lets the generic 401 session-expiry handler stand down so it doesn't wipe
// the signed-out flag (sessionStorage.clear()) before the reload happens.
let maintenanceRedirectInProgress = false;

// A bfcache restore (browser Back) revives the old JS heap with the marker
// still set; reset it so session-expiry handling works on the restored page.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    maintenanceRedirectInProgress = false;
  }
});

export function isMaintenanceRedirectInProgress(): boolean {
  return maintenanceRedirectInProgress;
}

export function markMaintenanceSignedOut(): void {
  sessionStorage.setItem(MAINTENANCE_SIGNED_OUT_FLAG, 'true');
}

/**
 * Reads and clears the "signed out due to maintenance" flag. Cleared
 * unconditionally so a flag set without a subsequent reload (e.g. a 401
 * received while already on the login page) cannot resurface later.
 */
export function consumeMaintenanceSignedOut(): boolean {
  const signedOut =
    sessionStorage.getItem(MAINTENANCE_SIGNED_OUT_FLAG) === 'true';
  sessionStorage.removeItem(MAINTENANCE_SIGNED_OUT_FLAG);
  return signedOut;
}

/**
 * Single canonical reaction to a maintenance status payload, shared by every
 * HTTP layer (fetch interceptor and RTK Query). Returns true when the payload
 * was a maintenance status and a redirect was initiated (or already pending).
 */
export function handleMaintenanceStatusPayload(
  payload: unknown,
  opts?: { signedOut?: boolean },
): boolean {
  if (!isMaintenanceStatusResponse(payload)) {
    return false;
  }

  const mode = payload.mode ?? payload.code;

  if (mode === 'maintenance_unavailable') {
    maintenanceRedirectInProgress = true;
    if (!isMaintenanceUnavailableRedirectPending()) {
      clearSelectedAccountId();
      // Clear before redirecting: redirectToMaintenanceUnavailable stores its
      // pending flag in sessionStorage.
      sessionStorage.clear();
      redirectToMaintenanceUnavailable(payload.fallbackUrl);
    }
    return true;
  }

  if (mode === 'maintenance_active') {
    clearSelectedAccountId();
    sessionStorage.clear();
    if (window.location.pathname !== '/') {
      if (opts?.signedOut) {
        // After the clear, so the flag survives the reload; consumed by
        // LoginPage on mount to show the "signed out" toast. Only set when a
        // reload follows — on the login page itself the mount effect already
        // ran, so the flag would go stale and toast on some later visit.
        markMaintenanceSignedOut();
      }
      // Only mark while a reload is actually underway — the marker suppresses
      // the session-expiry handler, and without a reload it would never reset.
      maintenanceRedirectInProgress = true;
      // Full reload so the login page renders the maintenance banner.
      window.location.href = '/';
    }
    return true;
  }

  return false;
}

/**
 * Fetch-layer variant: sniffs maintenance payloads out of 401/403/503 JSON
 * responses produced by the backend maintenance middleware.
 */
export async function handleMaintenanceHttpResponse(
  response: Response,
): Promise<boolean> {
  if (response.ok || ![401, 403, 503].includes(response.status)) {
    return false;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return false;
  }

  try {
    // 401 comes from the authenticated maintenance middleware, i.e. the user
    // had a session and is being signed out by this response.
    return handleMaintenanceStatusPayload(await response.clone().json(), {
      signedOut: response.status === 401,
    });
  } catch {
    return false;
  }
}

export function isProtectedSessionPath(pathname: string): boolean {
  if (isPublicGuestPaymentPath(pathname)) {
    return false;
  }

  return protectedSessionPathPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isProtectedUserPath(pathname: string): boolean {
  if (isPublicGuestPaymentPath(pathname)) {
    return false;
  }

  return protectedUserPathPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isPublicGuestPaymentPath(pathname: string): boolean {
  return publicGuestPaymentPathPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function getLocationChangeEventName(): string {
  return LOCATION_CHANGE_EVENT_NAME;
}

export function dispatchLocationChange(): void {
  window.dispatchEvent(new CustomEvent(LOCATION_CHANGE_EVENT_NAME));
}

export function getMaintenanceRedirectTarget(
  response: MaintenanceStatusResponse,
): string {
  if (response.mode === 'maintenance_unavailable') {
    return response.fallbackUrl || MAINTENANCE_UNAVAILABLE_PATH;
  }

  return '/';
}

export function isMaintenanceAdminPath(pathname: string): boolean {
  return (
    pathname === '/admin/maintenance' ||
    pathname.startsWith('/admin/maintenance/')
  );
}

export function formatMaintenanceMessage(
  config: MaintenanceConfigRequest | null | undefined,
  selectedLanguage: string,
  fallbackMessage?: string | null,
): string {
  if (!config) {
    return fallbackMessage ?? '';
  }

  const template =
    config.notificationText?.[selectedLanguage] ??
    config.notificationText?.[config.notificationLanguage] ??
    config.notificationText?.en ??
    Object.values(config.notificationText ?? {}).find(Boolean) ??
    fallbackMessage ??
    '';

  if (!template) {
    return '';
  }

  const fromDateLocal = dayjs(config.fromDateLocal);
  const toDateLocal = dayjs(config.toDateLocal);

  return template
    .replace('<%datefrom%>', formatMaintenanceDate(fromDateLocal.toDate()))
    .replace('<%timefrom%>', formatMaintenanceTime(fromDateLocal.toDate()))
    .replace('<%dateto%>', formatMaintenanceDate(toDateLocal.toDate()))
    .replace('<%timeto%>', formatMaintenanceTime(toDateLocal.toDate()));
}

function formatMaintenanceDate(value: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(value);
}

function formatMaintenanceTime(value: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(value);
}
