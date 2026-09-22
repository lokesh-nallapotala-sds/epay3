// represents the primary account type, which it appears is really the account primary (expected) activity type.
// there is also an "account type" of Master | Transactional | Both, which for now is not used in epay 3
// -- but if we do end up using it we might need to rename this class
export default class AccountType {
  public static readonly Payer = 'Payer';
  public static readonly SoldTo = 'SoldTo';

  public static readonly All = 'all';
  public static readonly Select = 'select';

  public static getResourceId(acctType: string): string {
    switch (acctType) {
      case AccountType.Payer:
        return 'user.accounttype.payer';
      case AccountType.SoldTo:
        return 'user.accounttype.soldto';

      case AccountType.All:
        return 'user.accounttype.all';
      case AccountType.Select:
        return 'user.accounttype.select';

      default:
        return '';
    }
  }
}
