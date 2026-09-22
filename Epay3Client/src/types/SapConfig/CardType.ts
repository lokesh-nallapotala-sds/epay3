export type CardType = 'AMEX' | 'VISA' | 'MC' | 'EC';

export function getCardTypeResourceId(id: CardType | string): string {
  switch (id) {
    case 'EC':
      return 'payment.type.echeck';
    case 'VISA':
      return 'payment.type.creditcard.visa';
    case 'MC':
      return 'payment.type.creditcard.mastercard';
    case 'AMEX':
      return 'payment.type.creditcard.amex';
    default:
      return '';
  }
}

export default CardType;
