import { Suspense, useEffect, ReactNode } from 'react';
import AppContainer from 'components/containers/AppContainer';
import Header from 'components/header/Header';
import NavDrawer from 'components/navDrawer/NavDrawer';
import SlideOutHelp from 'components/help/SlideOutHelp';
import useEpayIdleTimer from 'hooks/useEpayIdleTimer';
import { Outlet } from 'react-router';
import { useUiState } from 'providers/UiStateProvider';
import Waiter from 'components/waiter/Waiter';
import { safeJsonParse } from 'utilities/utilities';

interface AppStackProps {
  children?: ReactNode;
}

const AppStack = ({ children }: AppStackProps) => {
  const { viewportMode, setDrawerOpen } = useUiState();

  useEpayIdleTimer();

  useEffect(() => {
    setDrawerOpen(viewportMode === 'desktop');

    // Redirect Interceptor for Hosted Payments
    // Catch cases where the payment provider might redirect to the root instead of the stored path
    const searchParams = new URLSearchParams(window.location.search);
    const hasPaymentParams =
      searchParams.get('id') || searchParams.get('status');

    if (hasPaymentParams) {
      const savedSession = sessionStorage.getItem('hosted-payment-session');
      const session = safeJsonParse<{ returnUrl?: string } | null>(
        savedSession,
        null,
      );

      if (session?.returnUrl) {
        const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
        const returnPath = new URL(session.returnUrl).pathname.replace(
          /\/$/,
          '',
        );

        if (currentPath !== returnPath) {
          window.location.href = session.returnUrl + window.location.search;
        }
      }
    }
  }, [setDrawerOpen, viewportMode]);

  return (
    <AppContainer>
      <Header />
      <Suspense fallback={<Waiter />}>{children || <Outlet />}</Suspense>
      <NavDrawer />
      <SlideOutHelp />
    </AppContainer>
  );
};

export default AppStack;
