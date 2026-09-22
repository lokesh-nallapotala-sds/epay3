import { useState, useEffect } from 'react';

import EpayNavigator from 'contexts/EpayNavigator';
import { useAppDispatch, useAppSelector } from 'redux/hooks';
import {
  clearUserStore,
  logout,
  userHasAbility,
  selectUserState as userSelector,
} from 'redux/reducers';
import { clearSelectedAccountId } from 'utilities/accountPersistence';
import EpayCreditCardIcon from 'shared/icons/EpayCreditCardIcon';
import EpaySignOutIcon from 'shared/icons/EpaySignOutIcon';
import EpayUserEditIcon from 'shared/icons/EpayUserEditIcon';
import Ability from 'types/Ability';
import { HeaderMenuType } from './HeaderMenuType';
import { useEpayQuery } from 'providers/EpayQueryProvider';
import { useFormat } from 'hooks/useFormat';

export default function useHeaderMenuContent() {
  const dispatch = useAppDispatch();
  const api = useEpayQuery();
  const [isLoggedOut, setIsLoggedOut] = useState<boolean>(false);

  const f = useFormat();

  const user = useAppSelector(userSelector);
  const canManagePaymentMethods = userHasAbility(
    user,
    Ability.ManagePaymentMethods,
  );
  useEffect(() => {
    if (isLoggedOut) {
      //If the user has logged out but isLoggedIn is still set to true, redirect to login page
      window.location.href = '/';
    }
  }, [isLoggedOut]);

  if (!user) {
    return [];
  }

  const content: HeaderMenuType[] = [
    ...(canManagePaymentMethods
      ? [
          {
            label: f('header.paymentmethods'),
            action: () => {
              if (EpayNavigator.navigate)
                EpayNavigator.navigate('/settings/payment-methods');
            },
            icon: <EpayCreditCardIcon />,
          },
        ]
      : []),
    {
      label: f('settings.account.header'),
      action: () => {
        if (EpayNavigator.navigate) EpayNavigator.navigate('/settings/user');
      },
      icon: <EpayUserEditIcon />,
      id: 'menuBarItem_Settings',
    },
    {
      label: f('header.logout'),
      action: async () => {
        await api.logout().catch(() => undefined);
        sessionStorage.clear();
        clearSelectedAccountId();
        dispatch(clearUserStore());
        dispatch(logout());
        EpayNavigator.navigate?.('/');
        setIsLoggedOut(true);
      },
      icon: <EpaySignOutIcon />,
    },
  ];

  return content;
}
