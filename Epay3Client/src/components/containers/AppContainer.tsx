import { ReactNode, useEffect, useState } from 'react';

import { Box } from '@mui/system';
import { useTheme } from '@mui/material/styles';
import { useUiState } from 'providers/UiStateProvider';

interface AppContainerProps {
  children: ReactNode;
}

export default function AppContainer(props: AppContainerProps) {
  const { drawerOpen, useOverlayDrawer } = useUiState();
  const theme = useTheme();
  const [headerHeight, setHeaderHeight] = useState(70);

  const DrawerTransitions = theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.shortest,
  });

  useEffect(() => {
    const header = document.getElementById('header');

    if (!header) {
      setHeaderHeight(70);
      return undefined;
    }

    const syncHeaderHeight = () => {
      const height = header.offsetHeight || 70;
      setHeaderHeight(height);
      document.documentElement.style.setProperty(
        '--app-header-height',
        `${height}px`,
      );
    };

    syncHeaderHeight();

    const resizeObserver = new ResizeObserver(syncHeaderHeight);
    resizeObserver.observe(header);
    window.addEventListener('resize', syncHeaderHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', syncHeaderHeight);
    };
  }, []);

  return (
    <Box
      id="appContainer"
      display="grid"
      sx={{
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        justifyItems: 'center',
        marginTop: `${headerHeight}px`,
        marginLeft: `${drawerOpen && !useOverlayDrawer ? 240 : 0}px`,
        transition: DrawerTransitions,
        paddingLeft: '14px',
        paddingRight: '15px',
      }}
    >
      {props.children}
    </Box>
  );
}
