import MenuIcon from '@mui/icons-material/Menu';
import { AppBar, IconButton, Toolbar } from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { useUiState } from 'providers/UiStateProvider';
import { useFormat } from 'hooks/useFormat';

export default function PlainHeader() {
  const f = useFormat();

  const { drawerOpen, useOverlayDrawer, setDrawerOpen, setMinimizeDrawer } =
    useUiState();

  const muiTheme = useMuiTheme();

  const shouldShiftLayout = drawerOpen && !useOverlayDrawer;
  const DrawerTransitions = muiTheme.transitions.create(['margin', 'width'], {
    easing: muiTheme.transitions.easing.sharp,
    duration: muiTheme.transitions.duration.shortest,
  });
  const MarginLeftTransitions = `${shouldShiftLayout ? 240 : 0}px`;
  const WidthTransitions = shouldShiftLayout ? `calc(100% - ${240}px)` : '100%';

  return (
    <>
      <AppBar
        elevation={0}
        position="fixed"
        sx={{
          marginLeft: MarginLeftTransitions,
          width: WidthTransitions,
          transition: DrawerTransitions,
        }}
        id="header"
      >
        <Toolbar
          sx={{
            paddingLeft: '12px !important',
            paddingRight: '12px !important',
            minHeight: 'auto !important',
          }}
        >
          {(useOverlayDrawer || !drawerOpen) && (
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label={f('aria.menu')}
              sx={{
                marginLeft: '-10px',
                color: (theme) =>
                  `${theme.palette.primary.headerText} !important`,
              }}
              onClick={() => {
                setDrawerOpen(true);
                setMinimizeDrawer(false);
              }}
            >
              <MenuIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>
    </>
  );
}
