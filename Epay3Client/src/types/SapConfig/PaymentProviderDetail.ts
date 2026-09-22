export default interface PaymentProviderDetail {
  provider: string;
  description: string;
  providerVersion?: string;
  merchantGuid: string;
  isSecure3dsEnabled: boolean;
  secure3dsVersion: string;
  initializationUrl?: string;
}
