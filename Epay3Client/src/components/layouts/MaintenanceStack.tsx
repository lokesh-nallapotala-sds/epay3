import AppContainer from 'components/containers/AppContainer';
import useEpayIdleTimer from 'hooks/useEpayIdleTimer';
import { useNonce } from 'providers/NonceProvider';
import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useUiState } from 'providers/UiStateProvider';

interface MaintenanceStackProps {
  children?: React.ReactNode;
}

const MaintenanceStack = ({ children }: MaintenanceStackProps) => {
  const nonce = useNonce();
  useEpayIdleTimer();

  useEffect(() => {
    const applyNonce = (elements: HTMLCollectionOf<HTMLElement>) => {
      for (let i = 0; i < elements.length; i++) {
        if (elements[i].getAttribute('nonce') !== nonce) {
          elements[i].setAttribute('nonce', nonce);
        }
      }
    };
    applyNonce(document.getElementsByTagName('script'));
    applyNonce(document.getElementsByTagName('style'));
    applyNonce(document.getElementsByTagName('link'));
  }, [nonce]);

  const { setDrawerOpen, setViewportMode } = useUiState();
  useEffect(() => {
    setDrawerOpen(false);
    setViewportMode('desktop');
  }, [setDrawerOpen, setViewportMode]);

  return <AppContainer>{children || <Outlet />}</AppContainer>;
};

export default MaintenanceStack;
