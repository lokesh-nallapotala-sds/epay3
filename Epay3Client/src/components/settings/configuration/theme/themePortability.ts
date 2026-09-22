import { Banner, ThemeConfig } from 'types/ThemeConfig';

export const THEME_EXPORT_FORMAT_VERSION = 1;

// A theme export is two <=50 KB images plus text — anything bigger than this
// is not one of our files.
export const THEME_IMPORT_MAX_FILE_BYTES = 512 * 1024;

// Matches the ThemeLogo/ThemeIcon upload widgets, which the import path bypasses.
const MAX_ASSET_BYTES = 51200;
const MAX_TEXT_LENGTH = 200;
const MAX_BANNER_CONTENT_LENGTH = 20000;

// `name` and `urls` deliberately never travel in an export file: URLs are
// environment-specific (an imported hostname could capture live traffic via
// URL matching), and an import always targets an existing template that keeps
// its own identity. The source name rides along as envelope metadata only.
export type ThemeExportValues = Omit<ThemeConfig, 'name' | 'urls'>;

export interface ThemeExportFile {
  formatVersion: number;
  exportedAtUtc: string;
  sourceHost: string;
  sourceTheme: string;
  values: ThemeExportValues;
}

export interface ParsedThemeImport {
  sourceTheme: string;
  sourceHost: string;
  exportedAtUtc: string;
  values: Partial<ThemeExportValues>;
}

export const THEME_COLOR_FIELDS = [
  'bannerColor',
  'backgroundColor',
  'headerBackgroundColor',
  'primaryColor',
  'contrastColor',
  'hoverColor',
  'buttonColor',
  'buttonTextColor',
  'buttonHoverColor',
  'buttonHoverTextColor',
  'buttonBorderColor',
  'buttonBorderHoverColor',
  'highlightColor',
] as const;

export const THEME_TEXT_FIELDS = ['brandTitle', 'applicationName'] as const;

const PNG_PREFIX = 'data:image/png;base64,';
// The save path only persists icons carrying the x-icon mime label, but some
// browsers read .ico files as vnd.microsoft.icon — accept both, normalize to
// the one that saves.
const ICON_PREFIX = 'data:image/x-icon;base64,';
const ICON_ALT_PREFIX = 'data:image/vnd.microsoft.icon;base64,';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const ICO_SIGNATURE = [0x00, 0x00, 0x01, 0x00];

export function themeExportFileName(templateLabel: string): string {
  const label = templateLabel.trim().toLowerCase() || 'theme';
  return `chronarpay-theme-${label}.json`;
}

export function serializeThemeExport(theme: ThemeConfig): string {
  const { name, urls: _urls, ...values } = theme;
  const file: ThemeExportFile = {
    formatVersion: THEME_EXPORT_FORMAT_VERSION,
    exportedAtUtc: new Date().toISOString(),
    sourceHost: window.location.hostname,
    sourceTheme: name,
    values,
  };
  return JSON.stringify(file, null, 2);
}

// The CSP allows blob: but not data: in img-src, so previews of not-yet-saved
// images must go through an object URL rather than the data URI itself.
export function dataUriToObjectUrl(dataUri: string): string | null {
  const commaIndex = dataUri.indexOf(',');
  const semicolonIndex = dataUri.indexOf(';');
  if (!dataUri.startsWith('data:') || commaIndex < 0 || semicolonIndex < 0) {
    return null;
  }
  try {
    const binary = atob(dataUri.substring(commaIndex + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const mime = dataUri.substring(5, semicolonIndex);
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  } catch {
    return null;
  }
}

const isValidHex = (value: string) => /^#[0-9A-Fa-f]{6}$/.test(value);

function decodedBase64Bytes(dataUri: string): number {
  const base64 = dataUri.substring(dataUri.indexOf(',') + 1);
  // Padding chars carry no data — without this a 51,200-byte asset (the exact
  // upload limit) counts as 51,201 and its own export fails to re-import.
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

// The data-URI mime label is just a claim — check the decoded bytes actually
// start with the format's magic number.
function hasSignature(dataUri: string, signature: number[]): boolean {
  const base64 = dataUri.substring(dataUri.indexOf(',') + 1);
  let head: string;
  try {
    // 16 base64 chars decode to 12 bytes — enough for the longest signature.
    head = atob(base64.slice(0, 16));
  } catch {
    return false;
  }
  return (
    head.length >= signature.length &&
    signature.every((byte, index) => head.charCodeAt(index) === byte)
  );
}

// Banner content is HTML rendered on the login page; an import file may have
// been hand-edited, so strip active content the way the editor never emits it.
function sanitizeBannerHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc
    .querySelectorAll('script, style, iframe, object, embed, link, meta, form')
    .forEach((el) => el.remove());
  doc.body.querySelectorAll('*').forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (
        name.startsWith('on') ||
        ((name === 'href' || name === 'src' || name === 'xlink:href') &&
          value.startsWith('javascript:'))
      ) {
        el.removeAttribute(attr.name);
      }
    }
  });
  return doc.body.innerHTML;
}

function readText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > MAX_TEXT_LENGTH) {
    throw new Error('text field too long');
  }
  return trimmed;
}

function readColor(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const trimmed = value.trim();
  if (!isValidHex(trimmed)) {
    throw new Error('invalid color value');
  }
  return trimmed;
}

function readAsset(
  value: unknown,
  prefixes: string[],
  normalizedPrefix: string,
  signature: number[],
): string | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  const prefix = prefixes.find((p) => value.startsWith(p));
  if (!prefix) {
    throw new Error('unsupported image format');
  }
  if (decodedBase64Bytes(value) > MAX_ASSET_BYTES) {
    throw new Error('image too large');
  }
  if (!hasSignature(value, signature)) {
    throw new Error('image content does not match its declared type');
  }
  return normalizedPrefix + value.substring(prefix.length);
}

function readBanners(value: unknown): Banner[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    throw new Error('banners must be a list');
  }
  const banners: Banner[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) {
      throw new Error('invalid banner entry');
    }
    const raw = item as Record<string, unknown>;
    if (
      typeof raw.language !== 'string' ||
      !/^[a-zA-Z]{2}$/.test(raw.language)
    ) {
      throw new Error('invalid banner language');
    }
    const content = typeof raw.content === 'string' ? raw.content : '';
    if (content.length > MAX_BANNER_CONTENT_LENGTH) {
      throw new Error('banner content too long');
    }
    // Empty text never travels (same rule as readText/readColor) — otherwise
    // an imported '' would overwrite the target's saved value on Save, which
    // only skips nulls.
    const text1 = typeof raw.text1 === 'string' ? raw.text1.trim() : '';
    const text2 = typeof raw.text2 === 'string' ? raw.text2.trim() : '';
    banners.push({
      language: raw.language.toLowerCase(),
      content: content ? sanitizeBannerHtml(content) : '',
      text1: text1 || undefined,
      text2: text2 || undefined,
    });
  }
  return banners.length > 0 ? banners : undefined;
}

// Throws on anything malformed; unknown fields are dropped, empty fields are
// omitted (the save path skips empties anyway, so an empty field can never
// clear a saved value — the import UI says so).
export function parseThemeImportFile(raw: string): ParsedThemeImport {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('not a theme export file');
  }
  const file = parsed as Record<string, unknown>;
  if (file.formatVersion !== THEME_EXPORT_FORMAT_VERSION) {
    throw new Error('unsupported format version');
  }
  if (typeof file.values !== 'object' || file.values === null) {
    throw new Error('missing values');
  }
  const rawValues = file.values as Record<string, unknown>;
  const values: Partial<ThemeExportValues> = {};

  THEME_COLOR_FIELDS.forEach((field) => {
    const color = readColor(rawValues[field]);
    if (color) values[field] = color;
  });
  THEME_TEXT_FIELDS.forEach((field) => {
    const text = readText(rawValues[field]);
    if (text) values[field] = text;
  });

  const brandLogo = readAsset(
    rawValues.brandLogo,
    [PNG_PREFIX],
    PNG_PREFIX,
    PNG_SIGNATURE,
  );
  if (brandLogo) values.brandLogo = brandLogo;
  const brandIcon = readAsset(
    rawValues.brandIcon,
    [ICON_PREFIX, ICON_ALT_PREFIX],
    ICON_PREFIX,
    ICO_SIGNATURE,
  );
  if (brandIcon) values.brandIcon = brandIcon;

  const banners = readBanners(rawValues.banners);
  if (banners) values.banners = banners;

  return {
    sourceTheme: typeof file.sourceTheme === 'string' ? file.sourceTheme : '',
    sourceHost: typeof file.sourceHost === 'string' ? file.sourceHost : '',
    exportedAtUtc:
      typeof file.exportedAtUtc === 'string' ? file.exportedAtUtc : '',
    values,
  };
}
