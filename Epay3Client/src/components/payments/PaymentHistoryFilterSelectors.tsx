import { ChangeEvent, memo } from 'react';
import type { Ref } from 'react';
import { Grid, TextField, Typography } from '@mui/material';
import { AccountResponse } from 'types';
import EpayDropDown from 'shared/components/EpayDropDown';
import CompactFilterSelect from 'shared/components/CompactFilterSelect';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';
import ExportSelectionButton from 'shared/components/ExportSelectionButton';
import AccountType from 'types/AccountType';
import { DateRangeOption, DateRangeOptionType } from 'types/DateRangeOption';
import { PaymentHistoryRow } from 'types/InvoicesSearchRequest';
import { LoggedInUser } from 'types/LoggedInUser';
import { UserView } from 'types/User';

interface Props {
  isCardFilter: boolean;
  isSoldTo: boolean;
  relatedAccounts: AccountResponse[];
  impersonatedUser: UserView | null;
  user: LoggedInUser | null;
  selectAccount: string[];
  selectedCurrency: string;
  showCurrencyFilter: boolean;
  selectedPeriod: DateRangeOptionType;
  invoiceNumber: string;
  currencyOptions: { key: string; value: string }[];
  periodOptions: { key: string; value: string }[];
  f: (id: string) => string;
  setSelectAccount: (value: string[]) => void;
  setSelectedSubAccounts: (value: string[] | string) => void;
  setSelectedCurrency: (value: string) => void;
  onInvoiceValueChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handlePeriodChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleMenuItemClick: (value: string) => void;
  handleExportData: (option: string, data: PaymentHistoryRow[]) => void;
  invoiceList: PaymentHistoryRow[];
  dateFilterRef?: Ref<HTMLDivElement>;
  dateFilterActive?: boolean;
}

const PaymentHistoryFilterSelectors = ({
  isCardFilter,
  isSoldTo,
  relatedAccounts,
  impersonatedUser,
  user,
  selectAccount,
  selectedCurrency,
  showCurrencyFilter,
  selectedPeriod,
  invoiceNumber,
  currencyOptions,
  periodOptions,
  f,
  setSelectAccount,
  setSelectedSubAccounts,
  setSelectedCurrency,
  onInvoiceValueChange,
  handlePeriodChange,
  handleMenuItemClick,
  handleExportData,
  invoiceList,
  dateFilterRef,
  dateFilterActive,
}: Props) => {
  const isLastDaysPeriod =
    selectedPeriod === DateRangeOption.Last7Days ||
    selectedPeriod === DateRangeOption.Last30Days ||
    selectedPeriod === DateRangeOption.Last365Days;
  const dateFilterWidth =
    selectedPeriod === DateRangeOption.Custom
      ? '240px'
      : isLastDaysPeriod
        ? '170px'
        : '136px';
  const tabletColumns = [
    !isSoldTo ? 'minmax(150px, 170px)' : null,
    `minmax(${dateFilterWidth}, ${dateFilterWidth})`,
    showCurrencyFilter ? 'minmax(105px, 105px)' : null,
    'minmax(150px, 180px)',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Grid
      container
      alignItems={{ xs: 'stretch', sm: 'center', md: 'flex-start' }}
      sx={{
        display: { xs: 'flex', md: 'grid' },
        flexDirection: { xs: 'column', sm: 'row' },
        flexWrap: 'wrap',
        rowGap: 2,
        columnGap: '10px',
        gridTemplateColumns: {
          md: !isCardFilter ? 'minmax(0, 1fr) 160px' : 'minmax(0, 1fr)',
        },
        alignItems: { md: 'end' },
      }}
    >
      <Grid item xs={12} md sx={{ minWidth: 0 }}>
        <Grid
          container
          alignItems={{ xs: 'stretch', sm: 'center', md: 'flex-end' }}
          sx={{
            display: { xs: 'flex', md: 'grid' },
            flexDirection: { xs: 'column', sm: 'row' },
            flexWrap: 'wrap',
            rowGap: { xs: 2, md: '12px' },
            columnGap: { sm: '12px', md: '16px' },
            gridTemplateColumns: { md: tabletColumns },
          }}
        >
          {!isSoldTo && (
            <Grid item xs={12} md="auto" sx={{ width: '100%', minWidth: 0 }}>
              <EpayDropDown
                multi
                data={relatedAccounts as unknown as Record<string, unknown>[]}
                optionKey="primaryAccount"
                optionText="primaryAccount"
                value={selectAccount}
                renderer={(data) => `${data.primaryAccount} ${data.name}`}
                label={f('invoices.table.account')}
                width="100%"
                onSelect={(newSelected) => {
                  const selected = newSelected as string[];
                  setSelectAccount(selected);

                  const primaryAccountType = impersonatedUser
                    ? impersonatedUser.primaryAccountType
                    : user?.primaryAccountType;

                  if (primaryAccountType === AccountType.Payer) {
                    setSelectedSubAccounts(selected);
                  } else {
                    setSelectedSubAccounts(selected?.[0] ?? '');
                  }
                }}
              />
            </Grid>
          )}

          <Grid
            item
            xs={12}
            md="auto"
            ref={isCardFilter ? undefined : dateFilterRef}
            sx={{ width: '100%', minWidth: 0 }}
          >
            <CompactFilterSelect
              label={f('invoices.filters.Date')}
              value={selectedPeriod}
              options={periodOptions}
              onChange={handlePeriodChange}
              onItemClick={handleMenuItemClick}
              active={dateFilterActive && !isCardFilter}
            />
          </Grid>

          {showCurrencyFilter && (
            <Grid item xs={12} md="auto" sx={{ width: '100%', minWidth: 0 }}>
              <CompactFilterSelect
                label={f('invoices.filters.curr')}
                value={selectedCurrency}
                options={currencyOptions}
                onChange={(e) => setSelectedCurrency(e.target.value)}
              />
            </Grid>
          )}

          <Grid item xs={12} md="auto" sx={{ width: '100%', minWidth: 0 }}>
            <Grid container direction="column" rowGap=".3rem">
              <Grid item>
                <Typography variant="fieldHeader">
                  {f('payment_history.invoice_number')}
                </Typography>
              </Grid>
              <Grid item>
                <TextField
                  type="text"
                  size="small"
                  fullWidth
                  sx={getCompactFilterFieldSx}
                  value={invoiceNumber}
                  onChange={onInvoiceValueChange}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {!isCardFilter && (
        <Grid
          item
          xs={12}
          md="auto"
          sx={{
            width: { xs: '100%', md: '160px' },
            minWidth: 0,
            justifySelf: { md: 'end' },
          }}
        >
          <Grid
            container
            direction="column"
            rowGap=".3rem"
            alignItems={{ xs: 'stretch', md: 'flex-end' }}
          >
            <Grid item>
              <Typography variant="fieldHeader">&nbsp;</Typography>
            </Grid>
            <Grid item sx={{ width: { xs: '100%', md: '160px' } }}>
              <ExportSelectionButton
                onSelect={(e: string) => handleExportData(e, invoiceList)}
                height="32px !important"
              />
            </Grid>
          </Grid>
        </Grid>
      )}
    </Grid>
  );
};

const MemoizedPaymentHistoryFilterSelectors = memo(
  PaymentHistoryFilterSelectors,
);

export default MemoizedPaymentHistoryFilterSelectors;
