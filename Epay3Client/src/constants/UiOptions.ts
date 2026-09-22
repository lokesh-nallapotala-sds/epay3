import { PaymentMethod, PaymentMethodAction } from '../types/Payment';

type USStatesType = {
  name: string;
  code: string;
};

export const ADDRESS_VALIDATION_ZIP = 'zip';
export const ADDRESS_VALIDATION_OFF = 'off';
export const URL_PARAM_ACCESS_TOKEN = 'id';
export const DEFAULT_CURRENCY = 'USD';
export const CONTEXT_KEY = 'context';
export const PAYMENT_METHOD_UPDATE_ACTION = PaymentMethodAction.Update;

export const usStates: USStatesType[] = [
  { name: 'Select State', code: 'select' },
  { name: 'Alabama', code: 'AL' },
  { name: 'Alaska', code: 'AK' },
  { name: 'Arizona', code: 'AZ' },
  { name: 'Arkansas', code: 'AR' },
  { name: 'California', code: 'CA' },
  { name: 'Colorado', code: 'CO' },
  { name: 'Connecticut', code: 'CT' },
  { name: 'Delaware', code: 'DE' },
  { name: 'Florida', code: 'FL' },
  { name: 'Georgia', code: 'GA' },
  { name: 'Hawaii', code: 'HI' },
  { name: 'Idaho', code: 'ID' },
  { name: 'Illinois', code: 'IL' },
  { name: 'Indiana', code: 'IN' },
  { name: 'Iowa', code: 'IA' },
  { name: 'Kansas', code: 'KS' },
  { name: 'Kentucky', code: 'KY' },
  { name: 'Louisiana', code: 'LA' },
  { name: 'Maine', code: 'ME' },
  { name: 'Maryland', code: 'MD' },
  { name: 'Massachusetts', code: 'MA' },
  { name: 'Michigan', code: 'MI' },
  { name: 'Minnesota', code: 'MN' },
  { name: 'Mississippi', code: 'MS' },
  { name: 'Missouri', code: 'MO' },
  { name: 'Montana', code: 'MT' },
  { name: 'Nebraska', code: 'NE' },
  { name: 'Nevada', code: 'NV' },
  { name: 'New Hampshire', code: 'NH' },
  { name: 'New Jersey', code: 'NJ' },
  { name: 'New Mexico', code: 'NM' },
  { name: 'New York', code: 'NY' },
  { name: 'North Carolina', code: 'NC' },
  { name: 'North Dakota', code: 'ND' },
  { name: 'Ohio', code: 'OH' },
  { name: 'Oklahoma', code: 'OK' },
  { name: 'Oregon', code: 'OR' },
  { name: 'Pennsylvania', code: 'PA' },
  { name: 'Rhode Island', code: 'RI' },
  { name: 'South Carolina', code: 'SC' },
  { name: 'South Dakota', code: 'SD' },
  { name: 'Tennessee', code: 'TN' },
  { name: 'Texas', code: 'TX' },
  { name: 'Utah', code: 'UT' },
  { name: 'Vermont', code: 'VT' },
  { name: 'Virginia', code: 'VA' },
  { name: 'Washington', code: 'WA' },
  { name: 'West Virginia', code: 'WV' },
  { name: 'Wisconsin', code: 'WI' },
  { name: 'Wyoming', code: 'WY' },
];

export const currencies: Record<string, string> = {
  German: 'Euro',
  English: 'USD',
  Spanish: 'Euro',
  French: 'Euro',
  Italian: 'Euro',
  Japanese: 'JPY',
  Portuguese: 'Euro',
  Russian: 'RUB',
};

export const PaymentTypes: Record<string, string> = {
  CC: 'CC',
  EC: 'EC',
  DUMMY: 'dummy',
};

export const AVSResultCategories: Record<string, string> = {
  SUCCESS: 'success',
  X: 'x', // for DEV environment override
  FAILURE: 'failure',
  SKIP: 'skip',
};

export const DefaultPaymentMethod: PaymentMethod = {
  name: ' ', // Consider localizing this at runtime using `f(...)`
  key: PaymentTypes.DUMMY,
  dropDownDisplayName: 'Pay with',
  cardType: '',
  token: '-----',
  default: false,
};

// For example if you support these card types
export const CARD_TYPE_UI_MAPPING: Record<string, string> = {
  VISA: 'VISA',
  MC: 'MC',
  AMEX: 'AMEX',
  EC: 'EC',
};

// Regex & CVV rules
export const CVV_RULES = {
  DEFAULT: { pattern: /^\d{3}$/, length: 3 },
  AMEX: { pattern: /^\d{4}$/, length: 4 },
};
