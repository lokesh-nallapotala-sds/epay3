type RoleOrUser =
  | string
  | { role?: string; roles?: string[] | string }
  | null
  | undefined;

function extractRoles(input: RoleOrUser): string[] {
  if (!input) return [];
  if (typeof input === 'string') {
    const trimmed = input.trim().toLowerCase();
    return trimmed ? [trimmed] : [];
  }
  const results: string[] = [];
  if (typeof input.role === 'string' && input.role.trim()) {
    results.push(input.role.trim().toLowerCase());
  }
  if (Array.isArray(input.roles)) {
    for (const r of input.roles) {
      if (typeof r === 'string' && r.trim()) {
        results.push(r.trim().toLowerCase());
      }
    }
  } else if (typeof input.roles === 'string' && input.roles.trim()) {
    results.push(input.roles.trim().toLowerCase());
  }
  return results;
}

export default class UserRole {
  public static readonly Admin = 'admin';
  public static readonly Manager = 'manager';
  public static readonly Internal = 'internal';
  public static readonly User = 'user';

  public static readonly All = 'all';
  public static readonly Select = 'select';

  /**
   * Normalizes a role value to trimmed lowercase.
   */
  public static normalize(role?: string | null): string {
    return (role || '').trim().toLowerCase();
  }

  /**
   * Checks whether two role values are equal, ignoring case.
   */
  public static isEqual(roleA?: string | null, roleB?: string | null): boolean {
    return UserRole.normalize(roleA) === UserRole.normalize(roleB);
  }

  /**
   * Checks whether the given user or role has any of the target roles (case-insensitive).
   */
  public static hasRole(
    target: RoleOrUser,
    ...roles: (string | null | undefined)[]
  ): boolean {
    const userRoles = extractRoles(target);
    if (userRoles.length === 0) return false;
    const targets = roles
      .filter((r): r is string => typeof r === 'string' && !!r.trim())
      .map((r) => r.trim().toLowerCase());
    return userRoles.some((userRole) => targets.includes(userRole));
  }

  /**
   * Checks if the given user or role is 'admin' (case-insensitive).
   */
  public static isAdmin(roleOrUser?: RoleOrUser): boolean {
    return UserRole.hasRole(roleOrUser, UserRole.Admin);
  }

  /**
   * Checks if the given user or role is 'manager' (case-insensitive).
   */
  public static isManager(roleOrUser?: RoleOrUser): boolean {
    return UserRole.hasRole(roleOrUser, UserRole.Manager);
  }

  /**
   * Checks if the given user or role is 'internal' (case-insensitive).
   */
  public static isInternal(roleOrUser?: RoleOrUser): boolean {
    return UserRole.hasRole(roleOrUser, UserRole.Internal);
  }

  /**
   * Checks if the given user or role is 'user' (case-insensitive).
   */
  public static isUser(roleOrUser?: RoleOrUser): boolean {
    return UserRole.hasRole(roleOrUser, UserRole.User);
  }

  public static getResourceId(status?: string | null): string {
    switch (UserRole.normalize(status)) {
      case UserRole.Admin:
        return 'user.role.admin';
      case UserRole.Manager:
        return 'user.role.manager';
      case UserRole.Internal:
        return 'user.role.internal';
      case UserRole.User:
        return 'user.role.user';
      case UserRole.All:
        return 'user.role.all';
      case UserRole.Select:
        return 'user.role.select';
      default:
        return '';
    }
  }
}
