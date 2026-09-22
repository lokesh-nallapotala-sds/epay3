import { createContext, useContext, useEffect, ReactNode } from 'react';

interface NonceContextType {
  nonce: string;
}

const NonceContext = createContext<NonceContextType | undefined>(undefined);

const getNonce = (): string =>
  document.querySelector('meta[name="csp-nonce"]')?.getAttribute('content') ||
  '';

export const NonceProvider = ({ children }: { children: ReactNode }) => {
  const nonce = getNonce();

  useEffect(() => {
    if (nonce) {
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
    }
  }, [nonce]);

  return (
    <NonceContext.Provider value={{ nonce }}>{children}</NonceContext.Provider>
  );
};

export const useNonce = (): string => {
  const context = useContext(NonceContext);
  if (!context) {
    throw new Error('useNonce must be used within a NonceProvider');
  }
  return context.nonce;
};
