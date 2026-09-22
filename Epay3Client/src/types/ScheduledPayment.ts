export interface ScheduledPayment {
  scheduleId: string;
  invoice: string;
  openAmount: number;
  amountToPay: number;
  dateToPay: string;
  paymentCardType: string;
  paymentCardToken: string;
  paymentMethod: string;
  currencyKey: string;
  cardLast4Digit?: string;
}
