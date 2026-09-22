import { ReactNode } from 'react';

import { Theme } from '@mui/system';
import { Button, Typography } from '@mui/material';
import EpayPdfIcon from 'shared/icons/EpayPdfIcon';
import { Invoice } from 'types/InvoicesSearchRequest';
import { EpayDataTableColumnDefinition } from 'shared/components/EpayDataTable';
import {
  formatDaysTillDue,
  formatDueDate,
  formatInvoiceStatus,
  toCurrencyString,
  toFormattedDateString,
} from 'utilities/utilities';

export interface InvoiceColumnConfig {
  f: (id: string) => string;
  theme: Theme;
  regionalFormat: string;
  currencyFallback?: string;
  showPdfActions: boolean;
  showDaysTillDue: boolean;
  onDocumentClick: (data: Invoice) => void;
  onPdfDownload: (data: Invoice) => void;
  statusColumnHeaderId: string;
  documentColumnHeaderId?: string;
  statusRenderer?: (data: Invoice) => ReactNode;
}

export function buildInvoiceColumns({
  f,
  theme,
  regionalFormat,
  currencyFallback = '',
  showPdfActions,
  showDaysTillDue,
  onDocumentClick,
  onPdfDownload,
  statusColumnHeaderId,
  documentColumnHeaderId = 'invoices.table.document',
  statusRenderer,
}: InvoiceColumnConfig): EpayDataTableColumnDefinition[] {
  const getCurrency = (data: Invoice) =>
    data.currencyKey || currencyFallback || '';

  const colDefs: EpayDataTableColumnDefinition[] = [
    {
      header: f(statusColumnHeaderId),
      field: 'invoiceStatus',
      sortable: true,
      alignment: 'left',
      renderer: statusRenderer ?? ((data) => formatInvoiceStatus(data, f)),
    },
    {
      header: f('invoices.table.reference'),
      field: 'referenceNumber',
      sortable: true,
      alignment: 'left',
      renderer: (data) =>
        data.referenceNumber ? data.referenceNumber.replace(/^0+/, '') : '',
      display: { xs: 'none', sm: 'none', md: 'table-cell' },
    },
    {
      header: f(documentColumnHeaderId),
      field: 'billingDocumentNumber',
      sortable: true,
      alignment: 'left',
      renderer: (data) =>
        data.billingDocumentNumber ? (
          <Button
            variant="link"
            size="small"
            onClick={() => onDocumentClick(data)}
            sx={{ padding: 0 }}
          >
            {data.billingDocumentNumber.replace(/^0+/, '')}
          </Button>
        ) : (
          <Typography
            variant="body2"
            sx={{ height: '32px', display: 'flex', alignItems: 'center' }}
          >
            {data.documentNumberFinance?.replace(/^0+/, '') ?? ''}
          </Typography>
        ),
    },
    {
      header: f('invoices.table.date'),
      field: 'documentDate',
      sortable: true,
      alignment: 'left',
      renderer: (data) =>
        data.documentDate
          ? toFormattedDateString(data.documentDate, regionalFormat)
          : '',
    },
    {
      header: f('invoices.table.total'),
      field: 'totalAmount',
      sortable: true,
      alignment: 'left',
      renderer: (data) =>
        toCurrencyString(
          getCurrency(data),
          data.totalAmount ?? 0,
          true,
          regionalFormat,
        ),
    },
    {
      header: f('invoices.table.paid'),
      field: 'paidAmount',
      sortable: true,
      alignment: 'left',
      renderer: (data) =>
        toCurrencyString(
          getCurrency(data),
          data.paidAmount ?? 0,
          true,
          regionalFormat,
        ),
    },
    {
      header: f('invoices.table.open'),
      field: 'openAmount',
      sortable: true,
      alignment: 'left',
      renderer: (data) =>
        toCurrencyString(
          getCurrency(data),
          data.openAmount ?? 0,
          true,
          regionalFormat,
        ),
    },
    {
      header: f('invoices.table.due'),
      field: 'dueDate',
      sortable: true,
      alignment: 'left',
      renderer: (data) => {
        const dueDateStr = formatDueDate(data, regionalFormat);
        if (!dueDateStr) return '';
        const isOverdue =
          data.dueDate != null && new Date(data.dueDate) < new Date();
        return (
          <Typography
            variant={isOverdue ? 'fieldHeader' : 'body2'}
            color={isOverdue ? theme.palette.error.main : 'text.primary'}
          >
            {dueDateStr}
          </Typography>
        );
      },
    },
    {
      header: f('invoices.table.account'),
      field: 'soldtoNumber',
      alignment: 'left',
      renderer: (data) => data.soldtoNumber.replace(/^0+/, ''),
    },
  ];

  if (showPdfActions) {
    colDefs.push({
      header: f('invoices.table.pdf'),
      field: 'hasKeys',
      alignment: 'center',
      renderer: (data) =>
        data.hasKey ? (
          <EpayPdfIcon
            sx={{ color: theme.palette.error.main, cursor: 'pointer' }}
            onClick={() => onPdfDownload(data)}
          />
        ) : (
          <EpayPdfIcon sx={{ color: theme.palette.text.disabled }} />
        ),
    });
  }

  if (showDaysTillDue) {
    colDefs.push({
      header: f('invoices.table.days'),
      field: 'daysInArrears',
      sortable: true,
      alignment: 'left',
      display: { xs: 'none', sm: 'none', md: 'none', lg: 'table-cell' },
      renderer: (data) => {
        const daysTillDue = formatDaysTillDue(data);
        if (!daysTillDue) return '';
        return (
          <Typography
            variant={Number(daysTillDue) < 0 ? 'fieldHeader' : 'body2'}
            color={
              Number(daysTillDue) < 0
                ? theme.palette.error.main
                : 'text.primary'
            }
          >
            {daysTillDue}
          </Typography>
        );
      },
    });
  }

  return colDefs;
}
