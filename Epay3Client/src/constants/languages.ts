import type { Locale } from 'date-fns/locale';
import { de, enGB, enUS, es, fr, it, ja, pt, ptBR, ru } from 'date-fns/locale';

export const SUPPORTED_LANGUAGES = [
  'en',
  'fr',
  'es',
  'it',
  'de',
  'pt',
  'ru',
  'ja',
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  de: 'German',
  pt: 'Portuguese',
  ru: 'Russian',
  ja: 'Japanese',
};

export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}

export function getLanguageOptions() {
  return SUPPORTED_LANGUAGES.map((lang) => ({
    language: lang,
    title: LANGUAGE_NAMES[lang],
  }));
}

export const AUTOMATIC_REGIONAL_FORMAT = 'X';

export const REGIONAL_FORMATS = [
  { code: 'US', name: 'United States', locale: 'en-US' },
  { code: 'FR', name: 'France', locale: 'fr-FR' },
  { code: 'DE', name: 'Germany', locale: 'de-DE' },
  { code: 'IT', name: 'Italy', locale: 'it-IT' },
  { code: 'ES', name: 'Spain', locale: 'es-ES' },
  { code: 'PT', name: 'Portugal', locale: 'pt-PT' },
  { code: 'RU', name: 'Russia', locale: 'ru-RU' },
  { code: 'JP', name: 'Japan', locale: 'ja-JP' },
] as const;

export type RegionalFormatCode = (typeof REGIONAL_FORMATS)[number]['code'];

function getBrowserLocale(): string {
  return (
    navigator.languages?.[0] ||
    navigator.language ||
    Intl.DateTimeFormat().resolvedOptions().locale ||
    'en-US'
  );
}

function isAutomaticRegionalFormat(
  userRegionalFormat?: string | null,
): boolean {
  return (
    !userRegionalFormat ||
    userRegionalFormat === '' ||
    userRegionalFormat === AUTOMATIC_REGIONAL_FORMAT
  );
}

export function getActiveFormattingLocale(
  userRegionalFormat?: string | null,
): string {
  if (isAutomaticRegionalFormat(userRegionalFormat)) {
    return getBrowserLocale();
  }

  const format = REGIONAL_FORMATS.find((f) => f.code === userRegionalFormat);
  return format?.locale || getBrowserLocale();
}

function getLocaleFormatParts(locale: string): string[] {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
    .formatToParts(new Date(2026, 1, 19))
    .filter((part) => part.type !== 'literal')
    .map((part) => part.type);
}

export function getDatePickerFormat(regionalFormat?: string | null): string {
  const locale = getActiveFormattingLocale(regionalFormat);

  try {
    const order = getLocaleFormatParts(locale);
    const tokenMap: Record<string, string> = {
      day: 'DD',
      month: 'MM',
      year: 'YYYY',
    };
    const separator =
      new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
        .formatToParts(new Date(2026, 1, 19))
        .find((part) => part.type === 'literal')?.value || '/';

    return order.map((part) => tokenMap[part] || part).join(separator);
  } catch {
    const fallbackLocale = getActiveFormattingLocale(regionalFormat);
    const formatMap: Record<string, string> = {
      'en-US': 'MM/DD/YYYY',
      'de-DE': 'DD.MM.YYYY',
      'fr-FR': 'DD/MM/YYYY',
      'it-IT': 'DD/MM/YYYY',
      'es-ES': 'DD/MM/YYYY',
      'pt-PT': 'DD/MM/YYYY',
      'ru-RU': 'DD.MM.YYYY',
      'ja-JP': 'YYYY/MM/DD',
    };
    return formatMap[fallbackLocale] ?? 'MM/DD/YYYY';
  }
}

function toDateFnsLocale(locale: string): Locale {
  const normalizedLocale = locale.toLowerCase();

  if (normalizedLocale.startsWith('de')) {
    return de;
  }
  if (normalizedLocale.startsWith('fr')) {
    return fr;
  }
  if (normalizedLocale.startsWith('it')) {
    return it;
  }
  if (normalizedLocale.startsWith('es')) {
    return es;
  }
  if (normalizedLocale.startsWith('pt-br')) {
    return ptBR;
  }
  if (normalizedLocale.startsWith('pt')) {
    return pt;
  }
  if (normalizedLocale.startsWith('ru')) {
    return ru;
  }
  if (normalizedLocale.startsWith('ja')) {
    return ja;
  }
  if (normalizedLocale === 'en-us') {
    return enUS;
  }
  if (normalizedLocale.startsWith('en')) {
    return enGB;
  }

  return enUS;
}

export function getDateRangePickerLocale(
  regionalFormat?: string | null,
): Locale {
  const locale = getActiveFormattingLocale(regionalFormat);
  return toDateFnsLocale(locale);
}

export function getRegionalFormatPreview(locale: string): {
  number: string;
  date: string;
} {
  const sampleDate = new Date(2026, 1, 19);
  const sampleNumber = 1234.56;

  return {
    number: new Intl.NumberFormat(locale).format(sampleNumber),
    date: sampleDate.toLocaleDateString(locale),
  };
}
