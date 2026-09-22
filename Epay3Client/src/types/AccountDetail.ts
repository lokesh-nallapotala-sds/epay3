import { Address } from './Address';
import { AccountResponse } from './AccountResponse';

export interface AccountDetail {
  addressData?: Address | null;
  salesData?: Array<{
    data?: {
      salesOrganization?: string;
      distributionChannel?: string;
      division?: string;
      companyCode?: string;
      termsOfPayment?: string;
      currencyKey?: string;
    } | null;
    partner?: Array<{
      partnerFunction?: string;
      partnerNumber?: string;
      defaultPartner?: string;
      addressData?: Address | null;
    }>;
  }>;
  soldToList?: AccountResponse[];
}
