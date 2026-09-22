import { useEffect } from 'react';

import { useIntl } from 'react-intl';
import { useIdleTimer } from 'react-idle-timer';

import { clearUserStore, logout } from 'redux/reducers';
import { useAppDispatch } from 'redux/hooks';
import { clearSelectedAccountId } from 'utilities/accountPersistence';
import { useEpayToast } from 'providers/EpayToastProvider';
import { useEpayQuery } from 'providers/EpayQueryProvider';

export default function useEpayIdleTimer() {
  const dispatch = useAppDispatch();
  const api = useEpayQuery();
  const toast = useEpayToast();
  const intl = useIntl();
  const f = (id: string) => intl.formatMessage({ id: id });

  const { getRemainingTime } = useIdleTimer({
    timeout: 600000,
    throttle: 500,
  });

  const message = f('login.timeout');

  useEffect(() => {
    const interval = setInterval(() => {
      if (getRemainingTime() <= 0) {
        toast.showToastMessage('info', message, true);
        api.logout().catch(() => undefined);
        sessionStorage.clear();
        clearSelectedAccountId();
        dispatch(clearUserStore());
        dispatch(logout());
        window.location.href = '/';
      }
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [api, dispatch, getRemainingTime, message, toast]);
}
