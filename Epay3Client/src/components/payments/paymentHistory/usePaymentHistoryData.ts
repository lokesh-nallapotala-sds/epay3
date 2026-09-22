import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ChangeEvent, Ref } from 'react';

import AccountType from 'types/AccountType';
import { AccountResponse } from 'types';
import { EpayDocumentType } from 'types/EpayDocumentType';
import { LoggedInUser } from 'types/LoggedInUser';
import { UserView } from 'types/User';
import CompanyCodeDetail from 'types/SapConfig/CompanyCodeDetail';
import {
  Invoice,
  InvoicesSearchRequest,
  PaymentHistoryRow,
  PaymentInvoice,
  paymentList,
  SearchFilter,
} from 'types/InvoicesSearchRequest';
import {
  DateRangeOption,
  DateRangeOptionType,
  getResourceIdForDateRangeOption,
} from 'types/DateRangeOption';
import { InvoiceStatus, InvoiceStatusType } from 'types/InvoiceStatus';
import { getConfiguredCurrenciesForAccounts } from 'utilities/currency';
import { useCustomRangeLabel } from 'hooks/useCustomRangeLabel';
import {
  clone,
  handlePaymentExport,
  toFormattedDateString,
} from 'utilities/utilities';

import {
  filterPaymentsBySelectedAccounts,
  prepareTableData,
} from './paymentHistoryHelpers';

export type InvoiceHistoryHandle = {
  fetchData: () => void;
};

interface UsePaymentHistoryDataParams {
  ref?: Ref<InvoiceHistoryHandle>;
  f: (id: string) => string;
  user: LoggedInUser | null;
  impersonatedUser: UserView | null;
  selectedAccount: ReturnType<
    typeof import('hooks/usePaymentHelpers').useEffectiveAccount
  >;
  relatedAccountsLoaded: AccountResponse[];
  showPaymentHistoryFilter: boolean;
  companyCodes: CompanyCodeDetail[];
  regionalFormat?: string | null;
  getPaymentHistory: (
    request: InvoicesSearchRequest,
  ) => Promise<PaymentInvoice>;
  showToastMessage: (
    type: 'error' | 'success' | 'info' | 'warning',
    message: string,
    showIndefinite?: boolean,
  ) => void;
}

export function usePaymentHistoryData({
  ref,
  f,
  user,
  impersonatedUser,
  selectedAccount,
  relatedAccountsLoaded,
  showPaymentHistoryFilter,
  companyCodes,
  regionalFormat,
  getPaymentHistory,
  showToastMessage,
}: UsePaymentHistoryDataParams) {
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
  const [invoiceList, setInvoiceList] = useState<PaymentHistoryRow[]>([]);
  const [paymentHistoryList, setPaymentHistoryList] = useState<paymentList[]>(
    [],
  );
  const [relatedAccounts, setRelatedAccounts] = useState<AccountResponse[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatusType>(
    InvoiceStatus.None,
  );
  const [periodOptions, setPeriodOptions] = useState(periodOptionsList);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [customRange, setCustomRange] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({
    startDate: null,
    endDate: null,
  });
  const [popupOpen, setPopupOpen] = useState(false);
  const [dueDateTo] = useState<Date | null>();
  const [dueDateFrom] = useState<Date | null>();
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<DateRangeOptionType>(
    DateRangeOption.Last30Days,
  );
  const [previousSelectedPeriod, setPreviousSelectedPeriod] =
    useState<DateRangeOptionType>(DateRangeOption.Last30Days);
  const [selectAccount, setSelectAccount] = useState<string[]>([]);
  const [selectedSubAccounts, setSelectedSubAccounts] = useState<string[]>([]);
  const [selectedSoldTo] = useState('');
  const [resetRange, setResetRange] = useState<boolean>(false);
  const [filterOpen, setFilterOpen] = useState<boolean>(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice>();
  const [open, setOpen] = useState<boolean>(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentHistoryRow>();
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] =
    useState<boolean>(false);
  const isApplyingCustomRangeRef = useRef(false);

  const configuredCurrencies = useMemo(
    () =>
      getConfiguredCurrenciesForAccounts(
        companyCodes,
        selectedAccount,
        relatedAccountsLoaded,
        selectedSubAccounts,
      ),
    [companyCodes, relatedAccountsLoaded, selectedAccount, selectedSubAccounts],
  );

  const paymentCurrencyTypes = useMemo(
    () =>
      [
        ...new Set(
          paymentHistoryList
            .flatMap((payment) => [
              payment.currencyKey,
              ...(payment.sdInvoices ?? []).map(
                (invoice) => invoice.currencyKey,
              ),
            ])
            .filter(Boolean),
        ),
      ].sort(),
    [paymentHistoryList],
  );

  const currencyTypes = useMemo(
    () =>
      paymentCurrencyTypes.length > 0
        ? paymentCurrencyTypes
        : configuredCurrencies.map((currency) => currency.code),
    [configuredCurrencies, paymentCurrencyTypes],
  );

  const currencyOptions = useMemo(
    () =>
      currencyTypes.map((currency) => ({
        key: currency,
        value: currency,
      })),
    [currencyTypes],
  );

  const isSoldTo = impersonatedUser
    ? impersonatedUser.primaryAccountType === AccountType.SoldTo
    : user?.primaryAccountType === AccountType.SoldTo;

  useEffect(() => {
    setInvoiceList([]);
    setPaymentHistoryList([]);

    if (
      selectedAccount &&
      selectedAccount.primaryAcct &&
      relatedAccountsLoaded?.length > 0
    ) {
      setRelatedAccounts(relatedAccountsLoaded);

      const objFilters: Record<string, unknown> = {};
      objFilters.selectedAccount = selectedAccount.primaryAcct;
      objFilters.subAccounts = getSelectedAccounts(relatedAccountsLoaded);
      objFilters.subType = user?.primaryAccountType;

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

    const lastThirtyDays = new Date();
    const today = new Date();
    lastThirtyDays.setDate(today.getDate() - 30);
    setDateFrom(lastThirtyDays);
    setDateTo(today);
    setCustomRange({
      startDate: null,
      endDate: null,
    });
    setSelectedPeriod(DateRangeOption.Last30Days);
    setPreviousSelectedPeriod(DateRangeOption.Last30Days);
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

  const onInvoiceValueChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInvoiceNumber(e.target.value);
  };

  const resetCustomRangeSelection = () => {
    setCustomRange({
      startDate: null,
      endDate: null,
    });
    setPeriodOptions(periodOptionsList);
  };

  const {
    handleDateDraftStartChange,
    setCommittedRangeLabel,
    restoreCustomPeriodLabel,
  } = useCustomRangeLabel({ setPeriodOptions, regionalFormat, f });

  const handleMenuItemClick = (value: string) => {
    if (value === DateRangeOption.Custom) {
      setPopupOpen(true);
    }
  };

  const handlePeriodChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedValue = e.target.value as DateRangeOptionType;
    setSelectedPeriod(selectedValue);
    const today = new Date();
    if (selectedValue === DateRangeOption.Custom) {
      if (selectedPeriod !== DateRangeOption.Custom) {
        setPreviousSelectedPeriod(selectedPeriod);
      }
      setPopupOpen(true);
      return;
    }

    setPreviousSelectedPeriod(selectedValue);
    setResetRange((prev) => !prev);
    resetCustomRangeSelection();

    switch (selectedValue) {
      case DateRangeOption.All: {
        setDateFrom(new Date('1800-01-01'));
        setDateTo(new Date('9999-12-31'));
        break;
      }
      case DateRangeOption.Today: {
        setDateFrom(today);
        setDateTo(today);
        break;
      }
      case DateRangeOption.Yesterday: {
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        setDateFrom(yesterday);
        setDateTo(today);
        break;
      }
      case DateRangeOption.Last7Days: {
        const lastSevenDays = new Date();
        lastSevenDays.setDate(today.getDate() - 7);
        setDateFrom(lastSevenDays);
        setDateTo(today);
        break;
      }
      case DateRangeOption.Last30Days: {
        const lastThirtyDays = new Date();
        lastThirtyDays.setDate(today.getDate() - 30);
        setDateFrom(lastThirtyDays);
        setDateTo(today);
        break;
      }
      case DateRangeOption.Last365Days: {
        const lastOneYear = new Date();
        lastOneYear.setDate(today.getDate() - 365);
        setDateFrom(lastOneYear);
        setDateTo(today);
        break;
      }
      default: {
        setDateFrom(null);
        setDateTo(null);
        break;
      }
    }
  };

  const handleChange = () => {
    const currentSelectedSubAccounts = getCurrentSelectedSubAccounts();
    const normalizedSubAccounts = Array.isArray(currentSelectedSubAccounts)
      ? currentSelectedSubAccounts
      : [currentSelectedSubAccounts];
    setSelectedSubAccounts(normalizedSubAccounts);
    getData(normalizedSubAccounts);
  };

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
    const selectedSoldToAccounts =
      primaryAccountType === AccountType.SoldTo && selectedAccount?.primaryAcct
        ? [selectedAccount.primaryAcct]
        : normalizedSelectedAccounts;
    const filters: SearchFilter[] = [];
    if (invoiceNumber) {
      filters.push({
        filterType: '01',
        value: invoiceNumber,
      });
    }
    const request: InvoicesSearchRequest = {
      documentType: EpayDocumentType.Payment,
      status: selectedStatus,
      userId: impersonatedUser ? impersonatedUser.userId : user?.userId,
      selectedAccount: selectedAccount?.primaryAcct ?? '',
      companyCode: selectedAccount?.companyCode,
      subAccounts:
        primaryAccountType === AccountType.Payer
          ? normalizedSelectedAccounts
          : normalizedSelectedAccounts,
      from: dateFrom ? dateFrom : undefined,
      to: dateTo ? dateTo : undefined,
      dueDateFrom: dueDateFrom ? dueDateFrom : undefined,
      dueDateTo: dueDateTo ? dueDateTo : undefined,
      currencyKey: 'All',
      filters: filters,
    };

    getPaymentHistory(request)
      .then(
        (resp: PaymentInvoice) => {
          setPaymentHistoryList(resp.paymentList);
          const responseCurrencyTypes = [
            ...new Set(
              (resp.paymentList ?? [])
                .flatMap((payment) => [
                  payment.currencyKey,
                  ...(payment.sdInvoices ?? []).map(
                    (invoice) => invoice.currencyKey,
                  ),
                ])
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
          const currencyFilter = showPaymentHistoryFilter
            ? resolvedCurrency
            : '';

          let results = clone(resp.paymentList) ?? [];

          results = filterPaymentsBySelectedAccounts(
            results,
            normalizedSelectedAccounts,
            selectedSoldToAccounts,
          );

          if (selectedSoldTo) {
            if (selectedSoldTo.length === 0) {
              return;
            }
            results = results.filter((item) => {
              const sdInvoices = item.sdInvoices || [];
              let containsNumber = false;

              sdInvoices.forEach((subInvoice) => {
                const soldtoNumber = subInvoice.soldtoNumber
                  ? subInvoice.soldtoNumber.replace(/^0+/, '')
                  : '';
                if (selectedSoldTo.includes(soldtoNumber)) {
                  containsNumber = true;
                }
              });

              return containsNumber;
            });
          }

          if (invoiceNumber !== '' || currencyFilter) {
            results = results.filter((invoice) => {
              const sdInvoices = invoice.sdInvoices || [];
              let matchesInvoiceNumber = true;
              let matchesCurrencyType = true;

              sdInvoices.forEach((subInvoice) => {
                const billingDocumentNumber = subInvoice.billingDocumentNumber
                  ? subInvoice.billingDocumentNumber.replace(/^0+/, '')
                  : '';
                if (invoiceNumber !== '') {
                  matchesInvoiceNumber =
                    billingDocumentNumber !== null &&
                    invoiceNumber === billingDocumentNumber;
                }
              });

              if (currencyFilter) {
                matchesCurrencyType = invoice.currencyKey === currencyFilter;
              }

              return matchesInvoiceNumber && matchesCurrencyType;
            });
          }
          const filteredData = prepareTableData(results, regionalFormat);
          setInvoiceList(filteredData);
        },
        (error) => {
          setInvoiceList([]);
          setPaymentHistoryList([]);
          showToastMessage('error', error);
        },
      )
      .finally(() => {
        setIsPreSearch(false);
      });
  };

  const handleExportData = (option: string, data: PaymentHistoryRow[]) => {
    handlePaymentExport(option as 'csv' | 'excel', data, regionalFormat);
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

  const handleDateRangeSelect = (range: { startDate: Date; endDate: Date }) => {
    const startDate = new Date(range.startDate);
    const endDate = new Date(range.endDate);

    isApplyingCustomRangeRef.current = true;
    setSelectedPeriod(DateRangeOption.Custom);
    setDateFrom(startDate);
    setDateTo(endDate);
    setCustomRange({
      startDate,
      endDate,
    });
    setCommittedRangeLabel(startDate, endDate);
  };

  const handleSubmit = (data: PaymentHistoryRow) => {
    setSelectedInvoice({
      billingDocumentNumber: data.billingDocumentNumber,
      currencyKey: data.currencyKey,
      documentDate: data.documentDate,
      documentNumberFinance: data.documentNumberFinance,
      paymentAmount: data.paidAmountRaw,
      referenceNumber: data.referenceNumber,
      soldtoNumber: data.soldtoNumber,
    });
    setOpen(true);
  };

  const handlePaymentDetailsOpen = (data: PaymentHistoryRow) => {
    setSelectedPayment(data);
    setIsPaymentDialogOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handlePaymentDialogClose = () => {
    setIsPaymentDialogOpen(false);
  };

  useImperativeHandle(ref, () => ({
    fetchData: () => {
      handleChange();
    },
  }));

  const setSelectedSubAccountsWrapped = (value: string[] | string) =>
    setSelectedSubAccounts(Array.isArray(value) ? value : [value]);

  const buildFilterProps = (isCardFilter: boolean) => ({
    isCardFilter,
    isSoldTo,
    relatedAccounts,
    impersonatedUser,
    user,
    selectAccount,
    selectedCurrency,
    showCurrencyFilter: showPaymentHistoryFilter,
    selectedPeriod,
    invoiceNumber,
    currencyOptions,
    periodOptions,
    f,
    setSelectAccount,
    setSelectedSubAccounts: setSelectedSubAccountsWrapped,
    setSelectedCurrency,
    onInvoiceValueChange,
    handlePeriodChange,
    handleMenuItemClick,
    handleExportData,
    invoiceList,
  });

  return {
    isPreSearch,
    invoiceList,
    regionalFormat,
    popupOpen,
    resetRange,
    customRange,
    filterOpen,
    setFilterOpen,
    selectedInvoice,
    open,
    selectedPayment,
    isPaymentDialogOpen,
    handleExportData,
    handlePopupClose,
    handleDateRangeSelect,
    handleDateDraftStartChange,
    handleSubmit,
    handlePaymentDetailsOpen,
    handleClose,
    handlePaymentDialogClose,
    buildFilterProps,
  };
}
