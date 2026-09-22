import { ValidateInvoiceAccount } from './Invoice';
import { User } from './User';

export interface AutoRegisterRequest {
  user: User;
  accounts: ValidateInvoiceAccount[];
}
