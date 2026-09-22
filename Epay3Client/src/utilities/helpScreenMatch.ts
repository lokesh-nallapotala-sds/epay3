import { HelpScreenConfig } from 'types/AppConfigRequest';

// Routes are admin-typed free text — normalize so "/Home" or "/home/" still
// matches the router's "/home" instead of silently never showing help.
export const normalizeRoutePath = (path: string): string => {
  const normalized = path.trim().toLowerCase().replace(/\/+$/, '');
  return normalized || '/';
};

// Longest-path-first so e.g. /settings/users/add resolves to the /settings/users
// entry rather than a shorter, unrelated prefix also present in the admin's list.
export const resolveHelpScreen = (
  pathname: string,
  screens: HelpScreenConfig[],
): HelpScreenConfig | undefined => {
  const target = normalizeRoutePath(pathname);
  const bySpecificity = [...screens].sort(
    (a, b) =>
      normalizeRoutePath(b.path).length - normalizeRoutePath(a.path).length,
  );

  return bySpecificity.find((s) => {
    const candidate = normalizeRoutePath(s.path);
    return target === candidate || target.startsWith(`${candidate}/`);
  });
};
