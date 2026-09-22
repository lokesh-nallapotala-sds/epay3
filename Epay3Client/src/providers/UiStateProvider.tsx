import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { NavIdentifierType } from 'types/NavIdentifier';
import {
  MOBILE_BREAKPOINT,
  DESKTOP_BREAKPOINT,
} from 'shared/theme/breakpoints';

export type ViewportMode = 'mobile' | 'tablet' | 'desktop';

const getViewportMode = (width: number): ViewportMode => {
  if (width <= MOBILE_BREAKPOINT) {
    return 'mobile';
  }
  if (width < DESKTOP_BREAKPOINT) {
    return 'tablet';
  }
  return 'desktop';
};

interface UiState {
  drawerOpen: boolean;
  navSelection: NavIdentifierType | undefined;
  viewportMode: ViewportMode;
  useMobile: boolean;
  useOverlayDrawer: boolean;
  isDesktop: boolean;
  minimizeDrawer: boolean;
  setDrawerOpen: (open: boolean) => void;
  setNavSelection: (nav: NavIdentifierType | undefined) => void;
  setUseMobile: (mobile: boolean) => void;
  setViewportMode: (mode: ViewportMode) => void;
  setMinimizeDrawer: (minimize: boolean) => void;
}

const UiStateContext = createContext<UiState | undefined>(undefined);

export function UiStateProvider({ children }: { children: ReactNode }) {
  const initialViewportMode =
    typeof window === 'undefined'
      ? 'desktop'
      : getViewportMode(window.innerWidth);
  const [drawerOpen, setDrawerOpen] = useState(
    initialViewportMode === 'desktop',
  );
  const [navSelection, setNavSelection] = useState<
    NavIdentifierType | undefined
  >(undefined);
  const [viewportMode, setViewportMode] =
    useState<ViewportMode>(initialViewportMode);
  const [minimizeDrawer, setMinimizeDrawer] = useState(
    initialViewportMode !== 'desktop',
  );
  const previousViewportModeRef = useRef<ViewportMode>(initialViewportMode);

  const useMobile = viewportMode === 'mobile';
  const useOverlayDrawer = viewportMode !== 'desktop';
  const isDesktop = viewportMode === 'desktop';

  const setUseMobile = (mobile: boolean) => {
    setViewportMode(mobile ? 'mobile' : 'desktop');
  };

  useEffect(() => {
    const handleResize = () => {
      const nextViewportMode = getViewportMode(window.innerWidth);
      const previousViewportMode = previousViewportModeRef.current;

      setViewportMode(nextViewportMode);

      if (previousViewportMode !== nextViewportMode) {
        setDrawerOpen(nextViewportMode === 'desktop');
        setMinimizeDrawer(nextViewportMode !== 'desktop');
        previousViewportModeRef.current = nextViewportMode;
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <UiStateContext.Provider
      value={{
        drawerOpen,
        navSelection,
        viewportMode,
        useMobile,
        useOverlayDrawer,
        isDesktop,
        minimizeDrawer,
        setDrawerOpen,
        setNavSelection,
        setUseMobile,
        setViewportMode,
        setMinimizeDrawer,
      }}
    >
      {children}
    </UiStateContext.Provider>
  );
}

export function useUiState(): UiState {
  const ctx = useContext(UiStateContext);
  if (!ctx) throw new Error('useUiState must be used within UiStateProvider');
  return ctx;
}
