export interface ITransactionHeader {
  MerchantID: string;
  Amount: string;
  CurrencyKey: string;
  CardDataSource: string;
  CardHolderAddress1?: string;
  CardHolderCity?: string;
  CardHolderName: string;
  CardHolderState?: string;
  CardHolderZip: string;
  CardType: string;
  CardNumber: string;
  CardExpirationDate: string;
  PacketOperation: number;
  CardCVV2?: string;
}
