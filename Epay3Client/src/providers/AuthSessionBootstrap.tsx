import { useEffect } from 'react';
import { useLocation } from 'react-router';

import { useAppDispatch, useAppSelector } from 'redux/hooks';
import { loginFailed, loginSuccess } from 'redux/reducers';
import { useEpayQuery } from './EpayQueryProvider';
import { isProtectedSessionPath } from 'utilities/maintenance';

export default function AuthSessionBootstrap() {
  const api = useEpayQuery();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const sessionLoaded = useAppSelector((state) => state.user.sessionLoaded);

  useEffect(() => {
    if (sessionLoaded) {
      return;
    }

    if (!isProtectedSessionPath(location.pathname)) {
      dispatch(loginFailed());
      return;
    }

    let cancelled = false;

    api
      .getSession()
      .then(async (response) => {
        if (cancelled) {
          return;
        }

        if (!response.ok) {
          dispatch(loginFailed());
          return;
        }

        const session = await response.json();
        dispatch(
          loginSuccess({
            user: session.user,
          }),
        );
      })
      .catch(() => {
        if (!cancelled) {
          dispatch(loginFailed());
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api, dispatch, location.pathname, sessionLoaded]);

  return null;
}
