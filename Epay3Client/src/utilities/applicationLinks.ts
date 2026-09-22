import {
  ApplicationConfigRequest,
  ApplicationLinkItem,
} from 'types/AppConfigRequest';
import { urlRegex } from 'components/settings/configuration/application/urlRegex';

const LEGACY_APPLICATION_LINKS = [
  {
    field: 'privacyPolicy',
    label: 'Privacy Policy',
  },
  {
    field: 'termsAndConditions',
    label: 'Terms and Conditions',
  },
  {
    field: 'contactUs',
    label: 'Contact Us',
  },
] as const satisfies readonly {
  field: 'privacyPolicy' | 'termsAndConditions' | 'contactUs';
  label: string;
}[];

const createFallbackLinkId = (index: number) => `application-link-${index + 1}`;

export const normalizeApplicationLinkUrl = (
  link: string | null | undefined,
): string => {
  const trimmedLink = link?.trim() ?? '';

  if (!trimmedLink) {
    return '';
  }

  if (trimmedLink.startsWith('http://') || trimmedLink.startsWith('https://')) {
    return trimmedLink;
  }

  return `https://${trimmedLink}`;
};

export const createApplicationLinkItem = (
  label: string,
  url: string,
): ApplicationLinkItem => ({
  id:
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `application-link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  label: label.trim(),
  url: normalizeApplicationLinkUrl(url),
});

export const normalizeApplicationLinks = (
  links?: readonly Partial<ApplicationLinkItem>[] | null,
): ApplicationLinkItem[] => {
  return (links ?? [])
    .map((link, index) => ({
      id: (link.id || '').trim() || createFallbackLinkId(index),
      label: (link.label || '').trim(),
      url: normalizeApplicationLinkUrl(link.url),
    }))
    .filter((link) => link.label || link.url);
};

export const migrateLegacyApplicationLinks = (
  config: ApplicationConfigRequest | null | undefined,
): ApplicationLinkItem[] => {
  if (!config) {
    return [];
  }

  return LEGACY_APPLICATION_LINKS.flatMap((link, index) => {
    const url = normalizeApplicationLinkUrl(config[link.field]);

    if (!url) {
      return [];
    }

    return [
      {
        id: createFallbackLinkId(index),
        label: link.label,
        url,
      },
    ];
  });
};

export const getApplicationLinksFromConfig = (
  config: ApplicationConfigRequest | null | undefined,
): ApplicationLinkItem[] => {
  if (!config) {
    return [];
  }

  if (
    config.applicationLinks !== undefined &&
    config.applicationLinks !== null
  ) {
    return normalizeApplicationLinks(config.applicationLinks);
  }

  return migrateLegacyApplicationLinks(config);
};

export const getFormattedApplicationLink = (
  link: string | null | undefined,
): string | undefined => {
  const normalizedLink = normalizeApplicationLinkUrl(link);

  if (!normalizedLink || !urlRegex.test(normalizedLink)) {
    return;
  }

  return normalizedLink;
};

export const buildConfiguredApplicationLinks = (
  config: ApplicationConfigRequest | null | undefined,
): { id: string; href: string; target: string; label: string }[] => {
  return getApplicationLinksFromConfig(config)
    .map((link) => {
      const href = getFormattedApplicationLink(link.url);

      if (!href) {
        return null;
      }

      return {
        id: link.id,
        href,
        target: '_blank',
        label: link.label,
      };
    })
    .filter(
      (
        item,
      ): item is { id: string; href: string; target: string; label: string } =>
        Boolean(item),
    );
};
