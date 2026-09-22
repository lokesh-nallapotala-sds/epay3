import { User } from './User';

export interface UserAddChangeRequest extends User {
  password: string;
}
