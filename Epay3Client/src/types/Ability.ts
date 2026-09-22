export default class Ability {
  public static readonly ManagePaymentMethods = 'CanManagePaymentMethods';
  public static readonly EditSystemConfig = 'CanEditSystemConfig';
  public static readonly ViewUsers = 'CanViewUsers';
  public static readonly ManageUsers = 'CanManageUsers';
  public static readonly Impersonate = 'CanImpersonate';
  public static readonly ManageRegistrationRequests =
    'CanManageRegistrationRequests';
  public static readonly MakePayment = 'CanMakePayment';
  public static readonly ManageOwnSAPAccounts = 'CanManageOwnSAPAccounts';
  public static readonly ManageLinkedSAPAccounts = 'ManageLinkedSAPAccounts';
  public static readonly IsAdmin = 'IsAdmin';
}
