import { strToU8, zipSync } from 'fflate';
import { saveAs } from 'file-saver';

import { CreditCard } from 'types/CreditCard';
import { Invoice, PaymentHistoryRow } from 'types/InvoicesSearchRequest';
import { CurrencySymbols } from 'constants/CurrencySymbols';
import PaymentCardDetail from 'types/SapConfig/PaymentCardDetail';
import { Account } from 'types/Account';
import { AccountResponse } from 'types/AccountResponse';
import AccountType from 'types/AccountType';
import { getActiveFormattingLocale } from 'constants/languages';
import { PaymentCard, PaymentMethod } from 'types/Payment';

export const getAppBaseUrl = (): string => {
  const base =
    document.querySelector('base')?.getAttribute('href') ||
    import.meta.env.BASE_URL ||
    '';
  return base.replace(/\/$/, '');
};

export type JsonParseResult<T> =
  | { success: true; value: T }
  | { success: false; error: Error };

export const tryParseJson = <T>(
  raw: string | null | undefined,
): JsonParseResult<T> => {
  if (!raw) {
    return {
      success: false,
      error: new Error('No JSON payload was provided'),
    };
  }

  try {
    return {
      success: true,
      value: JSON.parse(raw) as T,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to parse JSON'),
    };
  }
};

export const safeJsonParse = <T>(
  raw: string | null | undefined,
  fallback: T,
): T => {
  const parsed = tryParseJson<T>(raw);
  return parsed.success ? parsed.value : fallback;
};

export const extractErrorMessage = (
  error: unknown,
  fallback: string = 'An error occurred',
): string => {
  const rawMessage =
    error instanceof Error ? error.message : String(error || fallback);
  const parsed = tryParseJson<{
    message_line_string?: string;
    message?: string;
  }>(rawMessage);
  if (parsed.success) {
    return parsed.value.message_line_string || parsed.value.message || fallback;
  }
  return rawMessage;
};
export const getAccountIdentity = (
  account?: Partial<Account> | null,
): string => {
  if (!account) return '';

  return [
    account.accountId ? `id:${account.accountId}` : '',
    account.primaryAcct ?? '',
    account.companyCode ?? '',
    account.salesOrganization ?? '',
    account.distributionChannel ?? '',
    account.division ?? '',
  ].join('|');
};
export const clone = <T>(obj: T): T | undefined => {
  if (obj) {
    return JSON.parse(JSON.stringify(obj)) as T;
  }

  return undefined;
};
export function trimLeadingZeroes(str: string): string {
  if (typeof str === 'undefined' || str === null) {
    return '';
  }
  return str.replace(/^0+/, '');
}
export const toPaymentCardType = (
  paymentCardType: string,
  cardLast4Digit: string,
  maskStyle: 'full' | 'compact' = 'full',
) => {
  if (!paymentCardType && !cardLast4Digit) {
    return '';
  }

  if (!cardLast4Digit) {
    return paymentCardType;
  }

  if (!paymentCardType) {
    return cardLast4Digit;
  }

  const mask = maskStyle === 'compact' ? '*' : '****';

  return `${paymentCardType} ${mask} ${cardLast4Digit}`;
};

export const toCurrencySymbol = (currency: string) => {
  const currencySymbol = CurrencySymbols[currency] ?? CurrencySymbols.USD;

  return `${currencySymbol.symbolNative}`;
};

export const toCurrencyString = (
  currency: string,
  num: number,
  returnEmmptyForNullNumber = false,
  regionalFormat?: string | null,
) => {
  if (!currency) {
    currency = 'USD';
  }

  // Handle null/undefined - but allow 0
  if (num == null) {
    if (returnEmmptyForNullNumber) {
      return '';
    }
    num = 0;
  }

  num = Number(num);

  if (isNaN(num)) {
    num = 0;
  }

  // Use native Intl.NumberFormat - respects regional format setting or browser locale
  // Handles thousands separator, decimal separator, currency symbol placement, and negatives
  const locale = getActiveFormattingLocale(regionalFormat);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(num);
};

export const toCurrencyStringPartsAligned = (
  currency: string,
  num: number,
  returnEmptyForNullNumber = false,
  regionalFormat?: string | null,
) => {
  if (!currency) {
    currency = 'USD';
  }

  const symbol = CurrencySymbols[currency]?.symbolNative || '$';

  // Handle null/undefined - but allow 0
  if (num == null) {
    if (returnEmptyForNullNumber) {
      return { symbol, value: '' };
    }
    num = 0;
  }

  num = Number(num);

  if (isNaN(num)) {
    num = 0;
  }

  // Format number using regional format setting or browser locale
  const locale = getActiveFormattingLocale(regionalFormat);
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

  return {
    symbol,
    value: formatted,
  };
};

export const toFormattedDateString = (
  date: Date | string | null | undefined,
  regionalFormat?: string | null,
): string => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const locale = getActiveFormattingLocale(regionalFormat);
  return d.toLocaleDateString(locale);
};

export const handleExport = async (
  option: string,
  data: Invoice[],
  filters: { currencyKey?: string; currencyType?: string },
  showDaysTillDue?: boolean,
  isSchedule?: boolean,
  regionalFormat?: string | null,
) => {
  if (option === 'csv' || option === 'excel') {
    // Format data for export
    let formattedData: string[][] = [];
    if (isSchedule) {
      formattedData = formatSchedulePaymentDataForExport(
        data as unknown as Record<string, unknown>[],
        filters,
        regionalFormat,
      );
    } else {
      formattedData = formatDataForExport(
        data,
        filters,
        showDaysTillDue,
        regionalFormat,
      );
    }

    if (option === 'csv') {
      let csvContent;
      if (isSchedule) {
        csvContent = convertArrayToCSVForSchedule(formattedData);
      } else {
        csvContent = convertArrayToCSV(formattedData);
      }

      csvContent = '\uFEFF' + csvContent;
      const blobData = new Blob([csvContent], {
        type: 'text/csv;charset=utf-8',
      });
      saveAs(blobData, 'export.csv');
    } else if (option === 'excel') {
      const excelBuffer = await convertDataToExcel(formattedData);
      const blobData = new Blob([toBlobPart(excelBuffer)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      saveAs(blobData, 'export.xlsx');
    }
  }
};

const escapeForCSV = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  let str = String(value);
  if (str.includes('"')) {
    str = str.replace(/"/g, '""');
  }
  if (/[",\n]/.test(str)) {
    str = `"${str}"`;
  }
  return str;
};

const convertArrayToCSVForSchedule = (data: string[][]): string => {
  if (!data || data.length === 0) return '';

  return data.map((row) => row.map(escapeForCSV).join(',')).join('\n');
};

const formatDataForExport = (
  data: Invoice[],
  filters: { currencyKey?: string; currencyType?: string },
  showDaysTillDue?: boolean,
  regionalFormat?: string | null,
): string[][] => {
  // filters.currencyType for invoice filters, currencyKey for history/payments invoices
  const currency =
    filters.currencyType ||
    filters.currencyKey ||
    data[0]?.currencyKey ||
    'USD';

  // Define column names
  const columnNames = [
    'Status',
    'Reference Number',
    'Billing Document Number',
    'Document Date',
    `Total Amount(${currency})`,
    `Paid Amount(${currency})`,
    `Open Amount(${currency})`,
    'Due Date',
    ...(showDaysTillDue ? ['Days in Arrears'] : []),
    'Soldto Number',
  ];

  // Map data items to objects with corresponding column values
  const formattedData = data.map((item) => ({
    Status: formatInvoiceStatus(item),
    'Reference Number': item.referenceNumber
      ? item.referenceNumber.replace(/^0+/, '')
      : '',
    'Billing Document Number': item.billingDocumentNumber
      ? item.billingDocumentNumber.replace(/^0+/, '')
      : '',
    'Document Date': item.documentDate
      ? toFormattedDateString(item.documentDate, regionalFormat)
      : '',
    'Total Amount': item.totalAmount != null ? String(item.totalAmount) : '',
    'Paid Amount': item.paidAmount != null ? String(item.paidAmount) : '',
    'Open Amount': item.openAmount != null ? String(item.openAmount) : '',
    'Due Date': formatDueDate(item, regionalFormat),
    'Days in Arrears': showDaysTillDue
      ? String(formatDaysTillDue(item) ?? '')
      : '',
    'Soldto Number': item.soldtoNumber
      ? item.soldtoNumber.replace(/^0+/, '')
      : '',
  }));

  // Return array with column names followed by formatted data
  return [columnNames, ...formattedData.map((item) => Object.values(item))];
};

const formatSchedulePaymentDataForExport = (
  data: Record<string, unknown>[],
  _filters: unknown,
  regionalFormat?: string | null,
): string[][] => {
  // Define column names
  const columnNames = [
    'Scheduled ID',
    'Invoice',
    'Open Amount',
    'Amount to Pay',
    'Date to Pay',
    'Payment Method',
  ];

  // Map data items to objects with corresponding column values
  const formattedData = data.map((item) => ({
    'Scheduled ID': String(item.scheduleId || ''),
    Invoice: item.invoice ? String(item.invoice).replace(/^0+/, '') : '',
    'Open Amount': toCurrencyString(
      String(item.currencyKey || 'USD'),
      Number(item.openAmount ?? 0),
      true,
      regionalFormat,
    ),
    'Amount to Pay': toCurrencyString(
      String(item.currencyKey || 'USD'),
      Number(item.amountToPay ?? 0),
      true,
      regionalFormat,
    ),
    'Date to Pay': item.dateToPay
      ? toFormattedDateString(String(item.dateToPay), regionalFormat)
      : '',
    'Payment Method': String(item.paymentMethod || ''),
  }));

  // Return array with column names followed by formatted data
  return [columnNames, ...formattedData.map((item) => Object.values(item))];
};

const convertArrayToCSV = (data) => {
  return data
    .map((row) =>
      Object.values(row)
        .map((value) => {
          const stringValue = String(value);
          // Wrap in quotes if contains comma, quote, or newline
          if (
            stringValue.includes(',') ||
            stringValue.includes('"') ||
            stringValue.includes('\n')
          ) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(','),
    )
    .join('\n');
};

const escapeXml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const toExcelColumnName = (columnIndex: number): string => {
  let name = '';
  let index = columnIndex;

  while (index >= 0) {
    name = String.fromCharCode((index % 26) + 65) + name;
    index = Math.floor(index / 26) - 1;
  }

  return name;
};

const toBlobPart = (bytes: Uint8Array): BlobPart => {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
};

const convertDataToExcel = async (
  formattedData: string[][],
): Promise<Uint8Array> => {
  const rows = formattedData
    .map((row, rowIndex) => {
      const cells = Object.values(row)
        .map((value, columnIndex) => {
          const cellReference = `${toExcelColumnName(columnIndex)}${rowIndex + 1}`;
          return `<c r="${cellReference}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
        })
        .join('');

      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join('');

  const files = {
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '</Types>',
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>',
    ),
    'xl/workbook.xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>' +
        '</workbook>',
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '</Relationships>',
    ),
    'xl/worksheets/sheet1.xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>' +
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        `<sheetData>${rows}</sheetData>` +
        '</worksheet>',
    ),
  };

  return zipSync(files);
};

export function convertArrayToObject<T>(
  array: T[],
  key: string,
): { [key: string]: T } {
  const initialValue = {};
  return array.reduce((obj, item) => {
    return {
      ...obj,
      [item[key]]: item,
    };
  }, initialValue);
}

export const handlePaymentExport = async (
  option: 'csv' | 'excel',
  data: PaymentHistoryRow[],
  regionalFormat?: string | null,
) => {
  const formattedData = formatPaymentDataForExport(data, regionalFormat);

  if (option === 'csv') {
    let csvContent = convertArrayToCSV(formattedData);
    csvContent = '\uFEFF' + csvContent;
    const blobData = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8',
    });
    saveAs(blobData, 'payments_export.csv');
  } else if (option === 'excel') {
    const excelBuffer = await convertDataToExcel(formattedData);
    const blobData = new Blob([toBlobPart(excelBuffer)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blobData, 'payments_export.xlsx');
  }
};

export const handleUsersExport = async (
  option: 'csv' | 'excel',
  data: Record<string, unknown>[],
) => {
  const formattedData = formatUsersDataForExport(data);

  if (option === 'csv') {
    let csvContent = convertArrayToCSV(formattedData);
    csvContent = '\uFEFF' + csvContent;
    const blobData = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8',
    });
    saveAs(blobData, 'users_export.csv');
  } else if (option === 'excel') {
    const excelBuffer = await convertDataToExcel(formattedData);
    const blobData = new Blob([toBlobPart(excelBuffer)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blobData, 'users_export.xlsx');
  }
};

const formatUsersDataForExport = (
  data: Record<string, unknown>[],
): string[][] => {
  // Define column names
  const columnNames = [
    'User ID',
    'Name',
    'Company',
    'Email',
    'User Role',
    'Status',
    'Profile',
  ];

  // Map data items to objects with corresponding column values
  const formattedData = data.map((user) => {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();

    return {
      'User ID': String(user.login || ''),
      Name: String(fullName || ''),
      Company: String(user.company || ''),
      Email: String(user.email || ''),
      'User Role': String(user.role || ''),
      Status: String(user.status || ''),
      Profile: String(user.primaryAccountType || ''),
    };
  });

  // Return array with column names followed by formatted data
  return [columnNames, ...formattedData.map((item) => Object.values(item))];
};

const formatPaymentDataForExport = (
  data: PaymentHistoryRow[],
  regionalFormat?: string | null,
): string[][] => {
  const currency = data[0].currencyKey ? data[0].currencyKey : 'USD';
  //TODO: type data params
  const columnNames = [
    'Document Number',
    'Reference Number',
    'Billing Document Number',
    'Payment Date',
    `Payment Amount(${currency})`,
    'Payment Method',
    'Soldto Number',
  ];

  // Map data items to objects with corresponding column values
  const formattedData = data.map((item) => ({
    'Document Number': item.documentNumberFinance
      ? item.documentNumberFinance.replace(/^0+/, '')
      : '',
    'Reference Number': item.referenceNumber
      ? item.referenceNumber.replace(/^0+/, '')
      : '',
    'Billing Document Number': item.billingDocumentNumber
      ? item.billingDocumentNumber.replace(/^0+/, '')
      : '',
    'Payment Date': item.documentDate
      ? toFormattedDateString(item.documentDate, regionalFormat)
      : '',
    'Payment Amount': item.paidAmountRaw ? String(item.paidAmountRaw) : '',
    'Payment Method': item.paymentCardType + ' **** ' + item.CardLast4Digit,
    'Soldto Number': item.soldtoNumber
      ? item.soldtoNumber.replace(/^0+/, '')
      : '',
  }));
  // Return array with column names followed by formatted data
  return [columnNames, ...formattedData.map((item) => Object.values(item))];
};

export function isCredit(open_amount: number): boolean {
  return open_amount < 0;
}
export function removeLeadingZeros(item: string): string {
  return item?.replace(/^0+/, '');
}

export function extractLastCardNumbers(
  cardType: string,
  item: string,
  delim: string = '-',
) {
  if (item == null) return '';
  const a = item.indexOf(delim, 1);
  if (a === -1) return '';
  const b = item.indexOf(delim, a + 1);
  if (b === -1) return '';
  return item.substr(a + 1, b - a - 1);
}
export function getPreAuthAmount(
  CardType: string,
  payment_options: PaymentCardDetail[],
) {
  const found = payment_options.find(
    (p) => p.paymentCardType.toString() === CardType,
  );
  if (found) {
    return found.preauthorizationAmount ?? 0.1 * 100;
  }
  return 0.1 * 100;
}

export function mapPaymentIcon(cardType: string) {
  const type = (cardType || '').toUpperCase().trim();
  switch (type) {
    case 'MC':
    case 'MAST':
    case 'MASTERCARD':
      return 'mastercard';
    case 'VISA':
    case 'VI':
      return 'visa';
    case 'AMEX':
    case 'AX':
    case 'AMERICAN_EXPRESS':
    case 'AMERICAN-EXPRESS':
      return 'amex';
    case 'DISC':
    case 'DI':
    case 'DISCOVER':
      return 'discover';
    case 'DINERS':
    case 'DINERS_CLUB':
    case 'DN':
      return 'diners';
    case 'JCB':
    case 'JC':
      return 'jcb';
    default:
      return type.toLowerCase();
  }
}

const getCardTypeCandidate = (cardType?: string | null): string =>
  String(cardType || '')
    .toUpperCase()
    .trim();

export function findPaymentCardDetailByType(
  cardType: string,
  paymentOptions: PaymentCardDetail[] = [],
) {
  const candidate = getCardTypeCandidate(cardType);

  return paymentOptions.find((paymentOption) => {
    const variants = [
      paymentOption.paymentCardType,
      paymentOption.sapCardType,
      paymentOption.gatewayCardType,
      paymentOption.externalPaymentCardType,
    ]
      .filter(Boolean)
      .map((value) => getCardTypeCandidate(String(value)));

    return variants.includes(candidate);
  });
}

export function getGatewayCardType(
  cardType: string,
  paymentOptions: PaymentCardDetail[] = [],
) {
  const matched = findPaymentCardDetailByType(cardType, paymentOptions);
  return matched?.gatewayCardType || cardType;
}

export function enrichPaymentCardTypeFields<T extends PaymentCard>(card: T): T {
  return {
    ...card,
    paymentCardType: card.paymentCardType,
    sapCardType: card.sapCardType,
    gatewayCardType:
      card.gatewayCardType || getGatewayCardType(card.paymentCardType),
  };
}

export function enrichPaymentMethodTypeFields<T extends PaymentMethod>(
  paymentMethod: T,
): T {
  return {
    ...paymentMethod,
    cardType: paymentMethod.cardType,
    sapCardType: paymentMethod.sapCardType,
    gatewayCardType:
      paymentMethod.gatewayCardType ||
      getGatewayCardType(paymentMethod.cardType),
    cardLast4Digit: paymentMethod.cardLast4Digit,
  };
}

export function enrichAccountPaymentCardTypes<T extends Account>(
  account: T,
): T {
  if (!account?.resolvedPayerDetails?.paymentCards?.length) {
    return account;
  }

  return {
    ...account,
    resolvedPayerDetails: {
      ...account.resolvedPayerDetails,
      paymentCards: account.resolvedPayerDetails.paymentCards.map((card) =>
        enrichPaymentCardTypeFields(card),
      ),
    },
  };
}

export const buildCCRequest = (
  cardDetails: CreditCard,
  merchantId: string,
  accessToken: string,
) => {
  const data = window.$XIPlugin.createJSRequestPacket(merchantId, accessToken);
  data.addField(window.$XIPlugin.createField('PAYMET', false, 'CC'));
  data.addField(
    window.$XIPlugin.createField(
      'CCINS',
      false,
      cardDetails.gatewayCardType || cardDetails.cardType,
    ),
  );
  data.addField(
    window.$XIPlugin.createField(
      'CCNUM',
      true,
      cardDetails.cardNumber.replace(/\s/g, ''),
    ),
  );
  data.addField(
    window.$XIPlugin.createField('CCNAME', false, cardDetails.cardName),
  );
  data.addField(
    window.$XIPlugin.createField(
      'VALTM',
      false,
      parseInt(cardDetails.cardMonth ?? '0'),
    ),
  );
  data.addField(
    window.$XIPlugin.createField(
      'VALTY',
      false,
      parseInt(cardDetails.cardYear ?? '0'),
    ),
  );
  data.addField(
    window.$XIPlugin.createField(
      'CVVAL',
      false,
      cardDetails.cardValidationCode,
    ),
  );
  return data;
};

export const buildTORequest = (merchantd: string, accessToken: string) => {
  const data = window.$XIPlugin.createJSRequestPacket(merchantd, accessToken);
  return data;
};
export const buildECRequest = (
  cardDetails: CreditCard,
  merchantd: string,
  accessToken: string,
) => {
  const data = window.$XIPlugin.createJSRequestPacket(merchantd, accessToken);
  data.addField(window.$XIPlugin.createField('PAYMET', false, 'EC'));
  data.addField(window.$XIPlugin.createField('CCINS', false, 'EC'));
  data.addField(
    window.$XIPlugin.createField(
      'CCNUM',
      true,
      cardDetails.cardNumber.replace(/\s/g, ''),
    ),
  );
  data.addField(
    window.$XIPlugin.createField('CCNAME', false, cardDetails.cardName),
  );
  data.addField(
    window.$XIPlugin.createField(
      'ECRDFI',
      false,
      cardDetails.electronicCheckRdfiNumber ?? '',
    ),
  );
  data.addField(
    window.$XIPlugin.createField(
      'ECACTTYP',
      false,
      cardDetails.electronicCheckAccountType ?? '',
    ),
  );

  return data;
};
export const validateCvv = (cardType: string, cvv: string): boolean => {
  let pattern = /\d{3}/;
  let length = 3;

  if (cardType === 'AMEX') {
    pattern = /\d{4}/;
    length = 4;
  }
  if (!pattern.test(cvv) || cvv.length !== length) {
    return false;
  } else {
    return true;
  }
};

export const validateEmail = (email: string) => {
  const validRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
  if (email.match(validRegex)) {
    return true;
  } else {
    return false;
  }
};

export const formatError = (error: unknown): Record<string, unknown> => {
  const errorString = String(error);

  const jsonStartIndex = errorString.indexOf('{');
  const jsonPart = errorString.slice(jsonStartIndex);
  return safeJsonParse<Record<string, unknown>>(jsonPart, {
    message: errorString,
  });
};

export const validatePassword = (password: string) => {
  const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
  if (pattern.test(password)) {
    return true;
  } else {
    return false;
  }
};
export const base64ToFile = (base64Data: string, fileName: string): File => {
  const byteString = atob(base64Data.split(',')[1]);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const intArray = new Uint8Array(arrayBuffer);
  for (let i = 0; i < byteString.length; i++) {
    intArray[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([intArray], {
    type: 'image/jpeg',
  }); // Adjust the type as needed
  const file = new File([blob], fileName, { type: 'image/jpeg' }); // Adjust the type as needed

  return file;
};
export const checkFileExists = async (filePath: string): Promise<boolean> => {
  try {
    const response = await fetch(filePath, { method: 'HEAD' });
    if (response.ok) {
      return true;
    } else {
      return false;
    }
  } catch {
    return false;
  }
};

export const formatInvoiceStatus = (
  invoice: Invoice,
  f?: (id: string) => string,
) => {
  if (invoice.openAmount) {
    if (f && invoice.invoiceStatus) {
      // Convert status to lowercase and create translation key
      const translationKey = `invoices.status.${invoice.invoiceStatus.toLowerCase()}`;
      const translated = f(translationKey);
      // If translation exists (not same as key), return it, otherwise return original
      return translated !== translationKey ? translated : invoice.invoiceStatus;
    }
    return invoice.invoiceStatus || '';
  }
  return f ? f('invoices.status.paid') : 'Paid';
};

export const formatDueDate = (
  invoice: Invoice,
  regionalFormat?: string | null,
) => {
  if (invoice.openAmount && invoice.openAmount > 0) {
    return toFormattedDateString(invoice.dueDate ?? '', regionalFormat);
  }
  return '';
};

export const formatDaysTillDue = (invoice: Invoice) => {
  if (invoice.openAmount && invoice.openAmount > 0) {
    const overdue = isOverDue(invoice);
    return overdue ? `-${invoice.daysInArrears}` : invoice.daysInArrears;
  }
  return '';
};

export const isOverDue = (invoice: Invoice) => {
  if (!invoice.dueDate) return false; // or handle appropriately
  const dueDate = new Date(invoice.dueDate);
  const todaysDate = new Date();

  return dueDate < todaysDate;
};

export const getInvoiceKey = (invoice: Invoice): string => {
  if (invoice.uid) {
    return invoice.uid;
  }

  const billingDoc =
    invoice.billingDocumentNumber != null
      ? String(invoice.billingDocumentNumber).trim()
      : '';
  const financeDoc =
    invoice.documentNumberFinance != null
      ? String(invoice.documentNumberFinance).trim()
      : '';
  const refNum =
    invoice.referenceNumber != null
      ? String(invoice.referenceNumber).trim()
      : '';
  const fiscalYear =
    invoice.fiscalYearOfTheRelevantInvoice != null
      ? String(invoice.fiscalYearOfTheRelevantInvoice).trim()
      : '';
  const lineItem =
    invoice.lineItemInTheRelevantInvoice != null
      ? String(invoice.lineItemInTheRelevantInvoice).trim()
      : '';

  const primaryDoc = billingDoc || financeDoc || refNum;

  if (!primaryDoc) {
    return `${invoice.soldtoNumber ?? ''}_${invoice.documentDate ?? ''}_${invoice.dueDate ?? ''}_${invoice.openAmount ?? ''}_${invoice.totalAmount ?? ''}_${fiscalYear}_${lineItem}`;
  }

  return `${primaryDoc}_${financeDoc}_${fiscalYear}_${lineItem}`;
};

export const removeIframeById = (iframeId: string) => {
  const iframeElement = document.getElementById(iframeId);
  if (iframeElement) {
    iframeElement.remove(); // Remove the iframe from the DOM
  }
};

export const findMatchingCard = (
  token: string,
  type: string,
  allPayerCards: Array<PaymentCard | PaymentMethod>,
  intl: { formatMessage: (opts: { id: string }) => string },
) => {
  const f = (id: string) => intl.formatMessage({ id });
  let info;
  let error;
  const matchedCard = allPayerCards.find(
    (card) =>
      ('paymentCardToken' in card
        ? card.paymentCardToken
        : card.token || '') === token,
  );
  if (matchedCard) {
    error = true;
    info =
      type !== 'EC'
        ? f('payment_methods.card_already_saved')
        : f('payment_methods.account_already_saved');
  } else {
    error = false;
    info = '';
  }

  return { matchedCard, info, error };
};

/**
 * Generates the URL for the dynamic CSS endpoint with theme parameters
 */
export const getDynamicThemeStylesUrl = (
  _theme: unknown,
  method: 'CC' | 'EC' = 'CC',
  type: 'H' | 'I' = 'I',
): string => {
  const u = window.location.host;

  return `${window.location.origin}${getAppBaseUrl()}/api/payment/styles/${method}/${type}/${u}.css`;
};

const CURRENT_PAYMENT_METHOD_SELECTION_KEY = 'payment.currentMethodSelection';

export const clearPaymentSession = () => {
  Object.keys(sessionStorage).forEach((key) => {
    if (
      key === CURRENT_PAYMENT_METHOD_SELECTION_KEY ||
      key.endsWith('_amount') ||
      key.endsWith('_reason') ||
      key.endsWith('_description')
    ) {
      sessionStorage.removeItem(key);
    }
  });
};

export const rememberCurrentPaymentMethodSelection = (
  paymentMethod: PaymentMethod,
  payer?: string,
  accountIdentity?: string,
): void => {
  if (!paymentMethod?.token && !paymentMethod?.key) {
    return;
  }

  sessionStorage.setItem(
    CURRENT_PAYMENT_METHOD_SELECTION_KEY,
    JSON.stringify({
      paymentMethod,
      payer: payer || '',
      accountIdentity: accountIdentity || '',
      path: window.location.pathname,
    }),
  );
};

export const getCurrentPaymentMethodSelection = (
  payer?: string,
  accountIdentity?: string,
): PaymentMethod | null => {
  const raw = sessionStorage.getItem(CURRENT_PAYMENT_METHOD_SELECTION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const current = JSON.parse(raw) as {
      paymentMethod?: PaymentMethod;
      payer?: string;
      accountIdentity?: string;
      path?: string;
    };
    if (!current.paymentMethod?.token && !current.paymentMethod?.key) {
      return null;
    }

    if (current.payer && payer && current.payer !== payer) {
      return null;
    }

    if (accountIdentity && current.accountIdentity !== accountIdentity) {
      return null;
    }

    if (current.path && current.path !== window.location.pathname) {
      return null;
    }

    return current.paymentMethod;
  } catch {
    return null;
  }
};

export const clearCurrentPaymentMethodSelection = (): void => {
  sessionStorage.removeItem(CURRENT_PAYMENT_METHOD_SELECTION_KEY);
};

// Helper function to get selected sub-account
export function getSelectedSubAccount(
  relAccts: AccountResponse[],
  acctType: string,
  selectedAccount?: string,
): string | undefined {
  if (!!relAccts && relAccts.length > 0) {
    const acctKeys = relAccts.map((x) => x.primaryAccount);

    if (acctType === AccountType.Payer) {
      //on the invoice page, this returns an array - but there we're using the result as a search param - not quite sure what to do here
      return selectedAccount || acctKeys[0];
    } else {
      if (!!acctKeys && acctKeys.length > 0) {
        return acctKeys[0];
      } else {
        return relAccts[0].primaryAccount;
      }
    }
  }
  return undefined;
}

export const getEffectivePayerFromAccount = (
  account: Account | null | undefined,
  fallbackPayer?: string,
) => {
  if (!account) {
    return fallbackPayer ?? '';
  }

  return (
    account.defaultPayer?.primaryAccount ??
    getSelectedSubAccount(
      account.relatedAccounts ?? [],
      account.accountTypeId,
      account.primaryAcct,
    ) ??
    fallbackPayer ??
    account.primaryAcct ??
    ''
  );
};

export const getSelectedSubAccounts = (
  relAccts: AccountResponse[],
  effectiveUserAccountType: string,
) => {
  if (relAccts && relAccts.length > 0) {
    const relAcctKeys = relAccts.map((x) => x.primaryAccount);

    const selectedAccts = relAccts.filter((x) => x.selected === true);
    const selectedAcctKeys = selectedAccts.map((x) => x.primaryAccount);

    if (effectiveUserAccountType === AccountType.Payer) {
      return selectedAcctKeys;
    } else {
      if (!!selectedAcctKeys && selectedAcctKeys.length > 0) {
        return selectedAcctKeys;
      } else {
        return relAcctKeys;
      }
    }
  }
  return null;
};

export const CARD_ADD_3DS_RETURN_PARAM = 'epay3ds';
export const CARD_ADD_3DS_RETURN_VALUE = 'card-add';

export const getCardAdd3dsRedirectUri = (href?: string): string => {
  const url = new URL(href || window.location.href);
  url.searchParams.delete('id');
  url.searchParams.delete('access_token');
  url.searchParams.delete('status');
  url.searchParams.delete('error_message');
  url.searchParams.set(CARD_ADD_3DS_RETURN_PARAM, CARD_ADD_3DS_RETURN_VALUE);
  return url.toString();
};

export const getGuestCardAdd3dsRedirectUri = getCardAdd3dsRedirectUri;

export const normalizeHostedPaymentCard = (
  paymentCard: Record<string, unknown>,
): {
  paymentCardType: string;
  sapCardType?: string;
  gatewayCardType?: string;
  paymentCardToken: string;
  paymentCardName: string;
  validTo: string;
} => ({
  paymentCardType: String(
    paymentCard.paymentCardType ||
      paymentCard.payment_card_type ||
      paymentCard.type ||
      'CC',
  ),
  sapCardType:
    paymentCard.sapCardType != null || paymentCard.sap_card_type != null
      ? String(paymentCard.sapCardType || paymentCard.sap_card_type)
      : undefined,
  paymentCardToken: String(
    paymentCard.paymentCardToken ||
      paymentCard.payment_card_token ||
      paymentCard.token ||
      '',
  ),
  paymentCardName: String(
    paymentCard.paymentCardName ||
      paymentCard.payment_card_name ||
      paymentCard.name ||
      (
        paymentCard.keys as Array<{ key: string; value: string }> | undefined
      )?.find((k) => k.key === 'CARD_HOLDER_NAME')?.value ||
      '',
  ),
  gatewayCardType:
    paymentCard.gatewayCardType != null ||
    paymentCard.gateway_card_type != null ||
    paymentCard.type != null
      ? String(
          paymentCard.gatewayCardType ||
            paymentCard.gateway_card_type ||
            paymentCard.type,
        )
      : undefined,
  validTo: String(
    paymentCard.validTo || paymentCard.valid_to || paymentCard.expiration || '',
  ),
});
