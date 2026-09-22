export interface Payed {
  companyCode: string;
  documentNumberFinance: string;
  fiscalYearOfTheRelevantInvoice: string;
  authorizationNumber: string;
  authorizationReferenceCode: string;
  authorizationAmount: string;
  currencyKey: string;
}

export interface PayedList {
  payed: Payed[];
}

export interface SapHttpStatus {
  messageType?: string;
  messageIdentification?: string;
  messageNumber?: number;
  messageLineString?: string;
  line?: string;
}

export interface CardOperationStatus {
  message_type?: string;
  message_identification?: string;
  message_number?: string | number;
  message_line_string?: string;
}

export interface CardPreAuthResponse {
  action?: string;
  rccvv?: string;
  rcavr?: string;
  message_line_string?: string;
}

// Response shape returned by Paymetric card management operations (add/update/delete/autopay)
export interface CardOperationResponse extends CardOperationStatus {
  status?: CardOperationStatus;
  pre_auth?: CardPreAuthResponse;
}

export interface PaymentReceiptResponse {
  payed?: Payed[];
  documents?: Payed[];
  error?: SapHttpStatus;
  emailError?: { code: string };
}
