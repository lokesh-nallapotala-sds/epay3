import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { IntlProvider } from 'react-intl';
import { isSupportedLanguage } from 'constants/languages';
import { loadLocaleMessages } from 'services/loadLocaleMessages';

interface LocaleContextType {
  language: string;
  country: string;
  setUserPreferredLocale: (language: string) => void;
}

const EpayIntlContext = createContext<LocaleContextType | undefined>(undefined);

export default function EpayIntlProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [language, setLanguage] = useState('en');
  const country = 'us';
  const [messages, setMessages] = useState<Record<string, string>>({});

  const setUserPreferredLocale = useCallback((lang: string) => {
    localStorage.setItem('language', lang);
    loadLocaleMessages(lang)
      .then((msgs) => {
        setLanguage(lang);
        setMessages(msgs);
      })
      .catch(() => undefined);
  }, []);

  // on mount, pick up saved locale or navigator.language
  useEffect(() => {
    const savedLang = localStorage.getItem('language');
    const browserLang = navigator.language.split('-')[0];

    // Validate that the language is supported, otherwise fallback to 'en'
    // This handles unsupported locales (e.g., nl, pl, sv) gracefully
    const detectedLang = isSupportedLanguage(browserLang) ? browserLang : 'en';
    const initial = savedLang || detectedLang;

    setUserPreferredLocale(initial);
  }, [setUserPreferredLocale]);

  return (
    <EpayIntlContext.Provider
      value={{ language, country, setUserPreferredLocale }}
    >
      {Object.keys(messages).length > 0 && (
        <IntlProvider locale={language} messages={messages}>
          {children}
        </IntlProvider>
      )}
    </EpayIntlContext.Provider>
  );
}

export function useEpayLocale() {
  const ctx = useContext(EpayIntlContext);
  if (!ctx) {
    throw new Error('Intl context can only be used within IntlProvider');
  }
  return ctx;
}
