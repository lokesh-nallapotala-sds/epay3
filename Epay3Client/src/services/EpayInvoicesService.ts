import { ErrorInfo } from 'types/ErrorInfo';
import {
  ValidateInvoiceAccount,
  ValidateInvoiceAccountResponse,
} from 'types/Invoice';
import { InvoicePdfRequest } from 'types/InvoicePdfRequest';
import { InvoiceDetailRequest } from 'types/InvoiceDetailRequest';
import { InvoiceBulkPdfRequest } from 'types/InvoiceBulkPdfRequest';
import {
  Invoice,
  InvoiceRequestBody,
  InvoicesSearchRequest,
} from 'types/InvoicesSearchRequest';
import { useEpayQuery } from '../providers/EpayQueryProvider';
import { useEpayLoading } from '../providers/EpayLoadingProvider';

export const EpayInvoicesService = {
  useGetInvoices(): (request: InvoicesSearchRequest) => Promise<Invoice[]> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (request: InvoicesSearchRequest) => {
      try {
        increment();
        const resp = await ctx.getInvoices(request);

        if (resp?.ok) {
          if (resp.status === 204) {
            return [];
          }

          return await resp.json();
        } else {
          throw new ErrorInfo(resp.statusText, resp.statusText, resp.status);
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  useGetInvoiceSearch(): (request: InvoiceRequestBody) => Promise<Invoice[]> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (request: InvoiceRequestBody) => {
      try {
        increment();
        const resp = await ctx.getInvoiceSearch(request);
        if (resp?.ok) {
          return await resp.json();
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  useGetInvoiceDetails(): (
    request: InvoiceDetailRequest,
  ) => Promise<{ detail: import('types/Invoice').InvoiceDetail }> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (request: InvoiceDetailRequest) => {
      try {
        increment();
        const resp = await ctx.getInvoiceDetails(request);
        if (resp?.ok) {
          return await resp.json();
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  useGetPdf(): (request: InvoicePdfRequest) => Promise<{ token: string }> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (request: InvoicePdfRequest) => {
      try {
        increment();
        const resp = await ctx.getInvoicePdf(request);
        if (resp?.ok) {
          return await resp.json();
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  useGetBulkPdf(): (request: InvoiceBulkPdfRequest[]) => Promise<Response> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (request: InvoiceBulkPdfRequest[]) => {
      try {
        increment();
        const resp = await ctx.getBulkPdf(request);
        if (resp?.ok) {
          return resp;
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  useValidateAccount(): (
    accountNr: string,
    invoiceNr: string,
    invoiceAmt: number,
  ) => Promise<ValidateInvoiceAccountResponse> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (
      accountNr: string,
      invoiceNr: string,
      invoiceAmt: number,
    ) => {
      try {
        increment();
        const validateInvoiceAccount: ValidateInvoiceAccount = {
          accountNumber: accountNr,
          invoiceNumber: invoiceNr,
          invoiceAmount: invoiceAmt,
        };
        const resp = await ctx.validateAccount(validateInvoiceAccount);
        return resp;
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },
};
