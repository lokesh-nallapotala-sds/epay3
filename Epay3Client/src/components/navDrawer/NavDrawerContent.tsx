import { useMemo } from 'react';

import Ability from 'types/Ability';
import { useAppSelector } from 'redux/hooks';
import EpayNavigator from 'contexts/EpayNavigator';
import { useEffectiveAccount } from 'hooks/usePaymentHelpers';
import EpayHomeIcon from 'shared/icons/EpayHomeIcon';
import EpayHistoryIcon from 'shared/icons/EpayHistoryIcon';
import EpayCalendarIcon from 'shared/icons/EpayCalendarIcon';
import EpayDepositsIcon from 'shared/icons/EpayDepositsIcon';
import EpaySettingsIcon from 'shared/icons/EpaySettingsIcon';
import EpayUserManagementIcon from 'shared/icons/EpayUserManagementIcon';
import UserRole from 'types/UserRole';
import {
  getResourceIdForNavIdentifier,
  NavIdentifier,
} from 'types/NavIdentifier';
import {
  selectApplicationConfig,
  selectCompanyCodes,
  selectIsSchedulePaymentsEnabled,
} from 'redux/selectors/configSelectors';
import {
  userHasAbility,
  selectUserState as userSelector,
} from 'redux/reducers';
import { buildConfiguredApplicationLinks } from 'utilities/applicationLinks';

import { NavDrawerItemType } from './NavDrawerItemType';
import { useFormat } from 'hooks/useFormat';

const NavDrawerContent = () => {
  const f = useFormat();

  const { goTo } = EpayNavigator;
  const selectedAccount = useEffectiveAccount();
  const isAuthenticated = Boolean(selectedAccount);

  const user = useAppSelector(userSelector);

  //TODO: is it the actual or the impersonated user we're concerned with here?
  //TODO: we should be checking abilities (claims) rather than roles
  //-- but unfortunately the `User` object doesn't currently include these
  const canMakePayments = userHasAbility(user, Ability.MakePayment);

  const appConfig = useAppSelector(selectApplicationConfig);
  const isSchedulePaymentsEnabled = useAppSelector(
    selectIsSchedulePaymentsEnabled,
  );
  const companyCodes = useAppSelector(selectCompanyCodes);

  const companyCodeDetail = useMemo(() => {
    return companyCodes?.find(
      (code) => code.companyCode === selectedAccount?.companyCode,
    );
  }, [companyCodes, selectedAccount?.companyCode]);

  const handleNavigation = (path: string) => {
    goTo(path);
  };

  const links = buildConfiguredApplicationLinks(appConfig);

  //TODO: currently the Deposits view throws an error for Internal users
  // (more precisely, any user who doesn't have have Make Payment privilege).
  // it'd be better to have the view accessible but functionally disabled
  // -- then we wouldn't have to mess with hiding the nav link here.
  const routes: NavDrawerItemType[] = isAuthenticated
    ? [
        {
          label: f('header.mainMenu'),
          children: [
            {
              label: f(getResourceIdForNavIdentifier(NavIdentifier.Home)),
              icon: (
                <EpayHomeIcon sx={{ color: 'inherit', fontSize: '1.5rem' }} />
              ),
              id: 'menuBarItem_Home',
              action: () => handleNavigation('/home'),
              path: '/home',
            },
            {
              label: f(getResourceIdForNavIdentifier(NavIdentifier.History)),
              icon: (
                <EpayHistoryIcon
                  sx={{ color: 'inherit', fontSize: '1.5rem' }}
                />
              ),
              id: 'menuBarItem_History',
              action: () => handleNavigation('/history'),
              path: '/history',
            },
            ...(canMakePayments && isSchedulePaymentsEnabled
              ? [
                  {
                    label: f(
                      getResourceIdForNavIdentifier(
                        NavIdentifier.ScheduledPayments,
                      ),
                    ),
                    icon: (
                      <EpayCalendarIcon
                        sx={{ color: 'inherit', fontSize: '1.5rem' }}
                      />
                    ),
                    id: NavIdentifier.ScheduledPayments,
                    action: () => handleNavigation('/scheduleddetails'),
                    path: '/scheduleddetails',
                  },
                ]
              : []),
            ...(canMakePayments && companyCodeDetail?.isDepositEnabled
              ? [
                  {
                    label: f(
                      getResourceIdForNavIdentifier(NavIdentifier.Deposits),
                    ),
                    icon: (
                      <EpayDepositsIcon
                        sx={{ color: 'inherit', fontSize: '1.5rem' }}
                      />
                    ),
                    id: NavIdentifier.Deposits,
                    action: () => handleNavigation('/payment/deposits'),
                    path: '/payment/deposits',
                  },
                ]
              : []),
          ],
        },
      ]
    : [];

  // set up the admin menu items, as appropriate
  const adminRoutes: NavDrawerItemType[] = [];

  const userManagementNavItem: NavDrawerItemType = {
    label: f(getResourceIdForNavIdentifier(NavIdentifier.UserManagement)),
    icon: (
      <EpayUserManagementIcon sx={{ color: 'inherit', fontSize: '1.5rem' }} />
    ),
    id: 'menuBarItem_User_Management',
    action: () => handleNavigation('/settings/users'),
    path: '/settings/users',
  };
  const configurationNavItem: NavDrawerItemType = {
    label: f(getResourceIdForNavIdentifier(NavIdentifier.Config)),
    icon: <EpaySettingsIcon sx={{ color: 'inherit', fontSize: '1.5rem' }} />,
    id: 'menuBarItem_Config',
    action: () => handleNavigation('/configuration'),
    path: '/configuration',
  };

  //TODO: we should be checking abilities (claims) rather than roles
  //-- but the `User` object doesn't currently include these
  if (
    isAuthenticated &&
    user &&
    UserRole.hasRole(
      user.role,
      UserRole.Admin,
      UserRole.Manager,
      UserRole.Internal,
    )
  ) {
    const childRoutes: NavDrawerItemType[] = [];

    childRoutes.push(userManagementNavItem);
    if (UserRole.isAdmin(user.role)) {
      childRoutes.push(configurationNavItem);
    }

    adminRoutes.push({
      label: f('user.role.admin'),
      children: childRoutes,
    });
  }

  const content: NavDrawerItemType[] = [...routes, ...adminRoutes];

  return { content, links, appConfig };
};

export default NavDrawerContent;
