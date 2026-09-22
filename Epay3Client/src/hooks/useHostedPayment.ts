import { useCallback, useEffect, useRef, useState } from 'react';

import { useAppSelector } from 'redux/hooks';
import { getDynamicThemeStylesUrl, safeJsonParse } from 'utilities/utilities';
import { EpayPaymentService } from 'services/EpayPaymentService';
import { domainThemeSelector, impersonatedUserSelector } from 'redux/reducers';
import {
  HostedPaymentMessage,
  HostedPaymentResult,
  HostedPaymentSession,
} from 'types/HostedPayment';

const CHANNEL_NAME = 'hosted-payment-channel';
const SESSION_STORAGE_KEY = 'hosted-payment-session';
const RESULT_STORAGE_KEY = 'hosted-payment-result';
const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

interface UseHostedPaymentOptions {
  onComplete?: (result: HostedPaymentResult) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

export interface RedirectToHostedPageOptions {
  paymentMethod: 'CC' | 'EC';
  isGuest: boolean;
  saveOnFile?: boolean;
  defaultCard?: boolean;
  accountType?: string;
  accountId?: string;
  onLoadingChange?: (isLoading: boolean) => void;
  merchantHtml?: string;
}

interface UseHostedPaymentReturn {
  isWaiting: boolean;
  error: string | null;
  openHostedPage: (
    hostedUrl: string,
    paymentMethod: 'CC' | 'EC',
    accessToken: string,
    isGuest: boolean,
    accountType?: string,
    saveOnFile?: boolean,
    defaultCard?: boolean,
  ) => string;
  redirectToHostedPage: (options: RedirectToHostedPageOptions) => Promise<void>;
  cancelHostedPayment: () => void;
  currentSession: HostedPaymentSession | null;
}

export const useHostedPayment = (
  options: UseHostedPaymentOptions = {},
): UseHostedPaymentReturn => {
  const { onComplete, onError, onCancel } = options;
  const impersonatedUser = useAppSelector(impersonatedUserSelector);
  const impersonatedUserId = impersonatedUser?.userId;
  const domainTheme = useAppSelector(domainThemeSelector);

  // Initialize state from storage
  const [currentSession, setCurrentSession] =
    useState<HostedPaymentSession | null>(() => {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      return safeJsonParse<HostedPaymentSession | null>(saved, null);
    });
  const [isWaiting, setIsWaiting] = useState(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hasParams =
      searchParams.has('access_token') ||
      searchParams.has('id') ||
      searchParams.has('status');
    return !!currentSession && !hasParams;
  });

  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<BroadcastChannel | null>(null);
  const windowRef = useRef<Window | null>(null);
  const isRedirectingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getPaymentMethodEntryToken =
    EpayPaymentService.useGetPaymentMethodEntryToken();
  const getGuestPaymentMethodEntryToken =
    EpayPaymentService.useGetGuestPaymentMethodEntryToken();

  const generateSessionId = (): string => {
    return `hp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  };

  const generateSessionNonce = (): string => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
      '',
    );
  };

  const isHostedPaymentMessage = (
    message: unknown,
    session: HostedPaymentSession,
  ): message is HostedPaymentMessage => {
    if (!message || typeof message !== 'object') {
      return false;
    }

    const candidate = message as Partial<HostedPaymentMessage>;
    const validTypes = [
      'HOSTED_PAYMENT_COMPLETE',
      'HOSTED_PAYMENT_ERROR',
      'HOSTED_PAYMENT_CANCELLED',
    ];

    return (
      typeof candidate.type === 'string' &&
      validTypes.includes(candidate.type) &&
      candidate.sessionId === session.sessionId &&
      candidate.nonce === session.nonce
    );
  };

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (channelRef.current) {
      channelRef.current.close();
      channelRef.current = null;
    }
    windowRef.current = null;
    setIsWaiting(false);
    setCurrentSession(null);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(`${SESSION_STORAGE_KEY}_token`);
    sessionStorage.removeItem(RESULT_STORAGE_KEY);
  }, []);

  const handleMessage = useCallback(
    (message: unknown) => {
      // Check for current session (either from state or freshly read from storage)
      const session = currentSession || getHostedPaymentSession();
      if (!session || !isHostedPaymentMessage(message, session)) {
        return;
      }

      const accessToken =
        message.payload?.accessToken ||
        sessionStorage.getItem(`${SESSION_STORAGE_KEY}_token`) ||
        undefined;

      cleanup();

      switch (message.type) {
        case 'HOSTED_PAYMENT_COMPLETE':
          if (message.payload?.paymentCard) {
            const result: HostedPaymentResult = {
              success: true,
              paymentCard: message.payload.paymentCard,
              accessToken,
            };
            onComplete?.(result);
          } else {
            setError('Payment completed but no card data received');
            onError?.('Payment completed but no card data received');
          }
          break;

        case 'HOSTED_PAYMENT_ERROR':
          setError(message.error || 'Payment failed');
          onError?.(message.error || 'Payment failed');
          break;

        case 'HOSTED_PAYMENT_CANCELLED':
          onCancel?.();
          break;
      }
    },
    [currentSession, cleanup, onComplete, onError, onCancel],
  );

  // Check for results from redirect flow on mount (either from localStorage or query params)
  useEffect(() => {
    // 2. Check for results in sessionStorage (fallback/redirect flow)
    const savedResult = sessionStorage.getItem(RESULT_STORAGE_KEY);

    if (savedResult && currentSession) {
      try {
        const result: HostedPaymentMessage = JSON.parse(savedResult);

        if (result.sessionId === currentSession.sessionId) {
          sessionStorage.removeItem(RESULT_STORAGE_KEY);
          handleMessage(result);
        }
      } catch {}
    }
  }, [currentSession, handleMessage]);

  // Setup BroadcastChannel listener and check for existing results
  useEffect(() => {
    if (!isWaiting) return;

    // Try BroadcastChannel first (modern browsers)
    try {
      channelRef.current = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current.onmessage = (event: MessageEvent) => {
        handleMessage(event.data as HostedPaymentMessage);
      };
    } catch {}

    // Polling fallback (useful for redirects too)
    pollIntervalRef.current = setInterval(() => {
      const resultStr = sessionStorage.getItem(RESULT_STORAGE_KEY);
      if (resultStr) {
        try {
          const message = JSON.parse(resultStr) as HostedPaymentMessage;
          sessionStorage.removeItem(RESULT_STORAGE_KEY);
          handleMessage(message);
        } catch {}
      }
    }, 500);

    // Timeout handler
    timeoutRef.current = setTimeout(() => {
      cleanup();
      setError('Payment session timed out');
      onError?.('Payment session timed out');
    }, TIMEOUT_MS);

    return () => {
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isWaiting, handleMessage, cleanup, onError]);

  // Monitor if the popup window was closed manually
  useEffect(() => {
    if (!isWaiting || !windowRef.current) return;

    const checkWindow = setInterval(() => {
      if (windowRef.current?.closed) {
        clearInterval(checkWindow);
        // Check if we received a result before the window closed
        const resultStr = sessionStorage.getItem(RESULT_STORAGE_KEY);
        if (!resultStr) {
          cleanup();
          onCancel?.();
        }
      }
    }, 1000);

    return () => clearInterval(checkWindow);
  }, [isWaiting, cleanup, onCancel]);

  const openHostedPage = useCallback(
    (
      hostedUrl: string,
      paymentMethod: 'CC' | 'EC',
      accessToken: string,
      isGuest: boolean,
      accountType?: string,
      saveOnFile?: boolean,
      defaultCard?: boolean,
    ): string => {
      cleanup();
      setError(null);

      const sessionId = generateSessionId();
      const session: HostedPaymentSession = {
        sessionId,
        nonce: generateSessionNonce(),
        paymentMethod,
        accountType,
        isGuest,
        saveOnFile,
        defaultCard,
        timestamp: Date.now(),
        returnUrl: window.location.href,
      };

      setCurrentSession(session);
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

      // Store accessToken for the callback handler to use
      sessionStorage.setItem(`${SESSION_STORAGE_KEY}_token`, accessToken);

      setIsWaiting(true);
      isRedirectingRef.current = true;

      // Redirect in the same tab
      window.location.href = hostedUrl;

      return sessionId;
    },
    [cleanup, onError],
  );

  const cancelHostedPayment = useCallback(() => {
    if (windowRef.current && !windowRef.current.closed) {
      windowRef.current.close();
    }
    cleanup();
    onCancel?.();
  }, [cleanup, onCancel]);

  const redirectToHostedPage = useCallback(
    async (options: RedirectToHostedPageOptions) => {
      const {
        paymentMethod,
        isGuest,
        accountId,
        onLoadingChange,
        merchantHtml,
        accountType,
        saveOnFile,
        defaultCard,
      } = options;
      try {
        onLoadingChange?.(true);
        setError(null);

        const isEC = paymentMethod === 'EC';

        const cardinalData: Record<string, string> = {
          action: '01',
          payment_method: paymentMethod,
          pmint: 'H',
          host_url: window.location.href.split(/[?#]/)[0],
          css_url: getDynamicThemeStylesUrl(domainTheme, paymentMethod, 'H'),
          redirect_uri: window.location.href.split(/[?#]/)[0],
          'merchant-html': merchantHtml || '',
        };

        if (isEC) {
          cardinalData.account_type = '';
        } else {
          cardinalData.card_indicator = 'X';
        }

        let response;
        if (isGuest) {
          response = await getGuestPaymentMethodEntryToken(
            '01',
            paymentMethod,
            cardinalData,
          );
        } else {
          if (!accountId) {
            throw new Error('Account ID is required for non-guest payments');
          }
          response = await getPaymentMethodEntryToken(
            '01',
            paymentMethod,
            accountId,
            cardinalData,
            impersonatedUserId || '',
          );
        }

        if (
          response.accessToken &&
          response.paymetricUrl &&
          response.merchantId
        ) {
          let baseUrl = response.paymetricUrl;
          if (baseUrl.includes('/DIeComm/')) {
            baseUrl = baseUrl.substring(0, baseUrl.indexOf('/DIeComm/'));
          }
          const hostedUrl = `${baseUrl}/DIeComm/paymentpage/index/${response.merchantId}/${response.accessToken}/`;

          openHostedPage(
            hostedUrl,
            paymentMethod,
            response.accessToken,
            isGuest,
            accountType,
            saveOnFile,
            defaultCard,
          );
        } else {
          throw new Error('Invalid access token response');
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to initialize payment';
        setError(errorMsg);
        onError?.(errorMsg);
      } finally {
        onLoadingChange?.(false);
      }
    },
    [
      getGuestPaymentMethodEntryToken,
      getPaymentMethodEntryToken,
      openHostedPage,
      onError,
    ],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRedirectingRef.current) {
        return;
      }

      cleanup();
    };
  }, [cleanup]);

  return {
    isWaiting,
    error,
    openHostedPage,
    redirectToHostedPage,
    cancelHostedPayment,
    currentSession,
  };
};

// Utility function for the callback handler to send results back
export const sendHostedPaymentResult = (
  message: HostedPaymentMessage,
): void => {
  // Try BroadcastChannel first
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(message);
    channel.close();
  } catch {
    // Fallback: use sessionStorage (scoped to tab, cleared on close)
    sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(message));
  }
};

// Get current session from storage (for callback handler)
export const getHostedPaymentSession = (): HostedPaymentSession | null => {
  const sessionStr = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionStr) return null;
  try {
    return JSON.parse(sessionStr) as HostedPaymentSession;
  } catch {
    return null;
  }
};

// Get stored access token (for callback handler)
export const getHostedPaymentAccessToken = (): string | null => {
  return sessionStorage.getItem(`${SESSION_STORAGE_KEY}_token`);
};

// Utility function to clear current session
export const clearHostedPaymentSession = (): void => {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  sessionStorage.removeItem(`${SESSION_STORAGE_KEY}_token`);
  sessionStorage.removeItem(RESULT_STORAGE_KEY);
};

// Utility function to clean up URL parameters after processing a hosted payment redirect
export const cleanUrlAfterHostedPayment = (): void => {
  const newUrl = new URL(window.location.href);
  const keysToToRemove = [
    'id',
    'access_token',
    'status',
    'error_message',
    'account_type',
    'epay3ds',
    'v_ref',
  ];
  let changed = false;

  keysToToRemove.forEach((key) => {
    if (newUrl.searchParams.has(key)) {
      newUrl.searchParams.delete(key);
      changed = true;
    }
  });

  if (changed) {
    window.history.replaceState(
      window.history.state,
      document.title,
      newUrl.pathname + newUrl.search + newUrl.hash,
    );
  }
  clearHostedPaymentSession();
};

// Global function to process a hosted payment redirect from the URL
export const processHostedPaymentRedirect = (): void => {
  const searchParams = new URLSearchParams(window.location.search);
  const status = searchParams.get('status');
  const id = searchParams.get('id');

  if (!status && !id) return;

  const session = getHostedPaymentSession();
  if (!session) {
    // If no session exists but params do, just clean the URL to be safe
    cleanUrlAfterHostedPayment();
    return;
  }

  // Construct a message based on the URL parameters
  let message: HostedPaymentMessage | null = null;

  if (status === 'cancel') {
    message = {
      type: 'HOSTED_PAYMENT_CANCELLED',
      sessionId: session.sessionId,
      nonce: session.nonce,
    };
  } else if (status === 'error') {
    message = {
      type: 'HOSTED_PAYMENT_ERROR',
      sessionId: session.sessionId,
      nonce: session.nonce,
      error: searchParams.get('error_message') || 'An unknown error occurred',
    };
  }

  if (message) {
    sendHostedPaymentResult(message);
  }

  // Always clean the URL and storage after processing
  cleanUrlAfterHostedPayment();
};

// Utility function to accurately infer the payment card type checking the session metadata
export const inferHostedPaymentCardType = (
  tokenizeResponseCardType?: string,
): string => {
  const session = getHostedPaymentSession();
  let rawType = (
    tokenizeResponseCardType ||
    session?.paymentMethod ||
    'CC'
  ).toUpperCase();

  // If session explicitly states it's an eCheck, ensure we use EC even if the provider returns CC
  if (session?.paymentMethod === 'EC') {
    rawType = 'EC';
  }

  return rawType;
};

// Utility function to extract the electronic check account type from the hosted session
export const inferHostedAccountType = (
  urlAccountTypeParam?: string | null,
): string => {
  const session = getHostedPaymentSession();
  return session?.accountType || urlAccountTypeParam || '';
};

export default useHostedPayment;
