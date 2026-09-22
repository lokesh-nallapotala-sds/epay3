//TODO: needs to be cleaned up
// + not all of these are used in EPay 3, at least not as top-level nav bar / menu items
// + some menu items that *are* in Epay 3 are not included here
export const NavIdentifier = {
  Home: 'menuBarItem_Home',
  History: 'menuBarItem_History',
  Deposits: 'menuBarItem_Deposits',
  Payments: 'menuBarItem_Payments',
  PaymentMethods: 'menuBarItem_Payment_Methods',
  ScheduledPayments: 'menuBarItem_Scheduled_Payments',
  Settings: 'menuBarItem_Settings',
  SignOut: 'menuBarItem_SignOut',
  UserManagement: 'menuBarItem_User_Management',
  Config: 'menuBarItem_Config',
  //System: 'menuBarItem_Config_System',
  //Email: 'menuBarItem_Configuration_Email',
} as const;

export type NavIdentifierType =
  (typeof NavIdentifier)[keyof typeof NavIdentifier];

export function getResourceIdForNavIdentifier(
  s: NavIdentifierType | string,
): string {
  switch (s) {
    case NavIdentifier.Home:
      return 'header.home';
    case NavIdentifier.History:
      return 'header.history';
    case NavIdentifier.Deposits:
      return 'header.deposits';
    case NavIdentifier.Payments:
      return 'header.payments';
    case NavIdentifier.PaymentMethods:
      return 'header.paymentmethods';
    case NavIdentifier.ScheduledPayments:
      return 'header.scheduledpayments';
    case NavIdentifier.Settings:
      return 'header.settings';
    case NavIdentifier.SignOut:
      return 'header.logout';
    case NavIdentifier.UserManagement:
      return 'header.usermanagement';
    case NavIdentifier.Config:
      return 'header.configuration';
    default:
      return '';
  }
}
