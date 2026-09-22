export default interface SapCustomer {
  currencyDecimals: CurrencyDecimalDetail[];
}

export interface CurrencyDecimalDetail {
  currencyKey: string;
  decimalPlaces: number;
}
