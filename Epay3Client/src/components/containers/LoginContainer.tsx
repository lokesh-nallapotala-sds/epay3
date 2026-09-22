import { ReactNode, useEffect, useState } from 'react';

import { Box, useMediaQuery, useTheme } from '@mui/material';

interface LoginContainerProps {
  children: ReactNode;
}

export default function LoginContainer({ children }: LoginContainerProps) {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <Box
      display="flex"
      flexDirection="column"
      width="100vw"
      justifyContent="center"
      alignItems="center"
      sx={{
        height: isSmallScreen ? `${windowHeight}px` : '100vh',
        width: '100%',
        backgroundColor: theme.palette.background.paper,
      }}
    >
      {children}
    </Box>
  );
}
