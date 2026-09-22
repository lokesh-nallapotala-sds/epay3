import AppContainer from 'components/containers/AppContainer';
import PlainHeader from 'components/header/PlainHeader';
import LeftDrawer from 'components/navDrawer/LeftDrawer';
import useEpayIdleTimer from 'hooks/useEpayIdleTimer';
import { useNonce } from 'providers/NonceProvider';
import { ReactNode } from 'react';
import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useAppDispatch } from 'redux/hooks';
import {
  setMaxCreditAmountAllowed,
  setMaxECAmountAllowed,
} from 'redux/reducers';
import { EpayApplicationService } from 'services/EpayApplicationService';
import { ApplicationConfigRequest } from 'types/AppConfigRequest';

interface HomeStackProps {
  children?: ReactNode;
}

const HomeStack = ({ children }: HomeStackProps) => {
  const nonce = useNonce();
  const getAppConfig = EpayApplicationService.useGetApplicationConfig();
  const dispatch = useAppDispatch();
  useEpayIdleTimer();

  // Nonce application useEffect
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

  // App Config useEffect
  // getAppConfig is intentionally excluded from deps — it is not wrapped in useCallback
  // inside EpayApplicationService and creates a new reference on every render, which
  // would cause an infinite loop. This effect runs once on mount (same as EpayConfigProvider).
  useEffect(() => {
    getAppConfig()
      .then((resp: ApplicationConfigRequest) => {
        if (resp.maxPaymentAllowed) {
          dispatch(setMaxCreditAmountAllowed(resp.maxPaymentAllowed));
        }
        if (resp.maxECheckPaymentAllowed) {
          dispatch(setMaxECAmountAllowed(resp.maxECheckPaymentAllowed));
        }
      })
      .catch(() => {});
  }, [dispatch]);

  // This `HomeStack` will now always render with `PlainHeader` and `LeftDrawer`
  // for *public routes that require them*.
  // The truly barebones login pages will be handled by a separate layout
  // selected by the RootStackDecider.
  return (
    <AppContainer>
      <PlainHeader />
      {children || <Outlet />}
      <LeftDrawer />
    </AppContainer>
  );
};

export default HomeStack;
