type AVSResult = 'success' | 'failure' | 'skip';

// AVS Code Category Mapping
export const AVS_CODE_CATEGORIES: Record<string, AVSResult> = {
  // Success Codes
  '00': 'success',
  '01': 'success',
  '02': 'success',
  '10': 'success',
  '11': 'success',
  '12': 'success',
  '13': 'success',
  '14': 'success',
  '30': 'success',

  // Failure Codes
  '20': 'failure',
  '32': 'failure',

  // Skip Codes
  '31': 'skip',
  '33': 'skip',
  '34': 'skip',
  '40': 'skip',
};

// AVS Error Messages
const AVS_ERROR_MESSAGES: Record<string, string> = {
  '00': '5-Digit zip and address match',
  '01': '9-Digit zip and address match',
  '02': 'Postal code and address match',
  '10': '5-Digit zip matches, address does not match',
  '11': '9-Digit zip matches, address does not match',
  '12': 'Zip does not match, address matches',
  '13': 'Postal code does not match, address matches',
  '14': 'Postal code matches, address not verified',
  '20': 'Neither zip nor address match',
  '30': 'AVS service not supported by issuer',
  '31': 'AVS system not available',
  '32': 'Address unavailable',
  '33': 'General error',
  '34': 'AVS not performed',
  '40': 'Address failed Litle & Co. edit checks',
};

// Card Type Mapping
export const CARD_TYPE_MAPPING = {
  VISA: 'VISA',
  MC: 'MC',
  AMEX: 'AMEX',
  DISC: 'DISC',
};

// Get AVS Message
export const getAVSMessage = (code: string): string =>
  AVS_ERROR_MESSAGES[code] || 'Unknown AVS code';
