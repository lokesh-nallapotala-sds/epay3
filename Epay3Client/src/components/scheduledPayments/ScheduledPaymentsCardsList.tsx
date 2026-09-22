import { ReactNode } from 'react';

import { useTheme } from '@mui/system';
import DeleteIcon from '@mui/icons-material/Delete';
import { Grid, IconButton, Typography } from '@mui/material';
import {
  MobileCardFieldGrid,
  MobileCardFieldRowProps,
  MobileCardHeader,
  MobileCardShell,
} from 'shared/components/common/MobileCardPrimitives';
import { mobileCardStyles } from 'shared/components/common/mobileCardStyles';
import MobileCardListShell from 'shared/components/common/MobileCardListShell';
import { usePaginatedCardList } from 'shared/components/common/usePaginatedCardList';
import ExportSelectionButton from 'shared/components/ExportSelectionButton';
import CompactFilterSelect from 'shared/components/CompactFilterSelect';
import {
  handleExport,
  removeLeadingZeros,
  toCurrencyString,
  toFormattedDateString,
  toPaymentCardType,
} from '../../utilities/utilities';
import { Invoice } from 'types/InvoicesSearchRequest';
import { useFormat } from 'hooks/useFormat';

// Mock data structure for scheduled payments
interface ScheduledPayment {
  scheduleId: string;
  invoice: string;
  openAmount: number;
  amountToPay: number;
  dateToPay: string;
  paymentMethod: string;
  paymentCardType?: string;
  cardLast4Digit?: string;
  currencyKey: string;
}

interface ScheduledPaymentsCardsListProps {
  data: ScheduledPayment[];
  width?: string | null;
  noDataMessage?: string;
  onPageChange?: (e: number) => void;
  onSelectionChange?: (e: ScheduledPayment[]) => void;
  filterSelectors?: ReactNode;
  onDelete?: (scheduleId: string) => void;
  isNew: string;
  selectedCurrency;
  currencyOptions;
  setSelectedCurrency;
  regionalFormat?: string | null;
}

interface ScheduledPaymentCardProps {
  data: ScheduledPayment;
  width: string;
  onDelete?: (scheduleId: string) => void;
  isNew: string;
  selectedCurrency: string;
  currencyOptions: { key: string; value: string }[];
  setSelectedCurrency: (value: string) => void;
  regionalFormat?: string | null;
}

const ScheduledPaymentCard = ({
  data,
  width,
  onDelete,
  isNew,
  regionalFormat,
}: ScheduledPaymentCardProps) => {
  const f = useFormat();
  const theme = useTheme();

  const leftRows: MobileCardFieldRowProps[] = [
    {
      label: `${f('schedule.invoice.header.mobile.scheduleid')}:`,
      value: (
        <>
          {data.scheduleId}
          {data.scheduleId === isNew && (
            <Typography
              component="span"
              sx={{
                color: theme.palette.error.main,
                fontWeight: 'bold',
                fontSize: 'inherit',
                ml: 0.5,
              }}
            >
              {f('schedule.invoice.new')}
            </Typography>
          )}
        </>
      ),
      testId: 'scheduled-payment-card-scheduleid',
    },
    {
      label: `${f('mobile.card.payon')}:`,
      value:
        data.dateToPay && data.dateToPay !== '-'
          ? toFormattedDateString(data.dateToPay, regionalFormat)
          : data.dateToPay === '-'
            ? '-'
            : '',
      testId: 'scheduled-payment-card-datetopay',
    },
  ];

  const rightRows: MobileCardFieldRowProps[] = [
    {
      label: `${f('mobile.card.method')}:`,
      value: toPaymentCardType(
        data.paymentCardType ?? '',
        data.cardLast4Digit ?? '',
      ),
      testId: 'scheduled-payment-card-method',
    },
    {
      label: `${f('invoices.table.open')}:`,
      value: toCurrencyString(
        data.currencyKey,
        data.openAmount,
        true,
        regionalFormat,
      ),
      testId: 'scheduled-payment-card-open',
    },
    {
      label: `${f('mobile.card.topay')}:`,
      value: toCurrencyString(
        data.currencyKey,
        data.amountToPay,
        true,
        regionalFormat,
      ),
      emphasis: true,
      testId: 'scheduled-payment-card-amounttopay',
    },
  ];

  return (
    <MobileCardShell width={width}>
      <MobileCardHeader
        content={
          <>
            <Typography
              component="span"
              variant="body2"
              sx={{
                fontSize: mobileCardStyles.typography.titleFontSize,
                fontWeight: mobileCardStyles.typography.titleFontWeight,
                lineHeight: 1.2,
              }}
            >
              {f('invoices.table.invoice')}
            </Typography>
            <Typography
              component="span"
              variant="body2"
              sx={{
                fontSize: mobileCardStyles.typography.titleFontSize,
                fontWeight: mobileCardStyles.typography.valueFontWeight,
                lineHeight: 1.2,
              }}
            >
              {removeLeadingZeros(data.invoice)}
            </Typography>
          </>
        }
        action={
          onDelete ? (
            <IconButton
              onClick={() => onDelete(data.scheduleId)}
              aria-label={f('schedule.invoice.header.scheduleid')}
              sx={{
                padding: 0,
                color: theme.palette.interactiveColor,
                '&:hover': {
                  color: theme.palette.error.main,
                  backgroundColor: 'transparent',
                },
              }}
            >
              <DeleteIcon />
            </IconButton>
          ) : undefined
        }
      />

      <MobileCardFieldGrid
        left={leftRows}
        right={rightRows}
        compact
        leftLabelWidth="68px"
      />
    </MobileCardShell>
  );
};

export default function ScheduledPaymentsCardsList({
  data,
  filterSelectors,
  noDataMessage,
  onPageChange,
  onDelete,
  isNew,
  selectedCurrency,
  currencyOptions,
  setSelectedCurrency,
  regionalFormat,
}: ScheduledPaymentsCardsListProps) {
  const f = useFormat();

  const {
    currentDataSet,
    totalPages,
    currentPage,
    itemsPerPage,
    setItemsPerPage,
    handlePageChange,
  } = usePaginatedCardList(data, { onPageChange });

  const handleExportData = (option: string, exportData: ScheduledPayment[]) => {
    handleExport(
      option,
      exportData as unknown as Invoice[],
      currentDataSet as unknown as { currencyKey?: string },
      false,
      true,
      regionalFormat,
    );
  };

  const headerSlot = (
    <Grid container spacing={2} sx={{ padding: '1rem 5%' }} alignItems="end">
      <Grid item xs={6} sm={4} md={3}>
        <CompactFilterSelect
          label={f('invoices.filters.curr')}
          value={selectedCurrency}
          options={currencyOptions}
          onChange={(e) => setSelectedCurrency(e.target.value)}
          sx={{ mt: 0.5 }}
        />
      </Grid>

      <Grid item xs={6} sm={4} md={3}>
        <ExportSelectionButton
          onSelect={(e: string) => handleExportData(e, currentDataSet)}
        />
      </Grid>
    </Grid>
  );

  return (
    <MobileCardListShell
      hasData={!!data && data.length > 0}
      totalPages={totalPages}
      currentPage={currentPage}
      itemsPerPage={itemsPerPage}
      onPageChange={handlePageChange}
      onItemsPerPageChange={setItemsPerPage}
      headerSlot={headerSlot}
      filterSelectors={filterSelectors}
      pagerSx={{ padding: '0 2%' }}
      pagerEdgePadding={false}
      noDataMessage={noDataMessage}
      bottomMargin="0"
    >
      {currentDataSet.map((item) => (
        <ScheduledPaymentCard
          key={item.scheduleId}
          data={item}
          width="90%"
          onDelete={onDelete}
          isNew={isNew}
          selectedCurrency={selectedCurrency}
          currencyOptions={currencyOptions}
          setSelectedCurrency={setSelectedCurrency}
          regionalFormat={regionalFormat}
        />
      ))}
    </MobileCardListShell>
  );
}
