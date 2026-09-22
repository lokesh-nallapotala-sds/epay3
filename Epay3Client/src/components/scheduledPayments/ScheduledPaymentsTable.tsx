import { Box, Typography, IconButton, Grid } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { ScheduledPayment } from 'types/ScheduledPayment';
import { Invoice } from 'types/InvoicesSearchRequest';
import { useIntl } from 'react-intl';
import EpaySelectionButton from '../../shared/components/EpaySelectionButton';
import CompactFilterSelect from 'shared/components/CompactFilterSelect';
import {
  handleExport,
  toCurrencyString,
  removeLeadingZeros,
  toFormattedDateString,
  toPaymentCardType,
} from '../../utilities/utilities';
import EpayDataTable, {
  EpayDataTableColumnDefinition,
} from 'shared/components/EpayDataTable';

interface ScheduledPaymentsTableProps {
  data?: ScheduledPayment[];
  onDelete?: (scheduleId: string) => void;
  isNew: string;
  selectedCurrency: string;
  currencyOptions: { key: string; value: string }[];
  setSelectedCurrency: (value: string) => void;
  regionalFormat?: string | null;
}

const ScheduledPaymentsTable = ({
  data = [],
  onDelete,
  isNew,
  selectedCurrency,
  currencyOptions,
  setSelectedCurrency,
  regionalFormat,
}: ScheduledPaymentsTableProps) => {
  const intl = useIntl();
  const f = (id: string) => intl.formatMessage({ id: id });

  const handleDelete = (scheduleId: string) => {
    if (onDelete) {
      onDelete(scheduleId);
    }
  };

  const handleExportData = (option: string, exportData: ScheduledPayment[]) => {
    handleExport(
      option,
      exportData as unknown as Invoice[],
      (data?.[0] as unknown as { currencyKey?: string }) ?? {},
      false,
      true,
      regionalFormat,
    );
  };

  const colDefs: EpayDataTableColumnDefinition<ScheduledPayment>[] = [
    {
      header: f('schedule.invoice.header.scheduleid'),
      field: 'scheduleId',
      sortable: false,
      alignment: 'left',
      renderer: (rowData) => (
        <>
          {rowData.scheduleId}
          {rowData.scheduleId === isNew && (
            <Typography
              component="span"
              sx={{ color: 'red', fontWeight: 'bold', ml: 1, fontSize: '14px' }}
            >
              New
            </Typography>
          )}
        </>
      ),
    },
    {
      header: f('schedule.invoice.header.invoice'),
      field: 'invoice',
      sortable: false,
      alignment: 'left',
      renderer: (rowData) => removeLeadingZeros(rowData.invoice),
    },
    {
      header: f('schedule.invoice.header.openamount'),
      field: 'openAmount',
      sortable: false,
      alignment: 'left',
      renderer: (rowData) =>
        toCurrencyString(
          rowData.currencyKey,
          rowData.openAmount,
          true,
          regionalFormat,
        ),
    },
    {
      header: f('schedule.invoice.header.amounttopay'),
      field: 'amountToPay',
      sortable: false,
      alignment: 'left',
      renderer: (rowData) =>
        toCurrencyString(
          rowData.currencyKey,
          rowData.amountToPay,
          true,
          regionalFormat,
        ),
    },
    {
      header: f('schedule.invoice.header.datetopay'),
      field: 'dateToPay',
      sortable: false,
      alignment: 'left',
      renderer: (data) =>
        data.dateToPay && data.dateToPay !== '-'
          ? toFormattedDateString(data.dateToPay, regionalFormat)
          : data.dateToPay === '-'
            ? '-'
            : '',
    },
    {
      header: f('schedule.invoice.header.paymentmethod'),
      field: 'paymentMethod',
      sortable: false,
      alignment: 'left',
      renderer: (data) =>
        toPaymentCardType(data?.paymentCardType, data?.cardLast4Digit ?? ''),
    },
    {
      header: '',
      field: 'actions',
      sortable: false,
      alignment: 'center',
      renderer: (rowData) => (
        <IconButton
          size="small"
          onClick={() => handleDelete(rowData.scheduleId)}
          sx={{
            color: '#1976d2',
            width: '24px',
            height: '24px',
            padding: 0,
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.04)',
            },
          }}
        >
          <DeleteIcon />
        </IconButton>
      ),
    },
  ];

  return (
    <Box
      sx={{
        '& thead tr': {
          height: '44px',
        },
        '& tbody tr': {
          height: '48px',
        },
      }}
    >
      <EpayDataTable
        showTotal={false}
        colDefs={colDefs}
        data={data}
        defaultSort={undefined}
        showSelectionCheck={false}
        onSelectionChange={() => {}}
        width="100%"
        selectionPlaceholderWidth="0px"
        noDataMessage="No scheduled payments found"
        filterSelectors={
          <Grid
            container
            flexDirection="row"
            sx={{
              alignItems: { xs: 'stretch', md: 'flex-end' },
              justifyContent: 'space-between',
              columnGap: 2,
              rowGap: 2,
            }}
          >
            <Grid
              item
              xs={12}
              md="auto"
              lg="auto"
              sx={{ flexGrow: 1, minWidth: 0 }}
            >
              <Grid sx={{ maxWidth: { xs: '100%', md: '180px' } }}>
                <CompactFilterSelect
                  label={f('invoices.filters.curr')}
                  value={selectedCurrency}
                  options={currencyOptions}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                />
              </Grid>
            </Grid>
            <Grid
              item
              sx={{
                ml: { xs: 0, md: 'auto' },
                width: { xs: '100%', md: '160px' },
                flexShrink: 0,
              }}
              display="flex"
              justifyContent={{ xs: 'stretch', md: 'flex-end' }}
              alignItems="flex-end"
            >
              <EpaySelectionButton
                name={f('app.common.export')}
                data={[
                  {
                    key: 'csv',
                    value: f('app.common.export.csv.all'),
                  },
                  {
                    key: 'excel',
                    value: f('app.common.export.xlsx.all'),
                  },
                ]}
                optionKey="key"
                optionText="value"
                placeholder={f('app.common.export')}
                onSelect={(e: string) => handleExportData(e, data ?? [])}
                width="100%"
                label=""
                padding="6px 14px"
              />
            </Grid>
          </Grid>
        }
      />
    </Box>
  );
};

export default ScheduledPaymentsTable;
