import { useState, useCallback } from 'react';
import { useEpayToast } from 'providers/EpayToastProvider';
import { extractErrorMessage } from 'utilities/utilities';
import type { TokenResponse } from 'types/AccountResponse';
export type { TokenResponse };

export const useIframeInitialization = (
  fetchToken: () => Promise<TokenResponse>,
) => {
  const [accessToken, setAccessToken] = useState<string>('');
  const [iframeUrl, setIframeUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeReady, setIframeReady] = useState<boolean>(false);
  const { showToastMessage } = useEpayToast();

  const initializeIframe = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setIframeReady(false);

      const response = await fetchToken();

      if (
        response.accessToken &&
        response.paymetricUrl &&
        response.merchantId
      ) {
        setAccessToken(response.accessToken);
        let url = response.paymetricUrl.includes('/view/iframe/')
          ? response.paymetricUrl
          : `${response.paymetricUrl}/view/iframe/${response.merchantId}/${response.accessToken}/true`;

        url += url.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`;
        setIframeUrl(url);
      } else {
        throw new Error('Invalid access token response');
      }
    } catch (err: unknown) {
      const message = extractErrorMessage(
        err,
        'Failed to initialize payment form',
      );
      setError(message);
      showToastMessage('error', message);
    } finally {
      setIsLoading(false);
    }
  }, [fetchToken, showToastMessage]);

  const handleIframeReady = useCallback(() => {
    setIframeReady(true);
  }, []);

  const handleIframeError = useCallback(
    (errorMsg: string) => {
      setError(errorMsg);
      showToastMessage('error', errorMsg);
    },
    [showToastMessage],
  );

  return {
    accessToken,
    iframeUrl,
    isLoading,
    error,
    setError,
    iframeReady,
    initializeIframe,
    handleIframeReady,
    handleIframeError,
  };
};
