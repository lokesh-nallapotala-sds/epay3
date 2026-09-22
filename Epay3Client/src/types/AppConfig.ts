import { InvoiceTable } from './Invoice';
import { SapConfig } from './SapConfig/SapConfig';

export interface AppConfig {
  defaults: Record<string, unknown>;
  invoiceTable: InvoiceTable;
  languages: Record<string, unknown>;
  sap: SapConfig;
  style: {
    headerLogo: string;
    loginLogo: string;
    loginUseBackgroundImage: string;
  };
}
