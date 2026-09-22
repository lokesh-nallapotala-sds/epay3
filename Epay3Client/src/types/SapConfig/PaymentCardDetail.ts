import CardType from './CardType';
export default interface PaymentCardDetail {
  paymentCardType: CardType;
  sapCardType?: string;
  gatewayCardType?: string;
  provider: string;
  externalPaymentCardType?: string;
  usesPreauthorization?: boolean;
  preauthorizationAmount?: number;
}
