export interface LoggedInUser {
  userId: string;
  login: string;
  email: string;
  primaryAccountType: string;
  accounts: string[];
  role: string;
  abilities: string[];
  isImpersonating: boolean;
  regionalFormat?: string;
}
