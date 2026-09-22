import { ReactNode, useEffect, useMemo, useState } from 'react';

import { createTheme, palette, ThemeOptions } from '@mui/material';
import { Theme } from '@mui/material/styles';
import { GlobalStyles, ThemeProvider } from '@mui/system';
import { deepmerge } from '@mui/utils';
import { useNonce } from 'providers/NonceProvider';
import { useAppDispatch } from 'redux/hooks';
import { setDomainTheme } from 'redux/reducers';
import { EpayThemeConfigurationService } from 'services/EpayThemeConfigurationService';
import { ThemeConfig } from 'types/ThemeConfig';
import { MuiTheme } from '../shared/theme/MuiTheme.ts';

interface Props {
  children: ReactNode;
}

const DOMAIN_THEME_CACHE_KEY = 'epay.domainTheme';

export interface Banner {
  language: string;
  content: string;
  text1?: string;
  text2?: string;
}

declare module '@mui/material/styles' {
  interface Theme {
    banner?: Banner[];
    bannerColor?: string;
    brandIcon?: string;
    brandLogo?: string;
    appTitle?: string;
    applicationName?: string;
    calendarHoverColor?: string;
  }

  // Extend ThemeOptions for theme creation
  interface ThemeOptions {
    banner?: Banner[];
    bannerColor?: string;
    brandIcon?: string;
    brandLogo?: string;
    appTitle?: string;
    applicationName?: string;
    calendarHoverColor?: string;
  }
}

interface CustomPalette {
  primary: {
    main: string; //Button color and primary color
    contrastText: string; // button text color
    dark: string; //Hover for button background
    headerText: string;
  };
  background: {
    default: string; //Body background
  };
  spinner: {
    main: string;
  };
  buttonBorder: {
    buttonBorderColor: string;
    buttonBorderHoverColor: string;
  };
  highlight: {
    main: string; //Highlight background color (for hover states)
    contrastText: string;
  };
  menu: {
    main: string;
    hover: string;
    active: string;
  };
  interactiveColor: string;
}

const hasResolvedTheme = (theme: ThemeConfig | null): theme is ThemeConfig =>
  Boolean(theme?.name);

const readCachedDomainTheme = (): ThemeConfig | null => {
  try {
    const cachedTheme = sessionStorage.getItem(DOMAIN_THEME_CACHE_KEY);
    if (!cachedTheme) {
      return null;
    }

    const parsed = JSON.parse(cachedTheme) as ThemeConfig;
    return hasResolvedTheme(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const writeCachedDomainTheme = (theme: ThemeConfig | null) => {
  if (!hasResolvedTheme(theme)) {
    sessionStorage.removeItem(DOMAIN_THEME_CACHE_KEY);
    return;
  }

  sessionStorage.setItem(DOMAIN_THEME_CACHE_KEY, JSON.stringify(theme));
};

const createEpayMuiTheme = (themeData: ThemeConfig | null): Theme => {
  if (!hasResolvedTheme(themeData) || !import.meta.env.VITE_APP_APPLY_THEME) {
    return createTheme(MuiTheme);
  }

  const isButtonWhite =
    themeData?.buttonColor?.toLowerCase() === '#ffffff' ||
    themeData?.buttonColor?.toLowerCase() === '#fff';

  const actualButtonColor = themeData.buttonColor ?? MuiTheme.palette?.primary;

  const otherControlColor = isButtonWhite
    ? (themeData.buttonTextColor ?? MuiTheme.palette?.primary)
    : (themeData.buttonColor ?? MuiTheme.palette?.primary);

  const basePalette = MuiTheme.palette as typeof MuiTheme.palette & {
    highlight?: {
      main?: string;
      contrastText?: string;
    };
  };

  const paletteOptions: CustomPalette = {
    primary: {
      main: actualButtonColor,
      contrastText: themeData.buttonTextColor ?? MuiTheme.palette?.primary,
      dark: themeData.buttonHoverColor ?? MuiTheme.palette?.primary,
      headerText:
        themeData.contrastColor ?? MuiTheme.palette?.background?.paper,
    },
    background: {
      default: themeData.backgroundColor ?? MuiTheme.palette?.background,
    },
    spinner: {
      main: MuiTheme.palette?.spinner?.main ?? '#616161',
    },
    highlight: {
      main: basePalette.highlight?.main || '#EDF4FA',
      contrastText:
        themeData.highlightColor ||
        basePalette.highlight?.contrastText ||
        '#0D0D12',
    },
    buttonBorder: {
      buttonBorderColor: themeData.buttonBorderColor ?? '#ffffff',
      buttonBorderHoverColor: themeData.buttonBorderHoverColor ?? '#ffffff',
    },
    menu: {
      main: themeData.contrastColor ?? MuiTheme.palette?.background?.paper,
      hover: themeData.hoverColor ?? '#1a75bb',
      active: themeData.hoverColor ?? '#1a75bb',
    },
    interactiveColor: otherControlColor,
  };
  const theme: ThemeOptions = {
    applicationName: themeData.applicationName,
    calendarHoverColor: themeData.highlightColor,
    banner: themeData.banners,
    bannerColor: themeData.bannerColor,
    brandLogo: themeData.brandLogo,
    brandIcon: themeData.brandIcon,
    appTitle: themeData.brandTitle,
    palette: paletteOptions,
    components: {
      MuiBackdrop: {
        styleOverrides: {
          root: {
            '&:not(.MuiPopover-root .MuiBackdrop-root)': {
              // Applies to all backdrops EXCEPT Popover/Menu backdrops (like Select)
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          containedPrimary: {
            '@media (hover: hover) and (pointer: fine)': {
              '&:hover': {
                backgroundColor:
                  themeData.buttonHoverColor ??
                  (MuiTheme.palette?.primary as { dark?: string })?.dark,
                border: `1px solid ${themeData.buttonBorderHoverColor ?? '#ffffff'}`,
                color:
                  themeData.buttonHoverTextColor || MuiTheme.palette?.primary,
              },
            },
            '@media (hover: none)': {
              '&:hover': {
                backgroundColor: `${themeData.buttonColor ?? (MuiTheme.palette?.primary as { main?: string })?.main} !important`,
                border: `1px solid ${themeData.buttonBorderColor ?? '#ffffff'} !important`,
                color: `${themeData.buttonTextColor ?? (MuiTheme.palette?.primary as { contrastText?: string })?.contrastText} !important`,
              },
              '&:active': {
                backgroundColor: `${themeData.buttonHoverColor ?? (MuiTheme.palette?.primary as { dark?: string })?.dark} !important`,
                border: `1px solid ${themeData.buttonBorderHoverColor ?? '#ffffff'} !important`,
                color: `${themeData.buttonHoverTextColor ?? MuiTheme.palette?.primary} !important`,
              },
            },
            '&:active': {
              backgroundColor:
                themeData.buttonHoverColor ??
                (MuiTheme.palette?.primary as { dark?: string })?.dark,
              border: `1px solid ${themeData.buttonBorderHoverColor ?? '#ffffff'}`,
              color:
                themeData.buttonHoverTextColor || MuiTheme.palette?.primary,
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: otherControlColor,
            },
          },
        },
      },

      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor:
              themeData.headerBackgroundColor ??
              MuiTheme.palette?.background?.paper,

            color: themeData.contrastColor
              ? `${themeData.contrastColor} !important`
              : MuiTheme.palette?.background?.paper,
          },
        },
      },

      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor:
              themeData.primaryColor ?? MuiTheme.palette?.background?.paper,
          },
        },
      },
      MuiListItem: {
        styleOverrides: {
          root: {
            '&:hover': {
              color: themeData.hoverColor
                ? `${themeData.hoverColor} !important`
                : '#1a75bb',
              '& .MuiTypography-root': {
                color: themeData.hoverColor
                  ? `${themeData.hoverColor} !important`
                  : '#1a75bb',
              },
              '& .MuiListItemIcon-root': {
                color: themeData.hoverColor
                  ? `${themeData.hoverColor} !important`
                  : '#1a75bb',
              },
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            // Base styles for all IconButton components
            color: themeData.buttonColor
              ? `${otherControlColor} !important`
              : (MuiTheme.palette as palette)?.primary?.main,
            backgroundColor: 'transparent',
            '&:hover': {
              backgroundColor: 'transparent',
            },
            '&.Mui-disabled': {
              color: '#a0a0a0',
              backgroundColor: 'transparent',
            },
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            '&.Mui-selected': {
              backgroundColor: `${themeData.highlightColor} !important`,
            },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: ({ theme }) => ({
            color: MuiTheme.palette?.text?.primary,
            textTransform: 'none',
            '&.Mui-selected': {
              color: theme.palette.interactiveColor,
            },
          }),
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: ({ theme }) => ({
            backgroundColor: theme.palette.interactiveColor,
            height: '2px',
          }),
        },
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: ({ theme }) => ({
            color: '#ffffff',
            '&.Mui-checked': {
              color: theme.palette.interactiveColor,
              '& + .MuiSwitch-track': {
                backgroundColor: theme.palette.interactiveColor,
                opacity: 0.5,
              },
            },
          }),
          track: () => ({
            backgroundColor: '#000000',
            opacity: 0.38,
          }),
        },
      },
    },
  };

  return createTheme(deepmerge(MuiTheme, theme));
};

export default function EpayThemeProvider(props: Props) {
  const nonce = useNonce();
  const [cachedDomainTheme] = useState<ThemeConfig | null>(() =>
    readCachedDomainTheme(),
  );
  const [themeResolved, setThemeResolved] = useState(() =>
    hasResolvedTheme(cachedDomainTheme),
  );
  const getCurrentTheme = EpayThemeConfigurationService.useGetThemeForUrl();

  const dispatch = useAppDispatch();
  const [finalTheme, setFinalTheme] = useState<Theme>(() =>
    createEpayMuiTheme(cachedDomainTheme),
  );

  useEffect(() => {
    let mounted = true;

    if (hasResolvedTheme(cachedDomainTheme)) {
      dispatch(setDomainTheme(cachedDomainTheme));
    }

    const fetchTheme = async () => {
      const domain = window.location.hostname;
      let theme: ThemeConfig | null = null;
      try {
        theme = await getCurrentTheme(domain);
      } catch {
        if (!mounted) {
          return;
        }
        if (!hasResolvedTheme(cachedDomainTheme)) {
          setFinalTheme(createEpayMuiTheme(null));
        }
        setThemeResolved(true);
        return; // SAP unavailable - keep cached/default MUI theme, app continues rendering
      }

      if (!mounted) {
        return;
      }
      if (theme) {
        dispatch(setDomainTheme(theme));
        writeCachedDomainTheme(theme);
      }
      setFinalTheme(createEpayMuiTheme(theme));
      setThemeResolved(true);
    };

    fetchTheme();
    return () => {
      mounted = false;
    };
    // getCurrentTheme is intentionally excluded because the service hook returns
    // a new function reference each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cachedDomainTheme, dispatch]);

  const style = useMemo(
    () => ({
      ':root': {
        fontFamily: finalTheme.typography.fontFamily,
        fontSize: `${finalTheme.typography.fontSize}px`,
      },
      body: {
        margin: 0,
        fontSize: '1rem',
        backgroundColor: `${finalTheme.palette.background.default}`,
        color: `${finalTheme.palette.text.primary}`,
        display: 'flex',
        justifyContent: 'center',
        overflow: 'auto',
      },
      '#root': {
        width: '100%',
      },
    }),
    [finalTheme],
  );

  useEffect(() => {
    const applyNonce = (elements: HTMLCollectionOf<HTMLStyleElement>) => {
      for (let i = 0; i < elements.length; i++) {
        if (elements[i].getAttribute('nonce') !== nonce) {
          elements[i].setAttribute('nonce', nonce);
        }
      }
    };

    applyNonce(document.getElementsByTagName('style'));
  }, [nonce]);

  return (
    <ThemeProvider theme={finalTheme}>
      <GlobalStyles styles={style} />
      {themeResolved ? props.children : null}
    </ThemeProvider>
  );
}
