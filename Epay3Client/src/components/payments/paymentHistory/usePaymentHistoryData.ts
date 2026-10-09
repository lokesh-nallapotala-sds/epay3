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
  toCurrencyString,
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

  const fetchStripeCharges = async (
    targetAccountId?: string,
    targetCustomerId?: string,
    createdGte?: number,
    createdLte?: number,
  ): Promise<any[]> => {
    try {
      let resolvedCustomerId = targetCustomerId;

      // 1. Resolve Stripe Customer ID if accountId is available
      if (targetAccountId && !resolvedCustomerId) {
        try {
          const custRes = await fetch(
            `/api/stripe/customer-payment-methods/${encodeURIComponent(targetAccountId)}`,
            { credentials: 'include' },
          );
          if (custRes.ok) {
            const custData = await custRes.json();
            const cid =
              custData?.customer?.id ||
              custData?.customerId ||
              (typeof custData?.customer === 'string'
                ? custData.customer
                : null);
            if (cid && typeof cid === 'string' && cid.startsWith('cus_')) {
              resolvedCustomerId = cid;
            }
          }
        } catch (custErr) {
          console.warn('Could not resolve Stripe customer for account:', custErr);
        }
      }

      // 2. Build charges URL
      let url = '/api/stripe/charges?limit=100';
      if (resolvedCustomerId && resolvedCustomerId.startsWith('cus_')) {
        url += `&customerId=${encodeURIComponent(resolvedCustomerId)}`;
      } else if (targetAccountId) {
        url += `&accountId=${encodeURIComponent(targetAccountId)}`;
      }
      if (createdGte && createdGte > 0) {
        url += `&createdGte=${createdGte}&created_gte=${createdGte}`;
      }
      if (createdLte && createdLte > 0) {
        url += `&createdLte=${createdLte}&created_lte=${createdLte}`;
      }

      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const raw = await res.json();
        const data =
          raw?.data || raw?.charges?.data || (Array.isArray(raw) ? raw : []);
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }

      // 3. Fallback: query with date bounds across all charges if account-specific returned empty
      let fallbackUrl = '/api/stripe/charges?limit=100';
      if (createdGte && createdGte > 0) {
        fallbackUrl += `&createdGte=${createdGte}&created_gte=${createdGte}`;
      }
      if (createdLte && createdLte > 0) {
        fallbackUrl += `&createdLte=${createdLte}&created_lte=${createdLte}`;
      }

      if (url !== fallbackUrl) {
        const fallbackRes = await fetch(fallbackUrl, {
          credentials: 'include',
        });
        if (fallbackRes.ok) {
          const fallbackRaw = await fallbackRes.json();
          const fallbackData =
            fallbackRaw?.data ||
            fallbackRaw?.charges?.data ||
            (Array.isArray(fallbackRaw) ? fallbackRaw : []);
          if (Array.isArray(fallbackData) && fallbackData.length > 0) {
            return fallbackData;
          }
        }
      }

      // 4. Secondary fallback: query all charges if date bounds were restrictive
      if (createdGte || createdLte) {
        const allRes = await fetch('/api/stripe/charges?limit=100', {
          credentials: 'include',
        });
        if (allRes.ok) {
          const allRaw = await allRes.json();
          const allData =
            allRaw?.data ||
            allRaw?.charges?.data ||
            (Array.isArray(allRaw) ? allRaw : []);
          if (Array.isArray(allData) && allData.length > 0) {
            return allData;
          }
        }
      }
    } catch (err) {
      console.warn('Error fetching Stripe charges:', err);
    }
    return [];
  };

  const mapStripeChargeToPaymentHistoryRow = (
    charge: any,
    fallbackAccount: string,
  ): PaymentHistoryRow => {
    const pmd = charge.payment_method_details || charge.paymentMethodDetails;
    let paymentCardType = 'Card';
    let cardLast4 = '';

    if (pmd?.card) {
      const card = pmd.card;
      paymentCardType = card.brand
        ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1)
        : 'Card';
      cardLast4 = card.last4 || '';
    } else if (pmd?.us_bank_account || pmd?.usBankAccount) {
      const bank = pmd.us_bank_account || pmd.usBankAccount;
      paymentCardType = bank.bank_name || bank.bankName || 'Bank';
      cardLast4 = bank.last4 || '';
    } else if (pmd?.type) {
      paymentCardType = pmd.type.charAt(0).toUpperCase() + pmd.type.slice(1);
    } else if (charge.source?.brand) {
      paymentCardType =
        charge.source.brand.charAt(0).toUpperCase() +
        charge.source.brand.slice(1);
      cardLast4 = charge.source.last4 || '';
    }

    // Extract invoice number
    let invoiceNum =
      charge.metadata?.invoiceNumber ||
      charge.metadata?.invoice_number ||
      charge.metadata?.invoice ||
      '';

    if (!invoiceNum && charge.description) {
      const match = charge.description.match(
        /(?:invoice|inv|bill)\s*(?:#|no\.?|num\.?)?\s*([A-Za-z0-9_-]+)/i,
      );
      if (match && match[1]) {
        invoiceNum = match[1];
      } else if (/^\d{5,12}$/.test(charge.description.trim())) {
        invoiceNum = charge.description.trim();
      }
    }

    if (!invoiceNum) {
      invoiceNum = 'Deposit';
    }

    // Account number resolution
    let chargeAcc =
      charge.metadata?.accountNumber ||
      charge.metadata?.account_number ||
      '';

    if (!chargeAcc && charge.metadata?.accountId) {
      const metaAccId = String(charge.metadata.accountId).trim();
      if (selectedAccount?.accountId && metaAccId === selectedAccount.accountId) {
        chargeAcc = selectedAccount.primaryAcct || '';
      }
      if (!chargeAcc && relatedAccountsLoaded?.length) {
        const found = relatedAccountsLoaded.find(
          (a) =>
            (a as any).accountId === metaAccId ||
            a.primaryAccount === metaAccId ||
            a.primaryAccount.replace(/^0+/, '') === metaAccId.replace(/^0+/, ''),
        );
        if (found) chargeAcc = found.primaryAccount;
      }
      if (!chargeAcc && !metaAccId.startsWith('001')) {
        chargeAcc = metaAccId;
      }
    }

    if (!chargeAcc) {
      chargeAcc = fallbackAccount || selectedAccount?.primaryAcct || '';
    }

    const amountVal = charge.amount != null ? charge.amount / 100 : 0;
    const currencyKey = (charge.currency || 'USD').toUpperCase();
    const createdDate = charge.created
      ? new Date(charge.created * 1000).toISOString()
      : new Date().toISOString();

    const docNum = 
      charge.metadata?.invoiceNumber ||
      charge.metadata?.invoice_number ||
      charge.metadata?.invoice ||
      charge.id || '';
    const refNum =
      charge.metadata?.invoiceNumber ||
      charge.metadata?.invoice_number ||
      charge.metadata?.invoice ||
      charge.payment_intent ||
      charge.paymentIntentId ||
      charge.metadata?.paymentId ||
      charge.receipt_number ||
      charge.id ||
      '';

    const paymentData: paymentList = {
      documentNumberFinance: docNum,
      billingDocumentNumber: invoiceNum,
      financeDocumentType: 'DZ',
      referenceNumber: refNum,
      fiscalYearOfTheRelevantInvoice: new Date(createdDate).getFullYear(),
      payerNumber: chargeAcc,
      postingDate: createdDate,
      documentDate: createdDate,
      currencyKey: currencyKey,
      paidAmount: amountVal,
      itemText: charge.description || `Payment for invoice ${invoiceNum}`,
      authorizationNumber: '',
      authorizationReferenceCode: refNum,
      authorizationAmount: amountVal,
      paymentMethod: paymentCardType,
      paymentCardType: paymentCardType,
      paymentCardToken: '',
      paymentCardName:
        charge.billing_details?.name || charge.billingDetails?.name || '',
      validTo: '',
      cardLast4Digit: cardLast4,
      appliedCreditAmount: charge.amount_refunded
        ? charge.amount_refunded / 100
        : 0,
      soldtoNumber: Number(chargeAcc) || undefined,
      sdInvoices:
        invoiceNum !== 'Deposit'
          ? [
              {
                billingDocumentNumber: invoiceNum,
                billingDocumentType: 'F2',
                salesOrganization: '',
                distributionChannel: '',
                division: '',
                referenceNumber: refNum,
                currencyKey: currencyKey,
                postingDate: createdDate,
                documentDate: createdDate,
                dueDate: createdDate,
                daysInArrears: 0,
                totalAmount: amountVal,
                openAmount: 0,
                paidAmount: amountVal,
                pdfDocumentAvailable: 'X',
                soldtoNumber: chargeAcc,
                currentPaidAmount: amountVal.toString(),
              },
            ]
          : [],
    };

    return {
      documentNumberFinance: docNum,
      referenceNumber: refNum,
      billingDocumentNumber: invoiceNum,
      documentDate: createdDate,
      paidAmount: toCurrencyString(
        currencyKey,
        amountVal,
        false,
        regionalFormat,
      ),
      paymentCardType: paymentCardType,
      paymentCardToken: '',
      soldtoNumber: chargeAcc.replace(/^0+/, ''),
      currencyKey: currencyKey,
      paidAmountRaw: amountVal,
      appliedCreditAmount: paymentData.appliedCreditAmount ?? 0,
      paymentData: paymentData,
      CardLast4Digit: cardLast4,
    };
  };

  const getData = async (subAccounts = selectedSubAccounts) => {
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

    const defaultAccountNum = selectedAccount?.primaryAcct || '';
    const activeAccountNum =
      normalizedSelectedAccounts.length === 1
        ? normalizedSelectedAccounts[0]
        : defaultAccountNum;
    const targetAccountId =
      activeAccountNum || selectedAccount?.accountId || undefined;

    // Date range bounds for Stripe query in Unix seconds
    let createdGte: number | undefined = undefined;
    let createdLte: number | undefined = undefined;

    if (selectedPeriod !== DateRangeOption.All) {
      if (dateFrom) {
        const fTime = new Date(dateFrom).setHours(0, 0, 0, 0);
        if (!isNaN(fTime) && new Date(dateFrom).getFullYear() > 1900) {
          createdGte = Math.floor(fTime / 1000);
        }
      }
      if (dateTo) {
        const tTime = new Date(dateTo).setHours(23, 59, 59, 999);
        if (!isNaN(tTime) && new Date(dateTo).getFullYear() < 9000) {
          createdLte = Math.floor(tTime / 1000);
        }
      }
    }

    try {
      // 1. Fetch Stripe payments
      const stripeCharges = await fetchStripeCharges(
        targetAccountId,
        undefined,
        createdGte,
        createdLte,
      );

      const allStripeRows: PaymentHistoryRow[] = stripeCharges.map((ch) =>
        mapStripeChargeToPaymentHistoryRow(ch, activeAccountNum || defaultAccountNum),
      );

      // 2. Account filter
      const activeSelectedAccounts = (
        normalizedSelectedAccounts.length > 0
          ? normalizedSelectedAccounts
          : selectAccount.length > 0
            ? selectAccount
            : [defaultAccountNum].filter(Boolean)
      ).map((a) => String(a).replace(/^0+/, ''));

      let filteredStripeRows = allStripeRows.filter((r) => {
        if (activeSelectedAccounts.length === 0) return true;
        const rowAcc = (r.soldtoNumber || '').replace(/^0+/, '');
        const rawRowAcc = String(r.soldtoNumber || '');
        const metaAcc = String(r.paymentData?.payerNumber || '').replace(/^0+/, '');

        return (
          activeSelectedAccounts.includes(rowAcc) ||
          activeSelectedAccounts.includes(rawRowAcc) ||
          activeSelectedAccounts.includes(metaAcc) ||
          (selectedAccount?.accountId &&
            activeSelectedAccounts.includes(selectedAccount.accountId) &&
            (rowAcc === defaultAccountNum.replace(/^0+/, '') ||
              metaAcc === defaultAccountNum.replace(/^0+/, '')))
        );
      });

      // 3. Date filter
      if (selectedPeriod !== DateRangeOption.All && (dateFrom || dateTo)) {
        const fromTime =
          dateFrom && new Date(dateFrom).getFullYear() > 1900
            ? new Date(dateFrom).setHours(0, 0, 0, 0)
            : null;
        const toTime =
          dateTo && new Date(dateTo).getFullYear() < 9000
            ? new Date(dateTo).setHours(23, 59, 59, 999)
            : null;

        filteredStripeRows = filteredStripeRows.filter((r) => {
          if (!r.documentDate) return true;
          const rTime = new Date(r.documentDate).getTime();
          if (isNaN(rTime)) return true;
          if (fromTime !== null && !isNaN(fromTime) && rTime < fromTime) return false;
          if (toTime !== null && !isNaN(toTime) && rTime > toTime) return false;
          return true;
        });
      }

      // 4. Invoice filter
      if (invoiceNumber && invoiceNumber.trim() !== '') {
        const searchInv = invoiceNumber.trim().replace(/^0+/, '').toLowerCase();
        filteredStripeRows = filteredStripeRows.filter((r) => {
          const invNum = (r.billingDocumentNumber || '')
            .replace(/^0+/, '')
            .toLowerCase();
          const desc = (r.paymentData?.itemText || '').toLowerCase();
          const docNum = (r.documentNumberFinance || '').toLowerCase();
          const refNum = (r.referenceNumber || '').toLowerCase();
          return (
            invNum.includes(searchInv) ||
            desc.includes(searchInv) ||
            docNum.includes(searchInv) ||
            refNum.includes(searchInv)
          );
        });
      }

      // 5. Currency filter if applicable
      if (selectedCurrency && showPaymentHistoryFilter) {
        filteredStripeRows = filteredStripeRows.filter(
          (r) => r.currencyKey === selectedCurrency,
        );
      }

      setPaymentHistoryList(filteredStripeRows.map((r) => r.paymentData));
      setInvoiceList(filteredStripeRows);
    } catch (err: any) {
      console.error('Error fetching payments history:', err);
      setInvoiceList([]);
      setPaymentHistoryList([]);
      showToastMessage('error', err?.message || 'Failed to load payments history.');
    } finally {
      setIsPreSearch(false);
    }
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
    onSearch: () => handleChange(),
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
