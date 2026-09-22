import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  Ref,
} from 'react';
import styled from '@emotion/styled';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useIntl } from 'react-intl';

export interface PaymetricIframeRef {
  submit: () => Promise<boolean>;
  destroy: () => void;
}

interface PaymetricIframeProps {
  iframeUrl: string;
  onReady?: () => void;
  onError?: (error: string) => void;
  height?: string | number;
  width?: string | number;
}

const SecurePaymentIframe = styled('iframe')(() => ({
  width: '100%',
  minWidth: 280,
  border: 'none',
}));

export const PaymetricIframe = ({
  iframeUrl,
  onReady,
  onError,
  height = 300,
  width = '100%',
  ref,
}: PaymetricIframeProps & { ref?: Ref<PaymetricIframeRef> }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const initialIframeUrlRef = useRef<string>(iframeUrl);
  const iframeUrlRef = useRef<string>(iframeUrl);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const xiframeRegisteredRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intl = useIntl();
  const theme = useTheme();
  const iframeId = 'paymetric-iframe';

  // Keep refs updated with latest values
  useEffect(() => {
    iframeUrlRef.current = iframeUrl;
  }, [iframeUrl]);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const handleIframeLoad = useCallback(() => {
    // Fallback: If XIFrame.onload callback doesn't fire within 2s, use native onLoad
    setTimeout(() => {
      if (!xiframeRegisteredRef.current) {
        setIsLoading(false);
        setIsReady(true);
        onReadyRef.current?.();
      }
    }, 2000);
  }, []);

  // Register XIFrame onload ONCE when iframeUrl is set - only re-register if URL changes
  useEffect(() => {
    if (!iframeUrl) {
      setError('No iframe URL provided');
      setIsLoading(false);
      return;
    }

    xiframeRegisteredRef.current = false;

    let attempts = 0;
    const maxAttempts = 50;
    const pollInterval = 100;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const registerXIFrameCallback = () => {
      if (window.$XIFrame) {
        if (intervalId) clearInterval(intervalId);
        window.$XIFrame.onload({
          iFrameId: iframeId,
          targetUrl: iframeUrl,
          autosizewidth: false,
          autosizeheight: false,
          onSuccess: () => {
            xiframeRegisteredRef.current = true;
            setIsLoading(false);
            setIsReady(true);
            onReadyRef.current?.();
          },
          onError: (e: unknown) => {
            const errorMsg =
              typeof e === 'string' ? e : 'Failed to load payment form';
            setError(errorMsg);
            setIsLoading(false);
            onErrorRef.current?.(errorMsg);
          },
        });
        return true;
      }
      return false;
    };

    if (!registerXIFrameCallback()) {
      intervalId = setInterval(() => {
        attempts++;
        if (registerXIFrameCallback()) return;
        if (attempts >= maxAttempts) {
          if (intervalId) clearInterval(intervalId);
          setError('XIFrame library not loaded');
          setIsLoading(false);
          onErrorRef.current?.('XIFrame library not loaded');
        }
      }, pollInterval);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [iframeUrl]);

  useImperativeHandle(ref, () => ({
    submit: (): Promise<boolean> => {
      return new Promise((resolve) => {
        if (!isReady || !window.$XIFrame) {
          onErrorRef.current?.('Iframe not ready for submission');
          resolve(false);
          return;
        }

        const SUBMIT_TIMEOUT_MS = 3000;
        let settled = false;

        const timeoutId = setTimeout(() => {
          if (!settled) {
            settled = true;
            resolve(false);
          }
        }, SUBMIT_TIMEOUT_MS);

        window.$XIFrame.submit({
          iFrameId: iframeId,
          targetUrl: iframeUrlRef.current,
          onSuccess: () => {
            if (!settled) {
              settled = true;
              clearTimeout(timeoutId);
              resolve(true);
            }
          },
          onError: (error) => {
            if (!settled) {
              settled = true;
              clearTimeout(timeoutId);
              const errorMsg =
                typeof error === 'string'
                  ? error
                  : (error as { message?: string })?.message ||
                    'Tokenization failed';
              setError(errorMsg);
              onErrorRef.current?.(errorMsg);
              resolve(false);
            }
          },
        });
      });
    },
    destroy: () => {
      if (window.$XIFrame && typeof window.$XIFrame.onload === 'function') {
        // XIFrame doesn't document a formal destroy, but removing the node from DOM
        // and suppressing readiness helps ensure the next mount handles it freshly.
        setIsReady(false);
      }
    },
  }));

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height,
          width,
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          backgroundColor: '#fafafa',
        }}
      >
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'relative',
        width,
        minWidth: 280,
        minHeight: height,
        flexShrink: 0,
      }}
    >
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            zIndex: 1,
          }}
        >
          <CircularProgress
            size={24}
            sx={{ color: theme.palette.spinner.main, opacity: 0.75 }}
          />
        </Box>
      )}
      <SecurePaymentIframe
        id={iframeId}
        ref={iframeRef}
        src={initialIframeUrlRef.current}
        sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-top-navigation-by-user-activation"
        onLoad={handleIframeLoad}
        title={intl.formatMessage({
          id: 'paymetric.iframe.title',
          defaultMessage: 'Secure Payment Entry',
        })}
        height={typeof height === 'number' ? height : undefined}
      />
    </Box>
  );
};

export default PaymetricIframe;
