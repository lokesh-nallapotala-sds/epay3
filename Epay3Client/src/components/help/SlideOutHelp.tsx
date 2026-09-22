import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { useGetHelpConfigQuery } from 'redux/api/ePayApi';
import { useEpayLocale } from 'providers/EpayIntlProvider';
import { resolveHelpScreen } from 'utilities/helpScreenMatch';
import HelpButton from './HelpButton';
import HelpPanel from './HelpPanel';

// Tiptap's empty state serializes to "<p></p>" (or "<p>&nbsp;</p>" after certain
// edits), not "" — a plain .trim() check would treat a screen the admin added but
// never actually typed help text into as non-blank.
const isHelpTextBlank = (html?: string) =>
  !html ||
  !html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;| /g, '')
    .trim();

// Falls back to English when a screen hasn't been translated into the user's current
// app language yet, rather than hiding the help button entirely.
const resolveHelpText = (
  helpText: Record<string, string> | undefined,
  language: string,
) => helpText?.[language] || helpText?.en || '';

export default function SlideOutHelp() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { data } = useGetHelpConfigQuery();
  const { language } = useEpayLocale();

  // Close when the user navigates — otherwise a panel opened on screen A shows
  // up already open (with different content) on screen B.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const screen = data
    ? resolveHelpScreen(location.pathname, data.screens)
    : undefined;
  const helpText = resolveHelpText(screen?.helpText, language);

  if (!data?.isHelpEnabled || !screen || isHelpTextBlank(helpText)) {
    return null;
  }

  return (
    <>
      <HelpButton open={open} onClick={() => setOpen((prev) => !prev)} />
      <HelpPanel
        open={open}
        onClose={() => setOpen(false)}
        helpText={helpText}
      />
    </>
  );
}
