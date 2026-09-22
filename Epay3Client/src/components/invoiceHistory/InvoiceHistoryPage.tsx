import {
  ChangeEvent,
  Ref,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import { AccountResponse, ErrorInfo } from 'types';

import { useTheme } from '@mui/system';
import AccountType from 'types/AccountType';
import { useAppDispatch, useAppSelector } from 'redux/hooks';
import EpayFilterIcon from 'shared/icons/EpayFilterIcon';
import { EpayDocumentType } from 'types/EpayDocumentType';
import { useEpayToast } from 'providers/EpayToastProvider';
import EpayPdfViewer from 'shared/components/EpayPdfViewer';
import InvoiceDialog from 'components/invoices/InvoiceDialog';
import { EpayInvoicesService } from 'services/EpayInvoicesService';
import { EpayPaymentService } from 'services/EpayPaymentService';
import {
  selectShowInvoiceDaysTillDue,
  selectShowInvoiceHistoryFilter,
  selectShowInvoicePdfActions,
} from 'redux/selectors/configSelectors';
import {
  useEffectiveAccount,
  useRelatedAccounts,
} from 'hooks/usePaymentHelpers';
import EpaySelectionButton from 'shared/components/EpaySelectionButton';
import { Button, Grid, useMediaQuery } from '@mui/material';
import {
  impersonatedUserSelector,
  regionalFormatSelector,
  setSelectedInvoices,
  userSelector,
} from 'redux/reducers';
import DateRangePopup from 'shared/components/DateComponents/DateRangePopUp';
import {
  Invoice,
  InvoicesSearchRequest,
  SearchFilter,
} from 'types/InvoicesSearchRequest';
import EpayDataTable from 'shared/components/EpayDataTable';
import {
  getResourceIdForInvoiceStatus,
  InvoiceStatus,
  InvoiceStatusType,
} from 'types/InvoiceStatus';
import {
  DateRangeOption,
  DateRangeOptionType,
  getResourceIdForDateRangeOption,
} from 'types/DateRangeOption';
import {
  clone,
  handleExport,
  toFormattedDateString,
} from 'utilities/utilities';
import useEpayNavigate from 'hooks/useEpayNavigate';
import { useInvoicePdfDownload } from 'hooks/useInvoicePdfDownload';
import { useCustomRangeLabel } from 'hooks/useCustomRangeLabel';
import { useInvoiceCurrencies } from 'hooks/useInvoiceCurrencies';
import { buildInvoiceColumns } from 'components/invoices/invoiceColumnDefs';
import { usePayerDetails } from 'providers/PayerDetailsProvider';
import SchedulePaymentWarningDialog from 'components/invoices/SchedulePaymentWarningDialog';

import InvoiceHistoryCardList from './InvoiceHistoryCardList';
import InvoiceHistoryFilterSelectors from './InvoiceHistoryFilterSelectors';
import { useFormat } from 'hooks/useFormat';

export type InvoiceHistoryHandle = {
  fetchData: () => void;
};

const INVOICE_HISTORY_DEFAULT_SORT = {
  field: 'dueDate',
  direction: 'asc',
} as const;

const InvoiceHistoryPage = ({ ref }: { ref?: Ref<InvoiceHistoryHandle> }) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const f = useFormat();
  const { navigate } = useEpayNavigate();
  const { effectivePayer: payer } = usePayerDetails();

  const { showToastMessage } = useEpayToast();
  const relatedAccountsLoaded = useRelatedAccounts();
  const getInvoices = EpayInvoicesService.useGetInvoices();
  const deleteScheduledPayment = EpayPaymentService.useDeleteScheduledPayment();
  const showPdfActions = useAppSelector(selectShowInvoicePdfActions);
  const showDaysTillDue = useAppSelector(selectShowInvoiceDaysTillDue);
  const showInvoiceHistoryFilter = useAppSelector(
    selectShowInvoiceHistoryFilter,
  );
  const user = useAppSelector(userSelector);
  const impersonatedUser = useAppSelector(impersonatedUserSelector);
  const regionalFormat = useAppSelector(regionalFormatSelector);
  const selectedAccount = useEffectiveAccount();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isSoldTo = impersonatedUser
    ? impersonatedUser.primaryAccountType === AccountType.SoldTo
    : user?.primaryAccountType === AccountType.SoldTo;

  const invoiceStatusOptions = [
    {
      key: InvoiceStatus.All,
      value: f(getResourceIdForInvoiceStatus(InvoiceStatus.All)),
    },
    {
      key: InvoiceStatus.Open,
      value: f(getResourceIdForInvoiceStatus(InvoiceStatus.Open)),
    },
    {
      key: InvoiceStatus.Complete,
      value: f(getResourceIdForInvoiceStatus(InvoiceStatus.Complete)),
    },
  ];

  const periodOptionsList: { key: string; value: string }[] = [
    {
      key: DateRangeOption.All,
      value: f(getResourceIdForDateRangeOption(DateRangeOption.All)),
    },
    {
      key: DateRangeOption.Today,
      value: f(getResourceIdForDateRangeOption(DateRangeOption.Today)),
    },
    {
      key: DateRangeOption.Yesterday,
      value: f(getResourceIdForDateRangeOption(DateRangeOption.Yesterday)),
    },
    {
      key: DateRangeOption.Last7Days,
      value: f(getResourceIdForDateRangeOption(DateRangeOption.Last7Days)),
    },
    {
      key: DateRangeOption.Last30Days,
      value: f(getResourceIdForDateRangeOption(DateRangeOption.Last30Days)),
    },
    {
      key: DateRangeOption.Last365Days,
      value: f(getResourceIdForDateRangeOption(DateRangeOption.Last365Days)),
    },
    {
      key: DateRangeOption.Custom,
      value: f(getResourceIdForDateRangeOption(DateRangeOption.Custom)),
    },
  ];

  const [isPreSearch, setIsPreSearch] = useState<boolean>(true);
  const [invoiceList, setInvoiceList] = useState<Invoice[]>([]);
  const [historyInvoices, setHistoryInvoices] = useState<Invoice[]>([]);
  const [relatedAccounts, setRelatedAccounts] = useState<AccountResponse[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatusType>(
    InvoiceStatus.All,
  );
  const [periodOptions, setPeriodOptions] = useState(periodOptionsList);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<Date | null | undefined>();
  const [dateTo, setDateTo] = useState<Date | null | undefined>();
  const [customRange, setCustomRange] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({
    startDate: null,
    endDate: null,
  });
  const [dueDateTo, setDueDateTo] = useState<Date | null>();
  const [dueDateFrom, setDueDateFrom] = useState<Date | null>();
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<DateRangeOptionType>(
    DateRangeOption.Last30Days,
  );
  const [previousSelectedPeriod, setPreviousSelectedPeriod] =
    useState<DateRangeOptionType>(DateRangeOption.Last30Days);
  const [selectAccount, setSelectAccount] = useState<string[]>([]);
  const [selectedSubAccounts, setSelectedSubAccounts] = useState<string[]>([]);
  const [selectedSoldTo] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice>();
  const [open, setOpen] = useState<boolean>(false);
  const [openScheduleWarning, setOpenScheduleWarning] =
    useState<boolean>(false);
  const [scheduledInvoices, setScheduledInvoices] = useState<Invoice[]>([]);
  const [popupOpen, setPopupOpen] = useState(false);
  const dateFilterRef = useRef<HTMLDivElement>(null);
  const [resetRange, setResetRange] = useState<boolean>(false);
  const [filterOpen, setFilterOpen] = useState<boolean>(true);
  const isApplyingCustomRangeRef = useRef(false);

  const { pdfUrl, pdfModalOpen, setPdfModalOpen, handlePdfDownload } =
    useInvoicePdfDownload({
      account: selectedAccount ?? { primaryAcct: '', companyCode: '' },
      isMobile,
      impersonatedUserId: impersonatedUser?.userId,
    });

  const { configuredCurrencies, currencyTypes, currencyOptions } =
    useInvoiceCurrencies({
      invoices: historyInvoices,
      subAccounts: selectedSubAccounts,
    });

  useEffect(() => {
    setInvoiceList([]);
    setHistoryInvoices([]);

    if (
      selectedAccount &&
      selectedAccount.primaryAcct &&
      relatedAccountsLoaded?.length > 0
    ) {
      setRelatedAccounts(relatedAccountsLoaded);

      const subAccounts = getSelectedAccounts(relatedAccountsLoaded);
      setSelectedSubAccounts(
        Array.isArray(subAccounts)
          ? subAccounts
          : subAccounts != null
            ? [subAccounts]
            : [],
      );

      const allAccounts = relatedAccountsLoaded.map(
        (account) => account.primaryAccount,
      );
      setSelectAccount(allAccounts);
    }

    setSelectedStatus(InvoiceStatus.All);
    setSelectedCurrency('');
    resetDateFilters();
    setInvoiceNumber('');
  }, [relatedAccountsLoaded, selectedAccount, user?.primaryAccountType]);

  useEffect(() => {
    if (currencyTypes.length === 0) {
      if (selectedCurrency !== '') {
        setSelectedCurrency('');
      }
      return;
    }

    const hasSelectedCurrency = currencyTypes.includes(selectedCurrency);
    if (!hasSelectedCurrency) {
      setSelectedCurrency(currencyTypes[0] ?? '');
    }
  }, [currencyTypes, selectedCurrency]);

  const onInvoiceValueChange = (e) => {
    setInvoiceNumber(e.target.value);
  };

  const resetCustomRangeSelection = () => {
    setCustomRange({
      startDate: null,
      endDate: null,
    });
    setPeriodOptions([...periodOptionsList]);
  };

  const {
    handleDateDraftStartChange,
    setCommittedRangeLabel,
    restoreCustomPeriodLabel,
  } = useCustomRangeLabel({ setPeriodOptions, regionalFormat, f });

  const clearDateFilters = () => {
    setDueDateFrom(null);
    setDueDateTo(null);
    setDateFrom(null);
    setDateTo(null);
    resetCustomRangeSelection();
  };

  const resetDateFilters = () => {
    setResetRange((prev) => !prev);
    setPopupOpen(false);
    clearDateFilters();

    handlePeriodChange({
      target: { value: DateRangeOption.Last30Days },
    } as ChangeEvent<HTMLInputElement>);
  };

  const handleStatusChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newStatus = e.target.value as InvoiceStatusType;
    setSelectedStatus(newStatus);
  };

  useEffect(() => {
    if (selectedStatus) {
      resetDateFilters();
    }
  }, [selectedStatus]);

  const handleMenuItemClick = (value) => {
    if (value === DateRangeOption.Custom) {
      setPopupOpen(true);
    }
  };

  const updateDates = (from: Date | null, to: Date | null) => {
    setDateFrom(from);
    setDateTo(to);

    if (selectedStatus === InvoiceStatus.Open) {
      setDueDateFrom(new Date('1800-01-01'));
      setDueDateTo(new Date('9999-12-31'));
    }
  };

  const handlePeriodChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedValue = e.target.value as DateRangeOptionType;
    setSelectedPeriod(selectedValue);

    const today = new Date();
    const pastDate = (days: string) => {
      const daysNumber = parseInt(days, 10);
      return isNaN(daysNumber)
        ? null
        : new Date(new Date().setDate(today.getDate() - daysNumber));
    };

    switch (selectedValue) {
      case DateRangeOption.All:
        setPreviousSelectedPeriod(selectedValue);
        clearDateFilters();
        updateDates(new Date('1800-01-01'), new Date('9999-12-31'));
        break;
      case DateRangeOption.Today:
        setPreviousSelectedPeriod(selectedValue);
        clearDateFilters();
        updateDates(today, today);
        break;
      case DateRangeOption.Yesterday:
        setPreviousSelectedPeriod(selectedValue);
        clearDateFilters();
        updateDates(pastDate(DateRangeOption.Yesterday), today);
        break;
      case DateRangeOption.Last7Days:
        setPreviousSelectedPeriod(selectedValue);
        clearDateFilters();
        updateDates(pastDate(DateRangeOption.Last7Days), today);
        break;
      case DateRangeOption.Last30Days:
        setPreviousSelectedPeriod(selectedValue);
        clearDateFilters();
        updateDates(pastDate(DateRangeOption.Last30Days), today);
        break;
      case DateRangeOption.Last365Days:
        setPreviousSelectedPeriod(selectedValue);
        clearDateFilters();
        updateDates(pastDate(DateRangeOption.Last365Days), today);
        break;
      case DateRangeOption.Custom:
        if (selectedPeriod !== DateRangeOption.Custom) {
          setPreviousSelectedPeriod(selectedPeriod);
        }
        setPopupOpen(true);
        break;
      default:
        setPreviousSelectedPeriod(DateRangeOption.Last30Days);
        clearDateFilters();
        updateDates(null, null);
        break;
    }
  };

  const handleChange = () => {
    if (selectAccount.length === 0) {
      showToastMessage('warning', f('invoicehistory.page.accounts.warning'));
      return;
    }
    if (selectedStatus === InvoiceStatus.Open && (!dueDateFrom || !dueDateTo)) {
      showToastMessage('error', f('payment_history.error.due'));
      return;
    }
    const currentSelectedSubAccounts = getCurrentSelectedSubAccounts();
    const normalizedSubAccounts = Array.isArray(currentSelectedSubAccounts)
      ? currentSelectedSubAccounts
      : [currentSelectedSubAccounts];
    setSelectedSubAccounts(normalizedSubAccounts);
    getData(normalizedSubAccounts);
  };

  useImperativeHandle(ref, () => ({
    fetchData: () => {
      handleChange();
    },
  }));

  const getSelectedAccounts = (resp: AccountResponse[]) => {
    if (resp && resp.length > 0) {
      const filtered = resp.filter((x) => x.selected === true);
      const selected = filtered.map((x) => x.primaryAccount);

      const primaryAccountType = impersonatedUser
        ? impersonatedUser.primaryAccountType
        : user?.primaryAccountType;
      if (primaryAccountType === AccountType.Payer) {
        return selected;
      } else {
        if (selected && selected.length > 0) {
          return selected[0];
        } else {
          return resp[0].primaryAccount;
        }
      }
    }

    return null;
  };

  const getCurrentSelectedSubAccounts = (selectedAccounts = selectAccount) => {
    const primaryAccountType = impersonatedUser
      ? impersonatedUser.primaryAccountType
      : user?.primaryAccountType;

    if (!selectedAccounts || selectedAccounts.length === 0) {
      return primaryAccountType === AccountType.Payer ? [] : '';
    }

    return primaryAccountType === AccountType.Payer
      ? selectedAccounts
      : selectedAccounts[0];
  };

  const getData = (subAccounts = selectedSubAccounts) => {
    const primaryAccountType = impersonatedUser
      ? impersonatedUser.primaryAccountType
      : user?.primaryAccountType;
    const normalizedSelectedAccounts = Array.isArray(subAccounts)
      ? subAccounts
      : subAccounts
        ? [subAccounts]
        : [];
    const filters: SearchFilter[] = [];
    if (invoiceNumber) {
      filters.push({
        filterType: '01',
        value: invoiceNumber,
      });
    }
    const request: InvoicesSearchRequest = {
      documentType: EpayDocumentType.Invoice,
      status: selectedStatus,
      userId: impersonatedUser ? impersonatedUser.userId : user?.userId,
      selectedAccount: selectedAccount?.primaryAcct ?? '',
      companyCode: selectedAccount?.companyCode,
      salesOrganization: selectedAccount?.salesOrganization,
      subAccounts:
        primaryAccountType === AccountType.Payer
          ? normalizedSelectedAccounts
          : normalizedSelectedAccounts,
      dueDateFrom: dueDateFrom || undefined,
      dueDateTo: dueDateTo || undefined,
      from: dateFrom || undefined,
      to: dateTo || undefined,
      currencyKey: 'All',
      excludePayments: true,
      excludeCredits: true,
      filters: filters,
    };
    getInvoices(request)
      .then(
        (resp: Invoice[]) => {
          setHistoryInvoices(resp);
          const responseCurrencyTypes = [
            ...new Set(
              (resp ?? [])
                .map((invoice) => invoice.currencyKey)
                .filter((currency): currency is string => Boolean(currency)),
            ),
          ].sort();
          const effectiveCurrencyTypes =
            responseCurrencyTypes.length > 0
              ? responseCurrencyTypes
              : configuredCurrencies.map((currency) => currency.code);
          const resolvedCurrency =
            selectedCurrency &&
            effectiveCurrencyTypes.includes(selectedCurrency)
              ? selectedCurrency
              : (effectiveCurrencyTypes[0] ?? '');
          if (resolvedCurrency !== selectedCurrency) {
            setSelectedCurrency(resolvedCurrency);
          }
          const currencyFilter = showInvoiceHistoryFilter
            ? resolvedCurrency
            : '';

          let results = clone(resp);
          if (!results) return;

          if (normalizedSelectedAccounts.length > 0) {
            results = results.filter((item) =>
              normalizedSelectedAccounts.includes(
                item.soldtoNumber?.replace(/^0+/, ''),
              ),
            );
          }

          if (selectedSoldTo) {
            if (selectedSoldTo.length === 0) {
              return;
            }
            results = results.filter((item) => {
              const soldtoNumber = item.soldtoNumber
                ? item.soldtoNumber.replace(/^0+/, '')
                : '';
              const containsNumber = selectedSoldTo.includes(soldtoNumber);
              return containsNumber;
            });
          }

          if (invoiceNumber !== '' || currencyFilter) {
            results = results.filter((invoice) => {
              const billingDocumentNumber = invoice.billingDocumentNumber
                ? invoice.billingDocumentNumber.replace(/^0+/, '')
                : '';
              let matchesInvoiceNumber = true;
              let matchesCurrencyType = true;

              if (invoiceNumber !== '') {
                matchesInvoiceNumber =
                  billingDocumentNumber !== null &&
                  invoiceNumber === billingDocumentNumber;
              }

              if (currencyFilter) {
                matchesCurrencyType = invoice.currencyKey === currencyFilter;
              }

              return matchesInvoiceNumber && matchesCurrencyType;
            });
          }

          setInvoiceList(results);
        },
        (error: ErrorInfo) => {
          setInvoiceList([]);
          setHistoryInvoices([]);
          if (error.message !== 'No Content')
            showToastMessage('error', error.message);
        },
      )
      .finally(() => {
        setIsPreSearch(false);
      });
  };

  const handleSubmit = (data: Invoice) => {
    setSelectedInvoice(data);
    setOpen(true);
  };

  const handleExportData = (option: string, data: Invoice[]) => {
    handleExport(
      option,
      data,
      showInvoiceHistoryFilter ? { currencyType: selectedCurrency } : {},
      showDaysTillDue,
      undefined,
      regionalFormat,
    );
  };

  const handleInvoicePreview = (Invoice) => {
    setSelectedInvoice(Invoice);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const mapInvoiceForPayment = (invoice: Invoice): Invoice => ({
    ...invoice,
    billingDocumentNumber: invoice.billingDocumentNumber
      ? invoice.billingDocumentNumber
      : invoice.documentNumberFinance,
  });

  const handlePayInvoice = () => {
    if (!selectedInvoice) {
      return;
    }

    if (selectedInvoice.scheduledId) {
      setScheduledInvoices([selectedInvoice]);
      setOpen(false);
      setOpenScheduleWarning(true);
      return;
    }

    dispatch(setSelectedInvoices([mapInvoiceForPayment(selectedInvoice)]));
    navigate('/payment/session', {
      state: { payer },
    });
  };

  const deleteScheduledPaymentsIfAny = async (
    invoices: Invoice[],
  ): Promise<boolean> => {
    try {
      const deletions = invoices
        .filter((inv) => inv.scheduledId)
        .map((inv) =>
          deleteScheduledPayment(
            inv.scheduledId!,
            selectedAccount?.companyCode ?? '',
            selectedAccount?.primaryAcct ?? '',
            payer,
            impersonatedUser?.userId,
          ),
        );

      await Promise.all(deletions);
      return true;
    } catch {
      showToastMessage('error', f('schedule.error.delete'));
      return false;
    }
  };

  const deleteAndProceed = async () => {
    setOpenScheduleWarning(false);
    const deleted = await deleteScheduledPaymentsIfAny(scheduledInvoices);
    if (!deleted || !selectedInvoice) {
      return;
    }

    dispatch(setSelectedInvoices([mapInvoiceForPayment(selectedInvoice)]));
    navigate('/payment/session', {
      state: { payer },
    });
  };

  const handleScheduleWarningClose = () => {
    setOpenScheduleWarning(false);
  };

  const handlePopupClose = () => {
    if (isApplyingCustomRangeRef.current) {
      isApplyingCustomRangeRef.current = false;
      setPopupOpen(false);
      return;
    }

    const hasSelectedCustomRange =
      !!customRange.startDate && !!customRange.endDate;

    // Undo any partial "start - " text the field showed while picking.
    restoreCustomPeriodLabel(customRange);

    if (selectedPeriod === DateRangeOption.Custom && !hasSelectedCustomRange) {
      setSelectedPeriod(previousSelectedPeriod);
    }
    setPopupOpen(false);
  };

  const handleDateRangeSelect = (range) => {
    const startDate = new Date(range.startDate);
    const endDate = new Date(range.endDate);

    isApplyingCustomRangeRef.current = true;
    setSelectedPeriod(DateRangeOption.Custom);
    updateDates(startDate, endDate);
    setCustomRange({
      startDate,
      endDate,
    });

    setCommittedRangeLabel(startDate, endDate);
  };

  const colDefs = buildInvoiceColumns({
    f,
    theme,
    regionalFormat,
    showPdfActions,
    showDaysTillDue,
    onDocumentClick: handleSubmit,
    onPdfDownload: handlePdfDownload,
    statusColumnHeaderId: 'invoices.table.status',
    documentColumnHeaderId: 'invoices.table.invoice',
  });

  const setSelectedSubAccountsWrapped = (value: string[] | string) =>
    setSelectedSubAccounts(Array.isArray(value) ? value : [value]);

  const buildFilterProps = (isCardFilter: boolean) => ({
    isCardFilter,
    isSoldTo,
    relatedAccounts,
    impersonatedUser,
    user,
    selectAccount,
    selectedStatus,
    selectedPeriod,
    selectedCurrency,
    showCurrencyFilter: showInvoiceHistoryFilter,
    invoiceNumber,
    currencyOptions,
    invoiceStatusOptions,
    periodOptions,
    invoiceList,
    f,
    onInvoiceValueChange,
    setSelectAccount,
    setSelectedSubAccounts: setSelectedSubAccountsWrapped,
    handleStatusChange,
    handlePeriodChange,
    handleMenuItemClick,
    setSelectedCurrency,
    handleExportData,
  });

  if (!user) {
    return null;
  }

  return (
    <Grid container spacing={2} direction="column" marginTop="0rem">
      <Grid item display={{ xs: 'none', md: 'flex' }}>
        <EpayDataTable
          colDefs={colDefs}
          data={invoiceList}
          isPreSearch={isPreSearch}
          preSearchMessage={f('presearch.nodata')}
          noDataMessage={f('invoices.nodata')}
          showTotal={false}
          defaultSort={INVOICE_HISTORY_DEFAULT_SORT}
          width="100%"
          filterSelectors={
            <InvoiceHistoryFilterSelectors
              {...buildFilterProps(false)}
              dateFilterRef={dateFilterRef}
              dateFilterActive={popupOpen}
            />
          }
        />

        <DateRangePopup
          open={popupOpen}
          onClose={handlePopupClose}
          onSelect={handleDateRangeSelect}
          onDraftStartChange={handleDateDraftStartChange}
          resetRange={resetRange}
          anchorRef={dateFilterRef}
          selectedRange={{
            startDate: customRange.startDate,
            endDate: customRange.endDate,
          }}
        />
        <InvoiceDialog
          open={open}
          onClose={handleClose}
          onPayInvoice={handlePayInvoice}
          selectedInvoice={selectedInvoice}
        />
      </Grid>
      <Grid item flexDirection="column">
        <Grid item display={{ xs: 'block', md: 'none' }}>
          <InvoiceHistoryCardList
            data={invoiceList}
            width="100%"
            isPreSearch={isPreSearch}
            preSearchMessage={f('presearch.nodata')}
            noDataMessage={f('invoices.nodata')}
            showPdfActions={showPdfActions}
            handlePdfDownload={handlePdfDownload}
            handleInvoicePreview={handleInvoicePreview}
            filterSelectors={
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
                      onSelect={(e: string) => handleExportData(e, invoiceList)}
                      width="100%"
                      label=""
                    />
                  </Grid>
                </Grid>
                {filterOpen && (
                  <InvoiceHistoryFilterSelectors
                    {...buildFilterProps(filterOpen)}
                  />
                )}
              </>
            }
          />
        </Grid>
      </Grid>

      <EpayPdfViewer
        open={pdfModalOpen}
        pdfUrl={pdfUrl}
        onClose={() => setPdfModalOpen(false)}
      />
      <SchedulePaymentWarningDialog
        open={openScheduleWarning}
        onClose={handleScheduleWarningClose}
        scheduledInvoices={scheduledInvoices}
        onDeleteAndProceed={deleteAndProceed}
      />
    </Grid>
  );
};

export default InvoiceHistoryPage;
