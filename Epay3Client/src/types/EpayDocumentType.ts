export const EpayDocumentType = {
  Invoice: '01',
  Payment: '02',
} as const;

export type EpayDocumentType =
  (typeof EpayDocumentType)[keyof typeof EpayDocumentType];

export function getResourceIdForDocumentType(s: EpayDocumentType | string) {
  switch (s) {
    case EpayDocumentType.Invoice:
      return 'app.common.document.type.invoice';
    case EpayDocumentType.Payment:
      return 'app.common.document.type.payment';
    default:
      //should never happen, but to avoid runtime errors...
      return 'app.common.document.type.unknown';
  }
}
