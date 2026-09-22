import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';

import * as fs from 'file-saver';
import { useIntl } from 'react-intl';

import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import AccountType from 'types/AccountType';
import { DateRangeOption, DateRangeOptionType } from 'types/DateRangeOption';
import { Invoice, InvoiceFilterState } from 'types/InvoicesSearchRequest';
import { AccountResponse } from 'types/AccountResponse';
import EpayFilterIcon from 'shared/icons/EpayFilterIcon';
import { clone, handleExport } from 'utilities/utilities';
import EpayDropDown from 'shared/components/EpayDropDown';
import CompactFilterSelect from 'shared/components/CompactFilterSelect';
import { useAppDispatch, useAppSelector } from 'redux/hooks';
import { InvoiceBulkPdfRequest } from 'types/InvoiceBulkPdfRequest';
import { useEpayToast } from 'providers/EpayToastProvider';
import EpaySelectionButton from 'shared/components/EpaySelectionButton';
import { EpayInvoicesService } from 'services/EpayInvoicesService';
import DateRangePopup from 'shared/components/DateComponents/DateRangePopUp';
import { useCustomRangeLabel } from 'hooks/useCustomRangeLabel';
import {
  impersonatedUserSelector,
  regionalFormatSelector,
  setPaymentCurrency,
  userSelector,
} from 'redux/reducers';

interface InvoiceFiltersProps {
  subAccounts?: AccountResponse[] | null;
  currencies?: string[];
  filters?: InvoiceFilterState;
  isMobile?: boolean;
  onChange: (filters: InvoiceFilterState, requery: boolean) => void;
  data: Invoice[];
  selectedInvoices: Invoice[];
  showPdfActions?: boolean;
  showDaysTillDue?: boolean;
}

interface PeriodOption {
  key: string;
  value: string;
}

interface DateRangeState {
  startDate: Date | null;
  endDate: Date | null;
}

const DATE_MIN = new Date('1900-01-01');

const createPeriodOptions = (f: (id: string) => string): PeriodOption[] => [
  { key: DateRangeOption.All, value: f('app.common.date_range.all') },
  { key: DateRangeOption.Today, value: f('app.common.date_range.today') },
  {
    key: DateRangeOption.Yesterday,
    value: f('app.common.date_range.yesterday'),
  },
  {
    key: DateRangeOption.Last7Days,
    value: f('app.common.date_range.last_7_days'),
  },
  {
    key: DateRangeOption.Last30Days,
    value: f('app.common.date_range.last_30_days'),
  },
  {
    key: DateRangeOption.Last365Days,
    value: f('app.common.date_range.last_365_days'),
  },
  { key: DateRangeOption.Custom, value: f('app.common.date_range.custom') },
];

const createPresetRange = (
  selectedValue: DateRangeOptionType,
): { from: Date | null; to: Date | null } => {
  const today = new Date();
  const pastDate = (days: string) => {
    const daysNumber = parseInt(days, 10);
    return isNaN(daysNumber)
      ? null
      : new Date(new Date().setDate(today.getDate() - daysNumber));
  };

  switch (selectedValue) {
    case DateRangeOption.All:
      return { from: null, to: null };
    case DateRangeOption.Today:
      return { from: today, to: today };
    case DateRangeOption.Yesterday:
      return { from: pastDate(DateRangeOption.Yesterday), to: today };
    case DateRangeOption.Last7Days:
      return { from: pastDate(DateRangeOption.Last7Days), to: today };
    case DateRangeOption.Last30Days:
      return { from: pastDate(DateRangeOption.Last30Days), to: today };
    case DateRangeOption.Last365Days:
      return { from: pastDate(DateRangeOption.Last365Days), to: today };
    default:
      return { from: null, to: null };
  }
};

export default function InvoiceFilters({
  subAccounts,
  currencies,
  filters,
  onChange,
  data,
  selectedInvoices,
  showDaysTillDue,
}: InvoiceFiltersProps) {
  const intl = useIntl();
  const f = useCallback((id: string) => intl.formatMessage({ id: id }), [intl]);

  const dispatch = useAppDispatch();
  const getPdf = EpayInvoicesService.useGetBulkPdf();
  const { showToastMessage } = useEpayToast();

  const currentUser = useAppSelector(userSelector);
  const impersonatedUser = useAppSelector(impersonatedUserSelector);
  const regionalFormat = useAppSelector(regionalFormatSelector);
  const selectedAccount = useAppSelector(
    (state) => state.account.selectedAccount,
  );

  const [filterOpen, setFilterOpen] = useState(false);
  const [internalFilters, setInternalFilters] = useState<InvoiceFilterState>();
  const [invoicesData, setInvoicesData] = useState(data);
  const [currency, setCurrency] = useState<string>('');
  const [datePeriodOptions, setDatePeriodOptions] = useState<PeriodOption[]>(
    () => createPeriodOptions(f),
  );
  const [duePeriodOptions, setDuePeriodOptions] = useState<PeriodOption[]>(() =>
    createPeriodOptions(f),
  );
  const [selectedDatePeriod, setSelectedDatePeriod] =
    useState<DateRangeOptionType>(DateRangeOption.All);
  const [selectedDuePeriod, setSelectedDuePeriod] =
    useState<DateRangeOptionType>(DateRangeOption.All);
  const [previousDatePeriod, setPreviousDatePeriod] =
    useState<DateRangeOptionType>(DateRangeOption.All);
  const [previousDuePeriod, setPreviousDuePeriod] =
    useState<DateRangeOptionType>(DateRangeOption.All);
  const [datePopupOpen, setDatePopupOpen] = useState(false);
  const [duePopupOpen, setDuePopupOpen] = useState(false);
  const [resetDateRange, setResetDateRange] = useState(false);
  const [resetDueRange, setResetDueRange] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<DateRangeState>({
    startDate: null,
    endDate: null,
  });
  const [customDueRange, setCustomDueRange] = useState<DateRangeState>({
    startDate: null,
    endDate: null,
  });
  const dateFilterRef = useRef<HTMLDivElement>(null);
  const dueFilterRef = useRef<HTMLDivElement>(null);
  const isApplyingDateRangeRef = useRef(false);
  const isApplyingDueRangeRef = useRef(false);

  const isSoldTo = impersonatedUser
    ? impersonatedUser?.primaryAccountType === AccountType.SoldTo
    : currentUser?.primaryAccountType === AccountType.SoldTo;

  const {
    handleDateDraftStartChange: handleDateDraftStartChange,
    setCommittedRangeLabel: setCommittedDateRangeLabel,
    restoreCustomPeriodLabel: restoreCustomDateLabel,
  } = useCustomRangeLabel({
    setPeriodOptions: setDatePeriodOptions,
    regionalFormat,
    f,
  });

  const {
    handleDateDraftStartChange: handleDueDraftStartChange,
    setCommittedRangeLabel: setCommittedDueRangeLabel,
    restoreCustomPeriodLabel: restoreCustomDueLabel,
  } = useCustomRangeLabel({
    setPeriodOptions: setDuePeriodOptions,
    regionalFormat,
    f,
  });

  useEffect(() => {
    if (!filters) {
      return;
    }

    setInternalFilters(filters);
    setCurrency(filters.currencyType ?? '');
    setInvoicesData(data);

    const nextDateOptions = createPeriodOptions(f);
    const nextDueOptions = createPeriodOptions(f);
    const nextSelectedDatePeriod =
      filters.selectedDatePeriod ?? DateRangeOption.All;
    const nextSelectedDuePeriod =
      filters.selectedDuePeriod ?? DateRangeOption.All;
    const nextCustomDateRange = {
      startDate: filters.from ?? null,
      endDate: filters.to ?? null,
    };
    const nextCustomDueRange = {
      startDate: filters.dueDateFrom ?? null,
      endDate: filters.dueDateTo ?? null,
    };

    setDatePeriodOptions(nextDateOptions);
    setDuePeriodOptions(nextDueOptions);
    setSelectedDatePeriod(nextSelectedDatePeriod);
    setSelectedDuePeriod(nextSelectedDuePeriod);
    setPreviousDatePeriod(nextSelectedDatePeriod);
    setPreviousDuePeriod(nextSelectedDuePeriod);
    setCustomDateRange(nextCustomDateRange);
    setCustomDueRange(nextCustomDueRange);

    if (
      nextSelectedDatePeriod === DateRangeOption.Custom &&
      nextCustomDateRange.startDate &&
      nextCustomDateRange.endDate
    ) {
      setCommittedDateRangeLabel(
        nextCustomDateRange.startDate,
        nextCustomDateRange.endDate,
      );
    }

    if (
      nextSelectedDuePeriod === DateRangeOption.Custom &&
      nextCustomDueRange.startDate &&
      nextCustomDueRange.endDate
    ) {
      setCommittedDueRangeLabel(
        nextCustomDueRange.startDate,
        nextCustomDueRange.endDate,
      );
    }
  }, [data, f, filters]);

  let internalCurrencies: { key: string; value: string }[] = [];

  if (currencies) {
    internalCurrencies = currencies.map((currency) => {
      return {
        key: currency,
        value: currency === 'All' ? f('invoice.status.all') : currency,
      };
    });
  }

  const selectPartner = (selected: unknown) => {
    const newFilters = clone(internalFilters) ?? {};
    newFilters.subAccounts = selected as string[] | string | null;
    onChange(newFilters, false);
  };

  const selectCurrency = (selectedCurrency: unknown) => {
    const newFilters = clone(internalFilters) ?? {};
    newFilters.currencyType = selectedCurrency as string;
    dispatch(setPaymentCurrency(selectedCurrency as string));
    onChange(newFilters, false);
  };

  const applyPresetPeriod = (
    type: 'date' | 'due',
    selectedValue: DateRangeOptionType,
  ) => {
    const newFilters = clone(internalFilters) ?? {};
    const range = createPresetRange(selectedValue);

    if (type === 'date') {
      setSelectedDatePeriod(selectedValue);
      setPreviousDatePeriod(selectedValue);
      setDatePopupOpen(false);
      setResetDateRange((prev) => !prev);
      setCustomDateRange({ startDate: null, endDate: null });
      newFilters.selectedDatePeriod = selectedValue;
      newFilters.from = range.from;
      newFilters.to = range.to;
    } else {
      setSelectedDuePeriod(selectedValue);
      setPreviousDuePeriod(selectedValue);
      setDuePopupOpen(false);
      setResetDueRange((prev) => !prev);
      setCustomDueRange({ startDate: null, endDate: null });
      newFilters.selectedDuePeriod = selectedValue;
      newFilters.dueDateFrom = range.from;
      newFilters.dueDateTo = range.to;
    }

    onChange(newFilters, false);
  };

  const handlePeriodChange =
    (type: 'date' | 'due') => (e: ChangeEvent<HTMLInputElement>) => {
      const selectedValue = e.target.value as DateRangeOptionType;

      if (selectedValue === DateRangeOption.Custom) {
        if (type === 'date') {
          if (selectedDatePeriod !== DateRangeOption.Custom) {
            setPreviousDatePeriod(selectedDatePeriod);
          }
          setSelectedDatePeriod(DateRangeOption.Custom);
          setDatePopupOpen(true);
        } else {
          if (selectedDuePeriod !== DateRangeOption.Custom) {
            setPreviousDuePeriod(selectedDuePeriod);
          }
          setSelectedDuePeriod(DateRangeOption.Custom);
          setDuePopupOpen(true);
        }
        return;
      }

      applyPresetPeriod(type, selectedValue);
    };

  const handleMenuItemClick = (type: 'date' | 'due') => (value: string) => {
    if (value !== DateRangeOption.Custom) {
      return;
    }

    if (type === 'date') {
      setDatePopupOpen(true);
      return;
    }

    setDuePopupOpen(true);
  };

  const handlePopupClose = (type: 'date' | 'due') => {
    if (type === 'date') {
      if (isApplyingDateRangeRef.current) {
        isApplyingDateRangeRef.current = false;
        setDatePopupOpen(false);
        return;
      }

      restoreCustomDateLabel(customDateRange);
      if (
        selectedDatePeriod === DateRangeOption.Custom &&
        (!customDateRange.startDate || !customDateRange.endDate)
      ) {
        setSelectedDatePeriod(previousDatePeriod);
      }
      setDatePopupOpen(false);
      return;
    }

    if (isApplyingDueRangeRef.current) {
      isApplyingDueRangeRef.current = false;
      setDuePopupOpen(false);
      return;
    }

    restoreCustomDueLabel(customDueRange);
    if (
      selectedDuePeriod === DateRangeOption.Custom &&
      (!customDueRange.startDate || !customDueRange.endDate)
    ) {
      setSelectedDuePeriod(previousDuePeriod);
    }
    setDuePopupOpen(false);
  };

  const handleDateRangeSelect =
    (type: 'date' | 'due') => (range: { startDate: Date; endDate: Date }) => {
      const startDate = new Date(range.startDate);
      const endDate = new Date(range.endDate);
      const newFilters = clone(internalFilters) ?? {};

      if (type === 'date') {
        isApplyingDateRangeRef.current = true;
        setSelectedDatePeriod(DateRangeOption.Custom);
        setPreviousDatePeriod(DateRangeOption.Custom);
        setCustomDateRange({
          startDate,
          endDate,
        });
        newFilters.selectedDatePeriod = DateRangeOption.Custom;
        newFilters.from = startDate;
        newFilters.to = endDate;
        setCommittedDateRangeLabel(startDate, endDate);
      } else {
        isApplyingDueRangeRef.current = true;
        setSelectedDuePeriod(DateRangeOption.Custom);
        setPreviousDuePeriod(DateRangeOption.Custom);
        setCustomDueRange({
          startDate,
          endDate,
        });
        newFilters.selectedDuePeriod = DateRangeOption.Custom;
        newFilters.dueDateFrom = startDate;
        newFilters.dueDateTo = endDate;
        setCommittedDueRangeLabel(startDate, endDate);
      }

      onChange(newFilters, false);
    };

  const handleExportData = (option, exportData) => {
    switch (option) {
      case 'csv':
      case 'excel':
        handleExport(
          option,
          exportData,
          filters ?? {},
          showDaysTillDue,
          undefined,
          regionalFormat,
        );
        break;
      case 'All':
        handlePDFdownload(invoicesData);
        break;
      case 'selected':
        handlePDFdownload(selectedInvoices);
        break;
      default:
        break;
    }
  };

  const handlePDFdownload = async (invoices: Invoice[]) => {
    try {
      if (!selectedAccount) {
        return;
      }

      const bulkRequests: InvoiceBulkPdfRequest[] = invoices.map((item) => ({
        documentNumber: item.billingDocumentNumber
          ? item.billingDocumentNumber
          : '',
        customerNumber: item.soldtoNumber ? item.soldtoNumber : '',
        primaryAccount: selectedAccount.primaryAcct
          ? selectedAccount.primaryAcct
          : '',
        billingDocs: item.billingDocumentNumber
          ? item.billingDocumentNumber
          : '',
      }));

      getPdf(bulkRequests).then(
        async (resp) => {
          const blob = await resp.blob();
          const contentDisposition = resp.headers.get('Content-Disposition');
          const stringArray = contentDisposition?.split(';');
          fs.saveAs(blob, stringArray?.[1]?.split('=')[1]);
        },
        (error) => {
          showToastMessage('error', error);
        },
      );
    } catch {}
  };

  const accountField =
    !isSoldTo && subAccounts && internalFilters ? (
      <EpayDropDown
        multi={isSoldTo ? false : true}
        data={subAccounts as unknown as Record<string, unknown>[]}
        value={internalFilters?.subAccounts}
        renderer={(dropdownData) =>
          `${dropdownData.primaryAccount} ${dropdownData.name}`
        }
        optionKey="primaryAccount"
        optionText="primaryAccount"
        width="100%"
        onSelect={(e: unknown) => {
          selectPartner(e);
        }}
        label={f('invoices.table.account')}
      />
    ) : null;

  const currencyField = (
    <CompactFilterSelect
      label={f('invoices.filters.curr')}
      value={currency}
      options={internalCurrencies}
      onChange={(e) => selectCurrency(e.target.value)}
    />
  );

  const dateField = (
    <CompactFilterSelect
      label={f('invoices.filters.Date')}
      value={selectedDatePeriod}
      options={datePeriodOptions}
      onChange={handlePeriodChange('date')}
      onItemClick={handleMenuItemClick('date')}
      active={datePopupOpen}
    />
  );

  const dueField = (
    <CompactFilterSelect
      label={f('invoices.table.due')}
      value={selectedDuePeriod}
      options={duePeriodOptions}
      onChange={handlePeriodChange('due')}
      onItemClick={handleMenuItemClick('due')}
      active={duePopupOpen}
    />
  );

  const exportButton = (
    <EpaySelectionButton
      name="Export"
      data={[
        { key: 'All', value: f('app.common.export.pdf.all') },
        { key: 'selected', value: f('app.common.export.pdf.selected') },
        { key: 'csv', value: f('app.common.export.csv.all') },
        { key: 'excel', value: f('app.common.export.xlsx.all') },
      ]}
      optionKey="key"
      optionText="value"
      placeholder={f('app.common.export')}
      onSelect={(e: string) => handleExportData(e, invoicesData)}
      width="100%"
      padding="6px 14px"
    />
  );

  if (!currentUser) {
    return null;
  }

  return (
    <>
      <Grid container flexDirection="column" rowGap={2}>
        <Grid container spacing={1} display={{ xs: 'flex', md: 'none' }}>
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
            {exportButton}
          </Grid>
        </Grid>

        {filterOpen && (
          <Grid
            container
            flexDirection="column"
            rowGap={2}
            display={{ xs: 'flex', md: 'none' }}
          >
            {accountField && (
              <Grid item xs={12}>
                {accountField}
              </Grid>
            )}
            <Grid item xs={12}>
              {currencyField}
            </Grid>
            <Grid item xs={12} ref={dateFilterRef}>
              {dateField}
            </Grid>
            <Grid item xs={12} ref={dueFilterRef}>
              {dueField}
            </Grid>
          </Grid>
        )}

        <Grid
          container
          flexDirection="row"
          flexWrap="nowrap"
          columnGap={2}
          display={{ xs: 'none', md: 'flex' }}
          sx={{ alignItems: 'flex-end' }}
        >
          <Grid
            item
            container
            flexWrap="nowrap"
            columnGap={2}
            rowGap={0}
            sx={{ flex: 1, minWidth: 0, alignItems: 'flex-end' }}
          >
            {accountField && (
              <Grid
                item
                sx={{
                  flex: {
                    md: '1 1 200px',
                    lg: '1 1 260px',
                  },
                  minWidth: 0,
                  maxWidth: {
                    md: '320px',
                    lg: '360px',
                  },
                }}
              >
                {accountField}
              </Grid>
            )}
            <Grid
              item
              sx={{
                flex: {
                  md: '0 1 110px',
                  lg: '0 1 130px',
                },
                minWidth: 0,
              }}
            >
              {currencyField}
            </Grid>
            <Grid
              item
              ref={dateFilterRef}
              sx={{
                flex: {
                  md: '0 1 190px',
                  lg: '0 1 190px',
                },
                marginRight: { md: '40px' },
                minWidth: 0,
              }}
            >
              {dateField}
            </Grid>
            <Grid
              item
              ref={dueFilterRef}
              sx={{
                flex: {
                  md: '0 1 190px',
                  lg: '0 1 190px',
                },
                marginRight: { md: '40px' },
                minWidth: 0,
              }}
            >
              {dueField}
            </Grid>
          </Grid>
          <Grid
            item
            display="flex"
            justifyContent="flex-end"
            sx={{ width: '160px', ml: 'auto', flexShrink: 0 }}
          >
            {exportButton}
          </Grid>
        </Grid>
      </Grid>

      <DateRangePopup
        open={datePopupOpen}
        onClose={() => handlePopupClose('date')}
        onSelect={handleDateRangeSelect('date')}
        onDraftStartChange={handleDateDraftStartChange}
        resetRange={resetDateRange}
        anchorRef={dateFilterRef}
        selectedRange={customDateRange}
      />

      <DateRangePopup
        open={duePopupOpen}
        onClose={() => handlePopupClose('due')}
        onSelect={handleDateRangeSelect('due')}
        onDraftStartChange={handleDueDraftStartChange}
        resetRange={resetDueRange}
        anchorRef={dueFilterRef}
        selectedRange={customDueRange}
      />
    </>
  );
}
