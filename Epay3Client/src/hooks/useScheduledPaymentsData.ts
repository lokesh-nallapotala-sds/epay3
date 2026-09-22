import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useSearchParams } from 'react-router';

import { useMediaQuery, useTheme } from '@mui/material';
import Ability from 'types/Ability';
import AccountType from 'types/AccountType';
import { InvoiceStatus } from 'types/InvoiceStatus';
import { AccountResponse } from 'types/AccountResponse';
import { EpayDocumentType } from 'types/EpayDocumentType';
import { ScheduledPayment } from 'types/ScheduledPayment';
import { useEpayLocale } from 'providers/EpayIntlProvider';
import { useEpayToast } from 'providers/EpayToastProvider';
import { InvoicePdfRequest } from 'types/InvoicePdfRequest';
import { useAppDispatch, useAppSelector } from 'redux/hooks';
import { EpayPaymentService } from 'services/EpayPaymentService';
import { EpayInvoicesService } from 'services/EpayInvoicesService';
import { getConfiguredCurrenciesForAccounts } from 'utilities/currency';
import {
  Invoice,
  InvoiceFilterState,
  InvoicesSearchRequest,
} from 'types/InvoicesSearchRequest';
import {
  useEffectiveAccount,
  useRelatedAccounts,
} from 'hooks/usePaymentHelpers';
import {
  selectCompanyCodes,
  selectShowInvoiceDaysTillDue,
  selectShowInvoicePdfActions,
} from 'redux/selectors/configSelectors';
import {
  setPayer as setInvoicePayer,
  setSoldTo as setInvoiceSoldTo,
} from 'redux/reducers/invoiceSlice';
import {
  clearPaymentSession,
  clone,
  getEffectivePayerFromAccount,
  getInvoiceKey,
  getSelectedSubAccounts,
} from 'utilities/utilities';
import {
  clearDepositDetails,
  impersonatedUserSelector,
  regionalFormatSelector,
  setSelectedInvoices,
  userHasAbility,
  selectUserState as userSelector,
} from 'redux/reducers';
import useEpayNavigate from 'hooks/useEpayNavigate';
import { useFormat } from 'hooks/useFormat';

export interface UseScheduledPaymentsDataReturn {
  scheduleId: string;
  setScheduleId: (id: string) => void;
  relatedAccounts: AccountResponse[];
  filters: InvoiceFilterState | undefined;
  invoices: Invoice[];
  mappedScheduledInvoices: ScheduledPayment[];
  selectedInvoice: Invoice | undefined;
  selectedDocs: Invoice[];
  payer: string;
  soldTo: string;
  paymentAmount: number;
  open: boolean;
  pdfUrl: string | null;
  pdfModalOpen: boolean;
  modalOpen: boolean;
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  filteredInvoices: Invoice[];
  filteredScheduledInvoices: ScheduledPayment[];
  currencyTypes: string[];
  currencyOptions: { key: string; value: string }[];
  regionalFormat: string;
  canMakePayment: boolean;
  showDaysTillDue: boolean;
  showPdfActions: boolean;
  getData: (filters: InvoiceFilterState) => void;
  updateFilters: (newFilters: InvoiceFilterState, requery: boolean) => void;
  fetchScheduledInvoices: () => void;
  handleSelectionChange: (e: Invoice[]) => void;
  handlePdfDownload: (data: Invoice) => Promise<void>;
  handleSubmit: (data: Invoice) => void;
  handleSelectedInvoiceSchedulePayment: () => void;
  handlePay: (soldTo: string, payer: string) => void;
  handleOk: () => void;
  handleClose: () => void;
  handleDeleteClose: () => void;
  openDeleteModal: (scheduleId: string) => void;
  handlePdfModalClose: () => void;
  isMobile: boolean;
}

export function useScheduledPaymentsData(
  currencyParam: string,
): UseScheduledPaymentsDataReturn {
  const { navigate } = useEpayNavigate();
  const dispatch = useAppDispatch();
  const f = useFormat();
  const [searchParams] = useSearchParams();
  const { showToastMessage } = useEpayToast();
  const { language } = useEpayLocale();
  const getInvoices = EpayInvoicesService.useGetInvoices();
  const getPdf = EpayInvoicesService.useGetPdf();
  const deleteScheduledPayment = EpayPaymentService.useDeleteScheduledPayment();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const showDaysTillDue = useAppSelector(selectShowInvoiceDaysTillDue);
  const showPdfActions = useAppSelector(selectShowInvoicePdfActions);
  const companyCodes = useAppSelector(selectCompanyCodes);
  const regionalFormat = useAppSelector(regionalFormatSelector);
  const user = useAppSelector(userSelector);
  const impersonatedUser = useAppSelector(impersonatedUserSelector);
  const canMakePayment = userHasAbility(user, Ability.MakePayment);

  const effectiveAccount = useEffectiveAccount();
  const relatedAccountsLoaded = useRelatedAccounts();

  const effectiveUserAccountType =
    impersonatedUser && Object.keys(impersonatedUser).length > 0
      ? impersonatedUser.primaryAccountType
      : (user?.primaryAccountType ?? '');

  const [scheduleId, setScheduleId] = useState('');
  const [relatedAccounts, setRelatedAccounts] = useState<AccountResponse[]>([]);
  const [filters, setFilters] = useState<InvoiceFilterState>();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [mappedScheduledInvoices, setMappedScheduledInvoices] = useState<
    ScheduledPayment[]
  >([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice>();
  const [selectedDocs, setSelectedDocs] = useState<Invoice[]>([]);
  const [payer, setPayer] = useState<string>('');
  const [soldTo, setSoldTo] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [open, setOpen] = useState<boolean>(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] =
    useState<string>(currencyParam);
  const prevInitializationKeyRef = useRef<string | null>(null);

  const configuredCurrencies = useMemo(
    () =>
      getConfiguredCurrenciesForAccounts(
        companyCodes,
        effectiveAccount,
        relatedAccountsLoaded,
        filters?.subAccounts,
      ),
    [
      companyCodes,
      effectiveAccount,
      filters?.subAccounts,
      relatedAccountsLoaded,
    ],
  );

  const invoiceCurrencyTypes = useMemo(
    () =>
      [
        ...new Set(
          [...invoices, ...mappedScheduledInvoices]
            .map((invoice) => invoice.currencyKey)
            .filter(Boolean),
        ),
      ].sort(),
    [invoices, mappedScheduledInvoices],
  );

  const currencyTypes = useMemo(
    () =>
      invoiceCurrencyTypes.length > 0
        ? invoiceCurrencyTypes
        : configuredCurrencies.map((currency) => currency.code),
    [configuredCurrencies, invoiceCurrencyTypes],
  );

  const currencyOptions = useMemo(
    () =>
      currencyTypes.map((currency) => ({
        key: currency,
        value: currency,
      })),
    [currencyTypes],
  );

  const relatedAccountsKey = useMemo(
    () =>
      relatedAccountsLoaded
        .map(
          (account) =>
            `${account.primaryAccount ?? ''}:${account.selected ? '1' : '0'}`,
        )
        .join('|'),
    [relatedAccountsLoaded],
  );

  const accountInitializationKey = useMemo(() => {
    if (!effectiveAccount?.primaryAcct || relatedAccountsLoaded.length === 0) {
      return '';
    }

    return [
      effectiveAccount.accountId ?? '',
      effectiveAccount.primaryAcct,
      effectiveAccount.companyCode ?? '',
      effectiveUserAccountType ?? '',
      relatedAccountsKey,
    ].join('|');
  }, [
    effectiveAccount?.accountId,
    effectiveAccount?.companyCode,
    effectiveAccount?.primaryAcct,
    effectiveUserAccountType,
    relatedAccountsKey,
    relatedAccountsLoaded.length,
  ]);

  const clearSessionKeys = () => {
    dispatch(setInvoicePayer(''));
    dispatch(setInvoiceSoldTo(''));
    dispatch(setSelectedInvoices([]));
    dispatch(clearDepositDetails());
  };

  const mapInvoicesToScheduledPayments = useCallback(
    (invoices: Invoice[]): ScheduledPayment[] => {
      return invoices
        .filter((inv) => inv.scheduledId)
        .map((inv) => ({
          currencyKey: inv.currencyKey,
          scheduleId: inv.scheduledId!,
          invoice: inv.billingDocumentNumber ?? inv.documentNumberFinance ?? '',
          openAmount: inv.openAmount ?? 0,
          amountToPay:
            inv.scheduledIdDetails?.scheduledDocument?.amountToProcess ?? 0,
          dateToPay: inv.scheduledDate ?? '-',
          paymentCardType:
            inv.scheduledIdDetails?.paymentDetail?.paymentCardType ?? '',
          paymentCardToken:
            inv.scheduledIdDetails?.paymentDetail?.paymentCardToken ?? '',
          cardLast4Digit:
            inv.scheduledIdDetails?.paymentDetail?.cardLast4Digit ?? '',
          paymentMethod:
            (inv.scheduledIdDetails?.paymentDetail?.paymentCardType ?? '') +
            ' **** ' +
            (inv.scheduledIdDetails?.paymentDetail?.cardLast4Digit ?? ''),
        }));
    },
    [],
  );

  const filterOpenInvoices = useCallback(
    (sourceInvoices: Invoice[], currentFilters: InvoiceFilterState) => {
      let results = sourceInvoices;

      if (effectiveUserAccountType === AccountType.Payer) {
        const subAccounts = currentFilters?.subAccounts;

        if (Array.isArray(subAccounts)) {
          if (subAccounts.length === 0) {
            return [];
          }

          results = results.filter((item) =>
            subAccounts.includes(item.soldtoNumber.replace(/^0+/, '')),
          );
        }
      }

      if (currentFilters?.currencyType) {
        results = results.filter(
          (item) => item.currencyKey === currentFilters.currencyType,
        );
      }

      if (currentFilters?.show === 'till' && currentFilters?.dueTill) {
        const dueTill = new Date(currentFilters.dueTill);
        results = results.filter(
          (item) =>
            item.dueDate !== null &&
            item.dueDate !== undefined &&
            new Date(item.dueDate) <= dueTill,
        );
      }

      return results;
    },
    [effectiveUserAccountType],
  );

  const getData = useCallback(
    (currentFilters: InvoiceFilterState) => {
      const nextFilters = {
        ...currentFilters,
        show: 'open',
        dueTill: new Date(),
      };

      const request: InvoicesSearchRequest = {
        documentType: EpayDocumentType.Invoice,
        status: InvoiceStatus.Open,
        userId: impersonatedUser?.userId,
        companyCode: effectiveAccount?.companyCode,
        selectedAccount: effectiveAccount?.primaryAcct ?? '',
        subAccounts:
          nextFilters.subAccounts == null
            ? []
            : Array.isArray(nextFilters.subAccounts)
              ? nextFilters.subAccounts
              : [nextFilters.subAccounts],
        currencyKey: 'All',
        dueDateTo: nextFilters.dueTill,
      };

      setSelectedDocs([]);
      setPaymentAmount(0);
      getInvoices(request).then(
        (resp: Invoice[]) => {
          const openInvoices = resp.filter((inv) => !inv.scheduledId);
          const mapped = mapInvoicesToScheduledPayments(resp);
          setMappedScheduledInvoices(mapped);
          setInvoices(openInvoices);
          const urlCurrency = searchParams.get('currency');
          const availableCurrencyTypes = [
            ...new Set(
              [...openInvoices, ...mapped]
                .map((invoice) => invoice.currencyKey)
                .filter(Boolean),
            ),
          ];
          const fallbackCurrencyTypes =
            availableCurrencyTypes.length > 0
              ? availableCurrencyTypes
              : currencyTypes;
          const nextCurrencyType =
            nextFilters.currencyType &&
            fallbackCurrencyTypes.includes(nextFilters.currencyType)
              ? nextFilters.currencyType
              : urlCurrency && fallbackCurrencyTypes.includes(urlCurrency)
                ? urlCurrency
                : selectedCurrency &&
                    fallbackCurrencyTypes.includes(selectedCurrency)
                  ? selectedCurrency
                  : (fallbackCurrencyTypes[0] ?? '');
          setFilters({
            ...nextFilters,
            currencyType: nextCurrencyType,
          });
          setSelectedCurrency(nextCurrencyType);
        },
        (error) => {
          setInvoices([]);
          setFilters(nextFilters);
          if (error?.code !== 204) {
            showToastMessage('error', error);
          }
        },
      );
    },
    [
      currencyTypes,
      effectiveAccount?.companyCode,
      effectiveAccount?.primaryAcct,
      getInvoices,
      impersonatedUser?.userId,
      mapInvoicesToScheduledPayments,
      searchParams,
      selectedCurrency,
      showToastMessage,
    ],
  );

  const updateFilters = (newFilters: InvoiceFilterState, requery: boolean) => {
    if (requery) {
      getData(newFilters);
    } else {
      if (effectiveUserAccountType === AccountType.Payer) {
        if (newFilters.subAccounts) {
          if (newFilters.subAccounts.length == 0) {
            setSelectedDocs([]);
            setPaymentAmount(0);
            setFilters(clone(newFilters));
            return;
          }
        }
      }

      const results = filterOpenInvoices(invoices, newFilters);
      const selectedKeys = new Set(
        selectedDocs.map((inv) => getInvoiceKey(inv)),
      );

      const resultsWithSelection = results.map((item) => ({
        ...item,
        isSelected: selectedKeys.has(getInvoiceKey(item)),
      }));

      const updatedSelected = [
        ...selectedDocs.filter(
          (inv) =>
            !results.some((r) => getInvoiceKey(r) === getInvoiceKey(inv)),
        ),
        ...resultsWithSelection.filter((x) => x.isSelected),
      ];

      const total = updatedSelected.reduce((sum, inv) => {
        return sum + (Number(inv.openAmount) || 0);
      }, 0);

      setSelectedDocs(updatedSelected);
      setPaymentAmount(total);
    }

    setFilters(clone(newFilters));
  };

  const fetchScheduledInvoices = useCallback(() => {
    const subAccounts = getSelectedSubAccounts(
      relatedAccountsLoaded,
      effectiveUserAccountType ?? '',
    );

    const request: InvoicesSearchRequest = {
      documentType: EpayDocumentType.Invoice,
      status: InvoiceStatus.Scheduled,
      userId: impersonatedUser?.userId,
      selectedAccount: effectiveAccount?.primaryAcct ?? '',
      subAccounts: subAccounts ?? [],
      currencyKey: 'All',
    };

    getInvoices(request).then(
      (resp: Invoice[]) => {
        const mapped = mapInvoicesToScheduledPayments(resp);
        setMappedScheduledInvoices(mapped);
      },
      (error) => {
        if (
          error.code === 204 ||
          (typeof error.message === 'string' &&
            error.message.toUpperCase() === 'NO CONTENT')
        ) {
          setMappedScheduledInvoices([]);
        } else {
          showToastMessage('error', error);
        }
      },
    );
  }, [
    effectiveAccount?.primaryAcct,
    effectiveUserAccountType,
    getInvoices,
    impersonatedUser?.userId,
    mapInvoicesToScheduledPayments,
    relatedAccountsLoaded,
    showToastMessage,
  ]);

  const filteredInvoices = useMemo(() => {
    const selectedKeys = new Set(selectedDocs.map((inv) => getInvoiceKey(inv)));

    return filterOpenInvoices(invoices, filters ?? {}).map((item) => ({
      ...item,
      isSelected: selectedKeys.has(getInvoiceKey(item)),
    }));
  }, [filterOpenInvoices, filters, invoices, selectedDocs]);

  const filteredScheduledInvoices = useMemo(() => {
    if (!selectedCurrency) {
      return mappedScheduledInvoices;
    }

    return mappedScheduledInvoices.filter(
      (inv) => inv.currencyKey === selectedCurrency,
    );
  }, [mappedScheduledInvoices, selectedCurrency]);

  useEffect(() => {
    if (
      !accountInitializationKey ||
      !effectiveAccount?.primaryAcct ||
      relatedAccountsLoaded.length === 0
    ) {
      return;
    }

    if (accountInitializationKey === prevInitializationKeyRef.current) {
      return;
    }

    prevInitializationKeyRef.current = accountInitializationKey;

    setRelatedAccounts(relatedAccountsLoaded);

    const objFilters: InvoiceFilterState = {};
    objFilters.subType = effectiveUserAccountType;
    objFilters.selectedAccount = effectiveAccount.primaryAcct;
    objFilters.subAccounts = getSelectedSubAccounts(
      relatedAccountsLoaded,
      effectiveUserAccountType ?? '',
    );

    const soldToNr = effectiveAccount.primaryAcct;
    const payerNr =
      effectiveUserAccountType === AccountType.Payer
        ? effectiveAccount.primaryAcct
        : getEffectivePayerFromAccount(effectiveAccount);

    setPayer(payerNr ?? '');
    setSoldTo(soldToNr);
    getData(objFilters);
  }, [
    accountInitializationKey,
    effectiveAccount,
    effectiveUserAccountType,
    getData,
    relatedAccountsLoaded,
  ]);

  useEffect(() => {
    if (currencyTypes.length === 0) {
      if (selectedCurrency !== '') {
        setSelectedCurrency('');
      }
      return;
    }

    const hasSelectedCurrency = currencyTypes.includes(selectedCurrency);
    if (!hasSelectedCurrency) {
      const urlCurrency = searchParams.get('currency');
      const nextCurrency =
        urlCurrency && currencyTypes.includes(urlCurrency)
          ? urlCurrency
          : (currencyTypes[0] ?? '');
      setSelectedCurrency(nextCurrency);
    }
  }, [currencyTypes, searchParams, selectedCurrency]);

  useEffect(() => {
    clearSessionKeys();
  }, []);

  useEffect(() => {
    clearPaymentSession();
  }, []);

  const handleSubmit = (data: Invoice) => {
    setSelectedInvoice(data);
    setOpen(true);
  };

  const mapInvoiceForScheduledPayment = (invoice: Invoice): Invoice => ({
    ...invoice,
    billingDocumentNumber: invoice.billingDocumentNumber
      ? invoice.billingDocumentNumber
      : invoice.documentNumberFinance,
  });

  const handleSelectedInvoiceSchedulePayment = () => {
    if (!selectedInvoice) {
      return;
    }

    const mappedInvoice = mapInvoiceForScheduledPayment(selectedInvoice);
    const selectedPaymentAmount = Number(mappedInvoice.openAmount) || 0;

    dispatch(setSelectedInvoices([mappedInvoice]));
    navigate('/payment/scheduled', {
      state: { soldTo, payer, paymentAmount: selectedPaymentAmount },
    });
  };

  const handlePay = (soldTo: string, payer: string) => {
    const selectedDocsMapped: Invoice[] = selectedDocs.map(
      mapInvoiceForScheduledPayment,
    );
    dispatch(setSelectedInvoices(selectedDocsMapped));
    navigate('/payment/scheduled', {
      state: { soldTo, payer, paymentAmount },
    });
  };

  const handleSelectionChange = useCallback((e: Invoice[]) => {
    setSelectedDocs(e);
    const total = e.reduce(
      (memo, data: Invoice) => memo + (data.openAmount ?? 0),
      0,
    );
    setPaymentAmount(total);
  }, []);

  const handlePdfDownload = async (data: Invoice) => {
    try {
      const request: InvoicePdfRequest = {
        documentNumber: data.billingDocumentNumber ?? '',
        customerNumber: data.soldtoNumber,
        primaryAccount: effectiveAccount?.primaryAcct ?? '',
        userId: impersonatedUser?.userId,
        companyCode: effectiveAccount?.companyCode,
      };

      const resp = await getPdf(request);
      const url = `api/invoices/${language}/pdf?token=${resp.token}`;

      if (isMobile) {
        const pdfView = window.open(url, '_blank');
        pdfView?.document && (pdfView.document.title = 'PDF');
      } else {
        setPdfUrl(url);
        setPdfModalOpen(true);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      showToastMessage('error', errorMessage);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleDeleteClose = () => setModalOpen(false);

  const openDeleteModal = (id: string) => {
    setScheduleId(id);
    setModalOpen(true);
  };

  const handlePdfModalClose = () => setPdfModalOpen(false);

  const handleOk = () => {
    const deletedScheduleId = scheduleId;
    deleteScheduledPayment(
      deletedScheduleId,
      effectiveAccount?.companyCode ?? '',
      effectiveAccount?.primaryAcct ?? '',
      payer,
      impersonatedUser?.userId,
    )
      .then(() => {
        setMappedScheduledInvoices((current) =>
          current.filter((item) => item.scheduleId !== deletedScheduleId),
        );

        if (filters) {
          getData(filters);
        } else {
          fetchScheduledInvoices();
        }
        showToastMessage('success', 'Scheduled payment deleted successfully');
      })
      .catch(() => {
        showToastMessage('error', f('schedule.error.delete'));
      });
  };

  return {
    scheduleId,
    setScheduleId,
    relatedAccounts,
    filters,
    invoices,
    mappedScheduledInvoices,
    selectedInvoice,
    selectedDocs,
    payer,
    soldTo,
    paymentAmount,
    open,
    pdfUrl,
    pdfModalOpen,
    modalOpen,
    selectedCurrency,
    setSelectedCurrency,
    filteredInvoices,
    filteredScheduledInvoices,
    currencyTypes,
    currencyOptions,
    regionalFormat,
    canMakePayment,
    showDaysTillDue,
    showPdfActions,
    getData,
    updateFilters,
    fetchScheduledInvoices,
    handleSelectionChange,
    handlePdfDownload,
    handleSubmit,
    handleSelectedInvoiceSchedulePayment,
    handlePay,
    handleOk,
    handleClose,
    handleDeleteClose,
    openDeleteModal,
    handlePdfModalClose,
    isMobile,
  };
}
