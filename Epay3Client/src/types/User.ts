export interface LinkedAccount {
  primaryAccount: string;
  name: string;
}

export interface User {
  userId: string;
  login: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  primaryAccountType: string;
  status: string;
  role: string;
  regionalFormat?: string;
  linkedAccounts?: LinkedAccount[];
  emailError?: { code: string; message?: string };
}

/** Shape returned by GET /api/user and GET /api/user/GetById (server-side view projection). */
export interface UserView {
  userId?: string;
  login?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  primaryAccountType?: string;
  status?: string;
  role?: string;
  regionalFormat?: string;
  linkedAccounts: LinkedAccount[];
}
