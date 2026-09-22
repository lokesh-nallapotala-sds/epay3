import './process-polyfill';
import '@fontsource-variable/inter';

import { Provider } from 'react-redux';
import EpayStore from 'redux/EpayStore';
import { GlobalStyles } from '@mui/material';
import { createRoot } from 'react-dom/client';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import App from './App';
import { NonceProvider } from 'providers/NonceProvider';

interface CSPWindow extends Window {
  __CSP_NONCE__?: string;
}

const nonce =
  (window as CSPWindow).__CSP_NONCE__ ||
  document.querySelector('meta[name="csp-nonce"]')?.getAttribute('content') ||
  '';

const emotionCache = createCache({
  key: 'epay',
  nonce: nonce,
});

const rootElement = document.getElementById('root')!;
const root = createRoot(rootElement);

//CSP is blocking the inline styles in the xiplugin
//Adding a style to hide the iframe when it's found.
const hideCardinalIframes = () => {
  const iframes = document.querySelectorAll(
    'iframe#cardinal_iframe_post',
  ) as NodeListOf<HTMLIFrameElement>;

  iframes.forEach((iframe) => {
    if (iframe.parentElement) {
      const computedStyle = window.getComputedStyle(iframe);
      if (computedStyle.display === 'none') return;

      iframe.removeAttribute('style');
      iframe.classList.add('csp-hidden-cardinal-iframe');
      iframe.setAttribute('data-hidden', 'true');
    }
  });
};

if (document.querySelector('iframe#cardinal_iframe_post')) {
  hideCardinalIframes();
}

const observer = new MutationObserver(() => {
  hideCardinalIframes();
});

observer.observe(document.body, { childList: true, subtree: true });

root.render(
  <CacheProvider value={emotionCache}>
    <Provider store={EpayStore}>
      <NonceProvider>
        <GlobalStyles
          styles={{
            '#cardinal_iframe_post, .csp-hidden-cardinal-iframe': {
              display: 'none !important',
              visibility: 'hidden !important',
              position: 'absolute !important',
              width: '0px !important',
              height: '0px !important',
              overflow: 'hidden !important',
            },
          }}
        />
        <App />
      </NonceProvider>
    </Provider>
  </CacheProvider>,
);

window.addEventListener('beforeunload', () => {
  observer.disconnect();
});
