import React, { Ref, useCallback, useImperativeHandle, useRef } from 'react';
import { Box, Grid, Typography } from '@mui/material';

import { Invoice } from 'types/InvoicesSearchRequest';
import { PaymentConfig } from 'types/Payment';
import { CurrencySymbol } from 'types/CurrencySymbol';

import PaymentInvoice, { PaymentInvoiceHandle } from './PaymentInvoice';
import { useFormat } from 'hooks/useFormat';

export interface PaymentInvoiceListHandle {
  validateAll: () => boolean;
}

interface PaymentInvoiceListProps {
  invoices: Invoice[];
  config?: PaymentConfig | null;
  onChange: (invoice: Invoice) => void;
  canDelete?: boolean;
  handleRemoveInvoice?: (payload: string | Invoice) => void;
  paymentMethodType?: string;
  currencyOptions?: CurrencySymbol[];
  paymentSource?: string;
  companyCode?: string;
}

const PaymentInvoiceList = ({
  invoices,
  config,
  onChange,
  canDelete = false,
  handleRemoveInvoice,
  paymentMethodType,
  currencyOptions,
  paymentSource,
  companyCode,
  ref,
}: PaymentInvoiceListProps & { ref?: Ref<PaymentInvoiceListHandle> }) => {
  const f = useFormat();

  const invoiceRefsMap = useRef<Map<string, PaymentInvoiceHandle>>(new Map());

  const makeRefCallback = useCallback(
    (uid: string) => (el: PaymentInvoiceHandle | null) => {
      if (el) {
        invoiceRefsMap.current.set(uid, el);
      } else {
        invoiceRefsMap.current.delete(uid);
      }
    },
    [],
  );

  useImperativeHandle(ref, () => ({
    validateAll: () => {
      for (const invoiceRef of invoiceRefsMap.current.values()) {
        if (!invoiceRef.validate()) return false;
      }
      return invoiceRefsMap.current.size > 0;
    },
  }));

  return (
    <Grid item container>
      <Grid
        item
        container
        flexDirection="row"
        sx={{
          color: '#808897 !important',
          borderBottom: '1px solid',
          borderBottomColor: '#E0E0E0',
          fontSize: '14px',
          justifyContent: { xs: 'stretch', sm: 'flex-start' },
          padding: {
            xs: canDelete ? '10px 43px 10px 0' : '10px 0',
            sm: '10px',
          },
        }}
        sm={12}
        md={12}
        lg={12}
      >
        <Grid item xs={4} sm={2} md={2} lg={2} sx={{ paddingLeft: '8px' }}>
          <Typography variant="fieldHeader" align="left" noWrap>
            <Box
              component="span"
              sx={{ display: { xs: 'inline', sm: 'none' } }}
            >
              {f('payment.doc_short')}
            </Box>
            <Box
              component="span"
              sx={{ display: { xs: 'none', sm: 'inline' } }}
            >
              {f('payment.doc')}
            </Box>
          </Typography>
        </Grid>
        <Grid
          item
          sm={2}
          md={2}
          lg={2}
          sx={{ display: { xs: 'none', sm: 'flex' } }}
        >
          <Typography variant="fieldHeader" align="left">
            {f('payment.date')}
          </Typography>
        </Grid>
        <Grid
          item
          sm={2}
          md={2}
          lg={2}
          sx={{ display: { xs: 'none', sm: 'flex' } }}
        >
          <Typography variant="fieldHeader" align="left">
            {f('header.account')}
          </Typography>
        </Grid>
        <Grid item xs={4} sm={2} md={2} lg={2}>
          <Typography
            variant="fieldHeader"
            align="left"
            sx={{ marginLeft: '10px' }}
          >
            {f('invoices.table.open')}
          </Typography>
        </Grid>
        <Grid item xs={4} sm={3} md={3} lg={3}>
          <Typography variant="fieldHeader" align="left">
            {f('payment.pay')}
          </Typography>
        </Grid>
      </Grid>
      <Grid item container>
        {invoices.map((invoice, index) => (
          <PaymentInvoice
            key={invoice.uid ?? index}
            data={invoice}
            config={config}
            currencyOptions={currencyOptions}
            isLastRow={index + 1 === invoices.length}
            onChange={onChange}
            canDelete={canDelete}
            handleRemoveInvoice={handleRemoveInvoice}
            paymentMethodType={paymentMethodType}
            paymentSource={paymentSource}
            companyCode={companyCode}
            ref={makeRefCallback(invoice.uid ?? String(index))}
          />
        ))}
      </Grid>
    </Grid>
  );
};

export default PaymentInvoiceList;
