import { PaymentHistoryRow, paymentList } from 'types/InvoicesSearchRequest';
import { toCurrencyString } from 'utilities/utilities';

export function filterPaymentsBySelectedAccounts(
  paymentList: paymentList[],
  selectedAccounts: string[],
  selectedSoldToAccounts = selectedAccounts,
) {
  if (selectedAccounts.length === 0 && selectedSoldToAccounts.length === 0) {
    return paymentList;
  }

  return paymentList
    .map((payment) => {
      const sdInvoices = payment.sdInvoices || [];

      if (sdInvoices.length === 0) {
        const payerNumber = payment.payerNumber
          ? payment.payerNumber.replace(/^0+/, '')
          : '';
        return selectedAccounts.includes(payerNumber) ? payment : null;
      }

      const filteredSdInvoices = sdInvoices.filter((subInvoice) =>
        selectedSoldToAccounts.includes(
          subInvoice.soldtoNumber?.replace(/^0+/, ''),
        ),
      );

      return filteredSdInvoices.length > 0
        ? { ...payment, sdInvoices: filteredSdInvoices }
        : null;
    })
    .filter((payment): payment is paymentList => payment !== null);
}

export function prepareTableData(
  paymentList: paymentList[],
  regionalFormat?: string | null,
): PaymentHistoryRow[] {
  return paymentList.flatMap((payment) =>
    payment.sdInvoices && payment.sdInvoices.length > 0
      ? payment.sdInvoices.map((invoice) => ({
          documentNumberFinance: payment.documentNumberFinance,
          referenceNumber: payment.referenceNumber,
          billingDocumentNumber: invoice.billingDocumentNumber.replace(
            /^0+/,
            '',
          ),
          documentDate: payment.documentDate,
          paidAmount: toCurrencyString(
            invoice.currencyKey,
            Number(invoice.currentPaidAmount),
            false,
            regionalFormat,
          ),
          paymentCardType: payment.paymentCardType,
          paymentCardToken: payment.paymentCardToken,
          soldtoNumber: invoice.soldtoNumber.replace(/^0+/, ''),
          currencyKey: invoice.currencyKey,
          paidAmountRaw: Number(invoice.currentPaidAmount),
          appliedCreditAmount: payment.appliedCreditAmount ?? 0,
          paymentData: payment,
          CardLast4Digit: payment.cardLast4Digit,
        }))
      : [
          {
            documentNumberFinance: payment.documentNumberFinance,
            referenceNumber: payment.referenceNumber,
            billingDocumentNumber: 'Deposit',
            documentDate: payment.documentDate,
            paidAmount: toCurrencyString(
              payment.currencyKey,
              Number(payment.paidAmount),
              false,
              regionalFormat,
            ),
            paymentCardType: payment.paymentCardType,
            paymentCardToken: payment.paymentCardToken,
            soldtoNumber: payment.payerNumber
              ? payment.payerNumber.replace(/^0+/, '')
              : '',
            currencyKey: payment.currencyKey,
            paidAmountRaw: Number(payment.paidAmount),
            appliedCreditAmount: payment.appliedCreditAmount ?? 0,
            paymentData: payment,
            CardLast4Digit: payment.cardLast4Digit,
          },
        ],
  );
}
