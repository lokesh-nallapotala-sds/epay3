export const DocumentStatus = {
  Open: '01',
  Complete: '02',
  //OpenOrComplete: '03',
  All: '03',
} as const;

export type DocumentStatus =
  (typeof DocumentStatus)[keyof typeof DocumentStatus];

export function getResourceIdForDocumentStatus(s: DocumentStatus | string) {
  switch (s) {
    case DocumentStatus.Open:
      return 'app.common.document.status.open';
    case DocumentStatus.Complete:
      return 'app.common.document.status.complete';
    default:
      return 'app.common.document.status.all';
  }
}
