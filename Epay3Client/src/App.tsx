import { Suspense, useEffect } from 'react';

import createCache from '@emotion/cache';
import { useAppSelector } from 'redux/hooks';
import Waiter from 'components/waiter/Waiter';
import { CacheProvider } from '@emotion/react';
import AppErrorBoundary from 'shared/errors/AppErrorBoundary';
import { getAppBaseUrl } from 'utilities/utilities';

import { BrowserRouter } from 'react-router';
import AppRouter from './routing/AppRouter';
import { useNonce } from './providers/NonceProvider';
import EpayIntlProvider from './providers/EpayIntlProvider';
import EpayThemeProvider from './providers/EpayThemeProvider';
import EpayToastProvider from './providers/EpayToastProvider';
import EpayConfigProvider from './providers/EpayConfigProvider';
import EpayImpersonationProvider from './providers/EpayImpersonationProvider';
import { EpayQueryProvider } from './providers/EpayQueryProvider';
import { EpayLoadingProvider } from './providers/EpayLoadingProvider';
import { PayerDetailsProvider } from 'providers/PayerDetailsProvider';
import AuthSessionBootstrap from 'providers/AuthSessionBootstrap';
import { UiStateProvider } from 'providers/UiStateProvider';

import 'react-toastify/dist/ReactToastify.css';

import MaintenanceProvider from 'providers/MaintenanceProvider';
import { Box, useTheme } from '@mui/material';

function RouterFallback() {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
      }}
    />
  );
}

export default function App() {
  const nonce = useNonce();
  const theme = useAppSelector((state) => state.config.domainTheme);

  const cache = createCache({
    key: 'epay',
    nonce: nonce,
  });

  useEffect(() => {
    const applyNonce = (elements: HTMLCollectionOf<HTMLElement>) => {
      for (let i = 0; i < elements.length; i++) {
        if (elements[i].getAttribute('nonce') !== nonce) {
          elements[i].setAttribute('nonce', nonce);
        }
      }
    };
    applyNonce(document.getElementsByTagName('script'));
    applyNonce(document.getElementsByTagName('style'));
    applyNonce(document.getElementsByTagName('link'));
  }, [nonce]);

  useEffect(() => {
    const applyTheme = async () => {
      if (!theme.name) {
        return;
      }

      let template = theme.name.substring(theme.name.indexOf('_') + 1);
      if (!template) {
        template = 'default';
      }

      document.title = theme.brandTitle == undefined ? '' : theme.brandTitle;

      const filePath = `${template}/favicon.ico`;

      const favicon = document.querySelector(
        'link[rel="icon"]',
      ) as HTMLLinkElement;
      if (favicon) {
        favicon.href = filePath;
      } else {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = filePath;
        document.head.appendChild(link);
      }
    };
    applyTheme();
  }, [theme]);

  // Calculate basename from the document base URL.
  const basename = getAppBaseUrl();

  return (
    <AppErrorBoundary>
      <CacheProvider value={cache}>
        <BrowserRouter basename={basename}>
          <EpayIntlProvider>
            <EpayQueryProvider>
              <EpayLoadingProvider>
                <AuthSessionBootstrap />
                <MaintenanceProvider />
                <EpayThemeProvider>
                  <EpayConfigProvider>
                    <EpayToastProvider>
                      <UiStateProvider>
                        <EpayImpersonationProvider>
                          <PayerDetailsProvider>
                            <Waiter />
                            <Suspense fallback={<RouterFallback />}>
                              <AppRouter />
                            </Suspense>
                          </PayerDetailsProvider>
                        </EpayImpersonationProvider>
                      </UiStateProvider>
                    </EpayToastProvider>
                  </EpayConfigProvider>
                </EpayThemeProvider>
              </EpayLoadingProvider>
            </EpayQueryProvider>
          </EpayIntlProvider>
        </BrowserRouter>
      </CacheProvider>
    </AppErrorBoundary>
  );
}
