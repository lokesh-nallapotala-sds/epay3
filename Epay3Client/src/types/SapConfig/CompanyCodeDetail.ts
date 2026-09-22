export default interface CompanyCodeDetail {
  companyCode: string;
  currencyKey: string;
  description?: string;
  isActive: boolean;
  is3dsDisabled: boolean;
  isPaymentDisabled: boolean;
  isDepositEnabled: boolean;
  isEcheckEnabled: boolean;
}
