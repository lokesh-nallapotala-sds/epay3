import { ComponentProps } from 'react';

import { Button, Grid } from '@mui/material';
import EpayFilterIcon from 'shared/icons/EpayFilterIcon';
import ExportSelectionButton from 'shared/components/ExportSelectionButton';
import { PaymentHistoryRow } from 'types/InvoicesSearchRequest';

import PaymentHistoryFilterSelectors from 'components/payments/PaymentHistoryFilterSelectors';

interface MobilePaymentHistoryFiltersProps {
  f: (id: string) => string;
  filterOpen: boolean;
  setFilterOpen: (open: boolean) => void;
  handleExportData: (option: string, data: PaymentHistoryRow[]) => void;
  invoiceList: PaymentHistoryRow[];
  filterProps: ComponentProps<typeof PaymentHistoryFilterSelectors>;
}

export default function MobilePaymentHistoryFilters({
  f,
  filterOpen,
  setFilterOpen,
  handleExportData,
  invoiceList,
  filterProps,
}: MobilePaymentHistoryFiltersProps) {
  return (
    <>
      <Grid container spacing={1}>
        <Grid item xs={6}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setFilterOpen(!filterOpen)}
            size="small"
            sx={{
              display: 'flex',
              justifyContent: 'flex-start',
              borderRadius: '12px',
              border: '1px solid #DFE1E6',
              width: '100%',
              height: '34px!important',
              color: '#0D0D12',
              fontSize: '1rem',
              fontWeight: '500',
              borderColor: '#DFE1E6',
            }}
          >
            <EpayFilterIcon sx={{ marginRight: '0.5rem' }} />
            {f('invoices.filters')}
          </Button>
        </Grid>
        <Grid item xs={6}>
          <ExportSelectionButton
            onSelect={(e: string) => handleExportData(e, invoiceList)}
          />
        </Grid>
      </Grid>
      {filterOpen && <PaymentHistoryFilterSelectors {...filterProps} />}
    </>
  );
}
