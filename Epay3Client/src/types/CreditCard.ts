export interface CreditCard {
  cardNumber: string;
  cardName: string;
  cardType: string;
  cardValidationCode: string;
  cardYear: string;
  cardMonth: string;
  makeDefault?: boolean;
  saveOnFile?: boolean;
  token?: string;
  paymentCardType?: string;
  sapCardType?: string;
  gatewayCardType?: string;
  electronicCheckAccountType?: string;
  electronicCheckRdfiNumber?: string;
  isDefault?: boolean;
  default?: string;
  cardLast4Digit?: string;
}
