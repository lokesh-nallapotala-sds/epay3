import DOMPurify from 'dompurify';
import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Drawer,
  IconButton,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { useUiState } from 'providers/UiStateProvider';
import { useFormat } from 'hooks/useFormat';

interface HelpPanelProps {
  open: boolean;
  onClose: () => void;
  helpText: string;
}

const PANEL_WIDTH = 420;

// Second sanitization layer at render time — mirrors the server-side allow-list
// (ApplicationConfigurationManager.HelpTextSanitizer), which remains the gate.
const sanitizeHelpText = (html: string) =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1',
      'h2',
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      'ul',
      'ol',
      'li',
      'a',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });

export default function HelpPanel({ open, onClose, helpText }: HelpPanelProps) {
  const theme = useTheme();
  const f = useFormat();
  const { useMobile } = useUiState();

  return (
    <Drawer
      anchor="right"
      variant="temporary"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: useMobile ? '100%' : PANEL_WIDTH,
          boxSizing: 'border-box',
          // Opts out of the global Drawer override that paints papers with the
          // nav-menu color — dark tenant themes would render this dark-on-dark.
          backgroundColor: theme.palette.background.paper,
          // The global MuiPaper defaults add a 1px border on every side (its
          // top edge pushed the header divider 1px below the app header's).
          // Keep the left corners at the global Paper radius; the right edge
          // sits flush against the viewport.
          border: 'none',
          borderRadius: '10px 0 0 10px',
          // 3px, not 2 — the rounded corners antialias the border path, which
          // renders a 2px line visibly softer/thinner than it was square-edged.
          borderLeft: `3px solid ${theme.palette.interactiveColor}`,
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.25)',
        },
      }}
    >
      <Stack sx={{ height: '100%' }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            // App-header height, so the divider aligns with the header bar.
            // border-box keeps the divider inside that height, exactly like
            // the app header's own measured bottom border.
            height: 'var(--app-header-height, 70px)',
            boxSizing: 'border-box',
            flexShrink: 0,
            paddingX: '1.5rem',
            borderBottom: `1px solid ${theme.mixins.border.color}`,
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {theme.applicationName
              ? `${theme.applicationName} ${f('help.title')}`
              : f('help.title')}
          </Typography>
          <IconButton
            onClick={onClose}
            aria-label={f('help.close')}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </Stack>

        <Box sx={{ overflowY: 'auto', padding: '1.5rem' }}>
          <Typography
            component="div"
            sx={{
              // Reset the theme's semi-bold gray body defaults (MuiTheme.ts);
              // 14px matches the app's table-row text, single-spaced.
              fontWeight: 400,
              color: theme.palette.text.primary,
              fontSize: '14px',
              lineHeight: 1.35,
              '& strong, & b': { fontWeight: 700 },
              // em-scaled off the 14px body: h1 ~17.5px, h2 ~15.75px — section
              // headings within help content, not page titles.
              '& h1, & h2': { fontWeight: 600, margin: '0.75em 0 0.35em' },
              '& h1': { fontSize: '1.25em' },
              '& h2': { fontSize: '1.125em' },
              '& > h1:first-child, & > h2:first-child': { marginTop: 0 },
              '& p': { margin: '0 0 0.5em' },
              // Tiptap serializes an authored blank line as an empty <p></p>
              // (its editor view renders those with a trailing <br>, so they're
              // visible while authoring) — give them one line of height here
              // too, or the gap collapses to just the paragraph margin.
              '& p:empty': { minHeight: '1.35em' },
              '& p:last-child': { marginBottom: 0 },
              '& ul, & ol': { margin: '0 0 0.5em', paddingLeft: '1.5em' },
              '& li': { marginBottom: '0.15em' },
              '& a': { color: theme.palette.interactiveColor },
            }}
            dangerouslySetInnerHTML={{ __html: sanitizeHelpText(helpText) }}
          />
        </Box>
      </Stack>
    </Drawer>
  );
}
