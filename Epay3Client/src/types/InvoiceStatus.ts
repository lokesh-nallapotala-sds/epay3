export const InvoiceStatus = {
  Open: '01',
  Complete: '02',
  All: '03',
  Scheduled: '04',
  None: '',
} as const;

export type InvoiceStatusType =
  (typeof InvoiceStatus)[keyof typeof InvoiceStatus];
//equivalent to:
//export type InvoiceStatusType = '' | '01' | '02' | '03';

export function getResourceIdForInvoiceStatus(
  s: InvoiceStatusType | string,
): string {
  switch (s) {
    case InvoiceStatus.Open:
      return 'invoice.status.open';
    case InvoiceStatus.Complete:
      return 'invoice.status.complete';
    case InvoiceStatus.All:
      return 'invoice.status.all';
    default:
      return 'invoice.status.none';
  }
}
