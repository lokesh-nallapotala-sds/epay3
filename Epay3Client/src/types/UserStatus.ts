export default class UserStatus {
  public static readonly Active = 'active';
  public static readonly DeActive = 'deactive';
  public static readonly Locked = 'locked';
  public static readonly WaitingConfirmation = 'waiting-confirmation';
  public static readonly AwaitingConfirmation = 'awaiting confirmation';
  public static readonly AwaitingConfirmation2 = 'awaiting-confirmation';

  public static readonly Inactive = UserStatus.DeActive;
  public static readonly Pending = UserStatus.WaitingConfirmation;

  public static readonly All = 'all';
  public static readonly Select = 'select';

  public static getResourceId(status: string): string {
    switch (status) {
      case UserStatus.Active:
        return 'user.status.active';
      case UserStatus.DeActive:
      case UserStatus.Inactive:
        return 'user.status.deactive';
      case UserStatus.Locked:
        return 'user.status.locked';
      case UserStatus.WaitingConfirmation:
      case UserStatus.Pending:
      case UserStatus.AwaitingConfirmation:
      case UserStatus.AwaitingConfirmation2:
        return 'user.status.waiting_confirmation';
      case UserStatus.All:
        return 'user.status.all';
      case UserStatus.Select:
        return 'user.status.select';
      default:
        return '';
    }
  }
}
