import { HelpConfigRequest, HelpScreenConfig } from 'types/AppConfigRequest';
import { normalizeRoutePath } from 'utilities/helpScreenMatch';

export const HELP_CONFIG_FILE_NAME = 'help-config.json';

type UnknownRecord = Record<string, unknown>;

// Mirrors the backend's HelpTextConverter: accepts the current per-language object
// shape, or a bare string — the shape stored before per-language support existed —
// which is migrated into { en: value } so older export files stay importable.
const parseHelpText = (value: unknown): Record<string, string> => {
  if (typeof value === 'string') {
    return value ? { en: value } : {};
  }
  if (typeof value !== 'object' || value === null) {
    return {};
  }
  return Object.entries(value as UnknownRecord).reduce<Record<string, string>>(
    (acc, [lang, text]) => {
      if (typeof text === 'string') acc[lang] = text;
      return acc;
    },
    {},
  );
};

// Parses and validates an exported help-config file (used to promote BA-authored
// help content from DEV to higher environments). Throws on anything that doesn't
// match the expected shape; unknown properties (e.g. the `links` array from
// exports made before the Help Links section was removed) are simply ignored, so
// older files stay importable. Imported help text is NOT trusted here — it flows
// through the admin form and is sanitized server-side on Save like any
// hand-typed content.
export const parseHelpConfigFile = (raw: string): HelpConfigRequest => {
  const data: unknown = JSON.parse(raw);
  if (typeof data !== 'object' || data === null) {
    throw new Error('Help config must be a JSON object');
  }

  const { isHelpEnabled, screens } = data as UnknownRecord;
  if (!Array.isArray(screens)) {
    throw new Error('Help config must contain a screens array');
  }

  const seenPaths = new Set<string>();
  const parsedScreens: HelpScreenConfig[] = [];

  for (const item of screens) {
    const screen = item as UnknownRecord | null;
    const path = screen?.path;
    if (typeof path !== 'string' || !path.startsWith('/')) {
      throw new Error('Each screen must have a path starting with /');
    }
    // Path is the screen's identity — dedupe on the normalized route (case,
    // trailing slash) and keep the first occurrence.
    const normalizedPath = normalizeRoutePath(path);
    if (seenPaths.has(normalizedPath)) continue;
    seenPaths.add(normalizedPath);

    parsedScreens.push({
      name:
        typeof screen?.name === 'string' && screen.name.trim()
          ? screen.name
          : path,
      path,
      helpText: parseHelpText(screen?.helpText),
    });
  }

  return { isHelpEnabled: isHelpEnabled === true, screens: parsedScreens };
};
