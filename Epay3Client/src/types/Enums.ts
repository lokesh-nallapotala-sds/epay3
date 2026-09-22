export type PaymentMode = {
  mode: 'deposit' | 'invoice';
};

export enum ReasonCode {
  Damaged = 'D',
  Partial = 'P',
}
