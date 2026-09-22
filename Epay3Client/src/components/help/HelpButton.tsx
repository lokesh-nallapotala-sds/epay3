import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { ButtonBase, useTheme } from '@mui/material';
import { useFormat } from 'hooks/useFormat';

interface HelpButtonProps {
  open: boolean;
  onClick: () => void;
}

const BUTTON_WIDTH = 48; // width once fully revealed (open)
// At rest — must stay narrower than the ~30px gap to bottom-of-page controls
// like the paginator dropdown (per the feature spec).
const PEEK_WIDTH = 24;
// Matches the nav footer's language dropdown (32px — the theme's sizeSmall
// input height — sitting 36px from the viewport bottom) for visual symmetry
// across the bottom of the screen.
const BUTTON_HEIGHT = 32;
const BUTTON_BOTTOM = 36;
const ICON_SIZE = 24; // icon size once fully revealed (open)
const PEEK_ICON_SIZE = 18;

export default function HelpButton({ open, onClick }: HelpButtonProps) {
  const theme = useTheme();
  const f = useFormat();

  return (
    <ButtonBase
      onClick={onClick}
      aria-label={f(open ? 'help.close' : 'help.open')}
      sx={{
        position: 'fixed',
        // The "peek" is done by animating width at right: 0 — never by moving
        // the box past the viewport edge, which registers as page overflow in
        // some browsers and produces a stray scrollbar.
        right: 0,
        bottom: `${BUTTON_BOTTOM}px`,
        width: open ? BUTTON_WIDTH : PEEK_WIDTH,
        height: BUTTON_HEIGHT,
        transition: 'width 200ms ease-out, border-radius 200ms ease-out',
        zIndex: theme.zIndex.drawer - 1,
        // Left corners only at rest, so it reads as a tab attached to the edge.
        borderRadius: open ? '12px' : '12px 0 0 12px',
        backgroundColor: theme.palette.interactiveColor,
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        '&:hover': {
          backgroundColor: theme.palette.interactiveColor,
          filter: 'brightness(0.95)',
        },
      }}
    >
      <HelpOutlineIcon
        sx={{
          color: '#ffffff',
          fontSize: open ? ICON_SIZE : PEEK_ICON_SIZE,
          transition: 'font-size 200ms ease-out',
        }}
      />
    </ButtonBase>
  );
}
