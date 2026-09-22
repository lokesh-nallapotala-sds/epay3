import { Address } from './Address';
import { AccountResponse } from './AccountResponse';
import { PayerDetails } from './Payment';

export interface Account {
  accountId: string | null;
  userId: string;
  accountTypeId: string;
  primaryAcct: string;
  companyCode: string;
  division: string;
  salesOrganization: string;
  distributionChannel: string;
  address?: Address;
  allowDeposits?: boolean;
  allowPayments?: boolean;
  relatedAccounts?: AccountResponse[];
  availablePayers?: AccountResponse[];
  defaultPayer?: AccountResponse | null;
  resolvedPayerDetails?: PayerDetails | null;
}

export interface SAPAccount {
  account: string;
  name: string;
}

export interface UserAccountsResponse {
  accounts: Account[];
}
