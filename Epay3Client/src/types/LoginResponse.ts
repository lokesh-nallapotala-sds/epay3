import { LoggedInUser } from './LoggedInUser';

export interface LoginResponse {
  role: string;
  status?: string;
  isLoggedIn?: boolean;
  user?: LoggedInUser;
}
