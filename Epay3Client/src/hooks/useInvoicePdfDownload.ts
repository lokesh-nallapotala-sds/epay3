import { useState } from 'react';

import { Invoice } from 'types/InvoicesSearchRequest';
import { InvoicePdfRequest } from 'types/InvoicePdfRequest';
import { useEpayLocale } from 'providers/EpayIntlProvider';
import { useEpayToast } from 'providers/EpayToastProvider';
import { EpayInvoicesService } from 'services/EpayInvoicesService';

interface PdfAccount {
  primaryAcct: string;
  companyCode: string;
}

interface UseInvoicePdfDownloadParams {
  account: PdfAccount;
  isMobile: boolean;
  impersonatedUserId?: string;
}

export interface UseInvoicePdfDownloadReturn {
  pdfUrl: string | null;
  pdfModalOpen: boolean;
  setPdfModalOpen: (open: boolean) => void;
  handlePdfDownload: (data: Invoice) => Promise<void>;
}

export function useInvoicePdfDownload({
  account,
  isMobile,
  impersonatedUserId,
}: UseInvoicePdfDownloadParams): UseInvoicePdfDownloadReturn {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  const getPdf = EpayInvoicesService.useGetPdf();
  const { showToastMessage } = useEpayToast();
  const { language } = useEpayLocale();

  const handlePdfDownload = async (data: Invoice) => {
    try {
      const request: InvoicePdfRequest = {
        documentNumber: data.billingDocumentNumber ?? '',
        customerNumber: data.soldtoNumber,
        primaryAccount: account.primaryAcct,
        companyCode: account.companyCode,
        userId: impersonatedUserId,
      };

      const resp = await getPdf(request);
      const url = `api/invoices/${language}/pdf?token=${resp.token}`;

      if (isMobile) {
        const pdfView = window.open(url, '_blank');
        pdfView?.document && (pdfView.document.title = 'PDF');
      } else {
        setPdfUrl(url);
        setPdfModalOpen(true);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      showToastMessage('error', errorMessage);
    }
  };

  return { pdfUrl, pdfModalOpen, setPdfModalOpen, handlePdfDownload };
}
