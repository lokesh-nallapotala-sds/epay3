import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Ability from 'types/Ability';
import { useTheme } from '@mui/system';
import AccountType from 'types/AccountType';
import useEpayNavigate from 'hooks/useEpayNavigate';
import { DateRangeOption } from 'types/DateRangeOption';
import { InvoiceStatus } from 'types/InvoiceStatus';
import { AccountResponse } from 'types/AccountResponse';
import { EpayDocumentType } from 'types/EpayDocumentType';
import { useEpayToast } from 'providers/EpayToastProvider';
import EpayPdfViewer from 'shared/components/EpayPdfViewer';
import { useAppDispatch, useAppSelector } from 'redux/hooks';
import { EpayPaymentService } from 'services/EpayPaymentService';
import { usePayerDetails } from 'providers/PayerDetailsProvider';
import { EpayInvoicesService } from 'services/EpayInvoicesService';
import EpayPageHeaderText from 'shared/components/EpayPageHeaderText';
import {
  Invoice,
  InvoiceFilterState,
  InvoicesSearchRequest,
} from 'types/InvoicesSearchRequest';
import {
  Box,
  Button,
  Grid,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import {
  useEffectiveAccount,
  useRelatedAccounts,
  useSetGlobalSettings,
} from 'hooks/usePaymentHelpers';
import EpayDataTable from 'shared/components/EpayDataTable';
import {
  selectPaymentDisableMessageText,
  selectPaymentConfig,
  selectShowInvoicePdfActions,
  selectShowInvoiceDaysTillDue,
} from 'redux/selectors/configSelectors';
import {
  setPayer as setInvoicePayer,
  setSoldTo as setInvoiceSoldTo,
} from 'redux/reducers/invoiceSlice';
import {
  clearPaymentSession,
  formatInvoiceStatus,
  getInvoiceKey,
  getSelectedSubAccounts,
  toCurrencyString,
  toFormattedDateString,
} from 'utilities/utilities';
import {
  clearDepositDetails,
  impersonatedUserSelector,
  languageSelector,
  regionalFormatSelector,
  setSelectedInvoices,
  userHasAbility,
  selectUserState as userSelector,
} from 'redux/reducers';
import { useInvoicePdfDownload } from 'hooks/useInvoicePdfDownload';
import { useInvoiceCurrencies } from 'hooks/useInvoiceCurrencies';
import { buildInvoiceColumns } from './invoiceColumnDefs';

import InvoiceDialog from './InvoiceDialog';
import InvoiceAmounts from './InvoiceAmounts';
import InvoiceFilters from './InvoiceFilters';
import InvoiceCardList from './InvoiceCardList';
import EpayCalendarIcon from '../../shared/icons/EpayCalendarIcon';
import SchedulePaymentWarningDialog from './SchedulePaymentWarningDialog';
import { useFormat } from 'hooks/useFormat';

const INVOICES_DEFAULT_SORT = { field: 'dueDate', direction: 'asc' } as const;
const getDefaultInvoiceFilters = (): InvoiceFilterState => ({
  selectedDatePeriod: DateRangeOption.All,
  selectedDuePeriod: DateRangeOption.All,
  from: null,
  to: null,
  dueDateFrom: null,
  dueDateTo: null,
});

export default function InvoicesPage() {
  const { navigate } = useEpayNavigate();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const f = useFormat();

  const { showToastMessage } = useEpayToast();
  const getInvoices = EpayInvoicesService.useGetInvoices();
  const deleteScheduledPayment = EpayPaymentService.useDeleteScheduledPayment();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const showPdfActions = useAppSelector(selectShowInvoicePdfActions);
  const showDaysTillDue = useAppSelector(selectShowInvoiceDaysTillDue);
  const selectedLanguage = useAppSelector(languageSelector);
  const regionalFormat = useAppSelector(regionalFormatSelector);
  const paymentDisableMessageText = useAppSelector(
    selectPaymentDisableMessageText,
  );
  const config = useAppSelector(selectPaymentConfig);
  const user = useAppSelector(userSelector);
  const impersonatedUser = useAppSelector(impersonatedUserSelector);
  const canMakePayment = userHasAbility(user, Ability.MakePayment);
  const effectiveAccount = useEffectiveAccount();
  const relatedAccountsLoaded = useRelatedAccounts();
  const effectiveUserAccountType =
    impersonatedUser && Object.keys(impersonatedUser).length > 0
      ? (impersonatedUser.primaryAccountType ?? '')
      : (user?.primaryAccountType ?? '');
  const { effectivePayer } = usePayerDetails();
  const impersonatedUserId = impersonatedUser
    ? impersonatedUser.userId
    : undefined;

  const [relatedAccounts, setRelatedAccounts] = useState<AccountResponse[]>([]);
  const [filters, setFilters] = useState<InvoiceFilterState>();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice>();
  const [selectedDocs, setSelectedDocs] = useState<Invoice[]>([]);
  const [payer, setPayer] = useState<string>(effectivePayer);
  const [soldTo, setSoldTo] = useState('');
  const [showPayment] = useState(false);
  const [open, setOpen] = useState<boolean>(false);
  const prevInitializationKeyRef = useRef<string | null>(null);
  const [openScheduleWarning, setOpenScheduleWarning] =
    useState<boolean>(false);
  const [scheduledInvoices, setScheduleddInvoices] = useState<Invoice[]>([]);

  const { pdfUrl, pdfModalOpen, setPdfModalOpen, handlePdfDownload } =
    useInvoicePdfDownload({
      account: effectiveAccount ?? { primaryAcct: '', companyCode: '' },
      isMobile,
      impersonatedUserId,
    });

  const { currencyTypes } = useInvoiceCurrencies({
    invoices,
    subAccounts:
      filters?.subAccounts == null
        ? undefined
        : Array.isArray(filters.subAccounts)
          ? filters.subAccounts
          : [filters.subAccounts],
  });

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
      effectiveAccount.salesOrganization ?? '',
      effectiveUserAccountType ?? '',
      relatedAccountsKey,
    ].join('|');
  }, [
    effectiveAccount?.accountId,
    effectiveAccount?.companyCode,
    effectiveAccount?.salesOrganization,
    effectiveAccount?.primaryAcct,
    effectiveUserAccountType,
    relatedAccountsKey,
    relatedAccountsLoaded.length,
  ]);

  useSetGlobalSettings();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hasPaymentParams =
      searchParams.has('access_token') || searchParams.has('id');

    if (!hasPaymentParams) {
      clearSessionKeys();
    }
  }, [dispatch]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hasPaymentParams =
      searchParams.has('access_token') || searchParams.has('id');

    if (!hasPaymentParams) {
      clearPaymentSession();
    }
  }, []);

  const clearSessionKeys = () => {
    dispatch(setInvoicePayer(''));
    dispatch(setInvoiceSoldTo(''));
    dispatch(setSelectedInvoices([]));
    dispatch(clearDepositDetails());
  };

  const toStartOfDay = (date: Date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  const toEndOfDay = (date: Date) => {
    const normalized = new Date(date);
    normalized.setHours(23, 59, 59, 999);
    return normalized;
  };

  const isDateWithinRange = (
    value: string | null | undefined,
    from?: Date | null,
    to?: Date | null,
  ) => {
    if (!from && !to) {
      return true;
    }

    if (!value) {
      return false;
    }

    const dateValue = new Date(value);

    if (Number.isNaN(dateValue.getTime())) {
      return false;
    }

    const rangeStart = from ? toStartOfDay(from) : null;
    const rangeEnd = to ? toEndOfDay(to) : null;

    if (rangeStart && dateValue < rangeStart) {
      return false;
    }

    if (rangeEnd && dateValue > rangeEnd) {
      return false;
    }

    return true;
  };

  const filterInvoices = useCallback(
    (sourceInvoices: Invoice[], currentFilters: InvoiceFilterState) => {
      let results = [...sourceInvoices];

      if (
        effectiveUserAccountType === AccountType.Payer &&
        currentFilters?.subAccounts
      ) {
        if (
          !currentFilters.subAccounts ||
          currentFilters.subAccounts.length === 0
        ) {
          return [];
        }

        results = results.filter((item) =>
          currentFilters.subAccounts!.includes(
            item.soldtoNumber.replace(/^0+/, ''),
          ),
        );
      }

      if (currentFilters?.currencyType) {
        results = results.filter(
          (item) => item.currencyKey === currentFilters.currencyType,
        );
      }

      results = results.filter(
        (item) =>
          isDateWithinRange(
            item.documentDate,
            currentFilters?.from,
            currentFilters?.to,
          ) &&
          isDateWithinRange(
            item.dueDate,
            currentFilters?.dueDateFrom,
            currentFilters?.dueDateTo,
          ),
      );

      return results;
    },
    [effectiveUserAccountType],
  );

  const filteredInvoices = useMemo(() => {
    const selectedKeys = new Set(selectedDocs.map((inv) => getInvoiceKey(inv)));
    return filterInvoices(invoices, filters ?? {}).map((item) => ({
      ...item,
      isSelected: selectedKeys.has(getInvoiceKey(item)),
    }));
  }, [filterInvoices, filters, invoices, selectedDocs]);

  const paymentAmount = useMemo(
    () =>
      selectedDocs.reduce(
        (sum, invoice) => sum + (Number(invoice.openAmount) || 0),
        0,
      ),
    [selectedDocs],
  );

  const getData = useCallback(
    (currentFilters: InvoiceFilterState) => {
      const nextFilters = {
        ...getDefaultInvoiceFilters(),
        ...currentFilters,
      };

      const request: InvoicesSearchRequest = {
        documentType: EpayDocumentType.Invoice,
        status: InvoiceStatus.Open,
        userId: impersonatedUser?.userId,
        selectedAccount: effectiveAccount?.primaryAcct ?? '',
        companyCode: effectiveAccount?.companyCode,
        salesOrganization: effectiveAccount?.salesOrganization,
        subAccounts:
          nextFilters.subAccounts == null
            ? []
            : Array.isArray(nextFilters.subAccounts)
              ? nextFilters.subAccounts
              : [nextFilters.subAccounts],
        currencyKey: 'All',
      };
      getInvoices(request).then(
        (resp: Invoice[]) => {
          setInvoices(resp);
          const responseCurrencyTypes = [
            ...new Set(
              resp
                .map((invoice) => invoice.currencyKey)
                .filter((currency): currency is string => Boolean(currency)),
            ),
          ];
          const nextEffectiveCurrencyTypes =
            responseCurrencyTypes.length > 0
              ? responseCurrencyTypes
              : currencyTypes;
          const resolvedCurrencyType =
            nextFilters.currencyType &&
            nextEffectiveCurrencyTypes.includes(nextFilters.currencyType)
              ? nextFilters.currencyType
              : (nextEffectiveCurrencyTypes[0] ?? 'USD');

          setFilters({
            ...nextFilters,
            currencyType: resolvedCurrencyType,
          });
        },
        (error) => {
          setInvoices([]);
          if (error?.code !== 204) {
            showToastMessage('error', error);
          }
        },
      );
    },
    [
      currencyTypes,
      effectiveAccount?.companyCode,
      effectiveAccount?.salesOrganization,
      effectiveAccount?.primaryAcct,
      getInvoices,
      impersonatedUser?.userId,
      showToastMessage,
    ],
  );

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

    const objFilters: InvoiceFilterState = getDefaultInvoiceFilters();
    objFilters.subType = effectiveUserAccountType;
    objFilters.selectedAccount = effectiveAccount.primaryAcct;
    objFilters.subAccounts = getSelectedSubAccounts(
      relatedAccountsLoaded,
      effectiveUserAccountType,
    );

    const soldToNr = effectiveAccount.primaryAcct;
    const payerNr =
      effectiveUserAccountType === AccountType.Payer
        ? effectiveAccount.primaryAcct
        : objFilters.subAccounts?.[0];

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

  const updateFilters = (newFilters: InvoiceFilterState, requery: boolean) => {
    if (requery) {
      getData(newFilters);
    } else {
      if (
        effectiveUserAccountType === AccountType.Payer &&
        Array.isArray(newFilters?.subAccounts) &&
        newFilters.subAccounts.length === 0
      ) {
        setSelectedDocs([]);
        setFilters({ ...newFilters });
        return;
      }

      const results = filterInvoices(invoices, newFilters);

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

      setSelectedDocs(updatedSelected);
      setFilters({ ...newFilters });
    }
  };

  const handleSubmit = (data: Invoice) => {
    setSelectedInvoice(data);
    setOpen(true);
  };

  const mapInvoiceForPayment = (invoice: Invoice): Invoice => ({
    ...invoice,
    billingDocumentNumber: invoice.billingDocumentNumber
      ? invoice.billingDocumentNumber
      : invoice.documentNumberFinance,
  });

  const handleSelectedInvoicePay = () => {
    if (!selectedInvoice) {
      return;
    }

    const mappedInvoice = mapInvoiceForPayment(selectedInvoice);

    if (selectedInvoice.scheduledId) {
      setScheduleddInvoices([selectedInvoice]);
      setOpen(false);
      setOpenScheduleWarning(true);
      return;
    }

    dispatch(setSelectedInvoices([mappedInvoice]));
    navigate('/payment/session', {
      state: { soldTo: soldTo, payer: payer },
    });
  };

  const deleteAndProceed = async () => {
    setOpenScheduleWarning(false);
    const deleted = await deleteScheduledPaymentsIfAny(scheduledInvoices);
    if (!deleted) return;
    if (selectedInvoice) {
      dispatch(setSelectedInvoices([mapInvoiceForPayment(selectedInvoice)]));
      navigate('/payment/session', {
        state: { soldTo: soldTo, payer: payer },
      });
    } else {
      navigate('/payment/session', {
        state: { soldTo: soldTo, payer: payer },
      });
    }
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
            effectiveAccount?.companyCode ?? '',
            effectiveAccount?.primaryAcct ?? '',
            payer,
            impersonatedUserId,
          ),
        );

      await Promise.all(deletions);
      return true;
    } catch {
      showToastMessage('error', f('schedule.error.delete'));
      return false;
    }
  };

  const handlePay = () => {
    setSelectedInvoice(undefined);

    const selectedDocsMapped: Invoice[] =
      selectedDocs.map(mapInvoiceForPayment);

    const scheduledIds = selectedDocsMapped
      .filter((doc) => doc.scheduledId)
      .map((doc) => doc.scheduledId);

    const scheduledInvoices = filteredInvoices.filter((inv) =>
      scheduledIds.includes(inv.scheduledId),
    );
    setScheduleddInvoices(scheduledInvoices);
    dispatch(setSelectedInvoices(selectedDocsMapped));
    if (scheduledInvoices.length > 0) {
      setOpenScheduleWarning(true);
      return;
    } else {
      navigate('/payment/session', {
        state: { soldTo: soldTo, payer: payer },
      });
    }
  };

  const handleSelectionChange = useCallback((e: Invoice[]) => {
    setSelectedDocs(e);
  }, []);

  const handleClose = () => {
    setOpen(false);
    setSelectedInvoice(undefined);
  };

  const handleScheduleWarningClose = () => {
    setOpenScheduleWarning(false);
  };

  const formatHomeInvoiceStatus = (data: Invoice) =>
    data.invoiceStatus === 'Open'
      ? f('invoices.status.invoice')
      : formatInvoiceStatus(data, f);

  const colDefs = buildInvoiceColumns({
    f,
    theme,
    regionalFormat,
    currencyFallback: filters?.currencyType,
    showPdfActions,
    showDaysTillDue,
    onDocumentClick: handleSubmit,
    onPdfDownload: handlePdfDownload,
    statusColumnHeaderId: 'invoices.table.type',
    statusRenderer: (data) => (
      <>
        {formatHomeInvoiceStatus(data)}
        {data.scheduledId && data.scheduledDate && (
          <Tooltip
            title={`Payment Scheduled on ${toFormattedDateString(
              data.scheduledDate,
              regionalFormat,
            )}`}
            placement="bottom-start"
            slotProps={{
              tooltip: {
                sx: {
                  backgroundColor: '#ffffff',
                  color: '#0D0D12',
                  fontSize: '0.75rem',
                  border: '1px solid #D1D5DB',
                  boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontWeight: 500,
                },
              },
            }}
          >
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                marginLeft: 8,
                verticalAlign: 'middle',
                cursor: 'pointer',
              }}
              onClick={() => navigate('/scheduleddetails?tab=scheduled')}
            >
              <EpayCalendarIcon
                sx={{
                  color: theme.palette.interactiveColor,
                  fontSize: '1.2rem',
                  marginTop: '-4px',
                }}
              />
            </Box>
          </Tooltip>
        )}
      </>
    ),
  });

  const selectedPayBarContent = (
    <>
      <Typography variant="h2" sx={{ marginRight: '1rem' }}>
        {f('invoices.amount.selected')}
      </Typography>

      <Typography
        variant="h2"
        sx={{
          marginRight: '1rem',
          color: '#DF1C41F4',
          lineHeight: '33px',
        }}
      >
        {toCurrencyString(
          filters?.currencyType ?? '',
          paymentAmount,
          false,
          regionalFormat,
        )}
      </Typography>

      {canMakePayment && (
        <Button
          sx={{
            width: { xs: '100%', sm: '180px' },
            ...(paymentAmount > 0 && {
              border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
              '&:hover': {
                border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
              },
            }),
          }}
          variant="contained"
          disabled={paymentAmount <= 0}
          onClick={() => handlePay()}
        >
          {f('payment.pay')}
        </Button>
      )}
    </>
  );

  if (!user) {
    return null;
  }

  return (
    <>
      <Box
        width="100%"
        marginTop="1rem"
        display={showPayment ? 'none' : 'block'}
        sx={{
          pointerEvents: config?.isPaymentDisabled ? 'none' : 'auto',
        }}
      >
        {config?.isPaymentDisabled && (
          <Grid item>
            <Typography
              variant="body1"
              color="error"
              sx={{ padding: '10px', textAlign: 'center' }}
            >
              {paymentDisableMessageText?.[selectedLanguage]}
            </Typography>
          </Grid>
        )}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'auto 1fr' },
            columnGap: '1rem',
            rowGap: '2rem',
          }}
        >
          <EpayPageHeaderText
            header={f('header.home')}
            subheader={f('invoices.page.description')}
          />
          <Grid
            item
            display="flex"
            flexDirection={{ xs: 'column', sm: 'row' }}
            flexWrap="wrap"
            whiteSpace="nowrap"
            justifyContent="flex-end"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            gap={{ xs: 1, sm: 0 }}
            position="sticky"
            top="var(--app-header-height, 70px)"
            zIndex={1}
            sx={{
              gridColumn: { xs: '1', sm: '2' },
              backgroundColor: theme.palette.background.default,
            }}
          >
            {selectedPayBarContent}
          </Grid>
          <Grid item container sx={{ gridColumn: '1 / -1' }}>
            <InvoiceAmounts
              data={filteredInvoices}
              currency={filters?.currencyType ?? ''}
            />
          </Grid>
          <Grid
            sx={{ display: { xs: 'none', md: 'block' }, gridColumn: '1 / -1' }}
            item
          >
            <Box>
              <EpayDataTable
                showTotal={false}
                colDefs={colDefs}
                selectedInvoices={selectedDocs}
                isMobile={isMobile}
                data={filteredInvoices}
                defaultSort={INVOICES_DEFAULT_SORT}
                showSelectionCheck={true}
                onSelectionChange={handleSelectionChange}
                getRowKey={getInvoiceKey}
                width="100%"
                canMakePayment={canMakePayment}
                noDataMessage={f('invoices.noopen.invoice')}
                filterSelectors={
                  <InvoiceFilters
                    subAccounts={relatedAccounts}
                    currencies={currencyTypes}
                    filters={filters}
                    data={filteredInvoices}
                    selectedInvoices={selectedDocs}
                    onChange={(e: InvoiceFilterState, requery: boolean) =>
                      updateFilters(e, requery)
                    }
                  />
                }
              />
            </Box>
          </Grid>
          <Grid
            item
            container
            flexDirection="column"
            sx={{ gridColumn: '1 / -1' }}
          >
            <Grid
              item
              display={{ xs: 'none', md: 'block' }}
              sx={{
                borderRadius: '12px',
                border: '0px solid',
                backgroundColor: theme.palette.background.paper,
                borderColor: '#E0E0E0',
              }}
            ></Grid>
            <Grid item display={{ xs: 'block', md: 'none' }}>
              <InvoiceCardList
                data={filteredInvoices}
                currency={filters?.currencyType ?? ''}
                selectedInvoices={selectedDocs}
                isMobile={isMobile}
                showPdfActions={showPdfActions}
                onSelectionChange={handleSelectionChange}
                canMakePayment={canMakePayment}
                handlePdfDownload={handlePdfDownload}
                width="100%"
                noDataMessage={f('invoices.noopen.invoice')}
                filterSelectors={
                  <InvoiceFilters
                    subAccounts={relatedAccounts}
                    currencies={currencyTypes}
                    filters={filters}
                    isMobile={isMobile}
                    data={filteredInvoices}
                    selectedInvoices={selectedDocs}
                    showPdfActions={showPdfActions}
                    showDaysTillDue={showDaysTillDue}
                    onChange={(e: InvoiceFilterState, requery: boolean) =>
                      updateFilters(e, requery)
                    }
                  />
                }
                handleSubmit={handleSubmit}
              />
            </Grid>
          </Grid>
        </Box>
      </Box>

      <InvoiceDialog
        open={open}
        onClose={handleClose}
        onPayInvoice={handleSelectedInvoicePay}
        selectedInvoice={selectedInvoice}
      />

      <SchedulePaymentWarningDialog
        open={openScheduleWarning}
        onClose={handleScheduleWarningClose}
        scheduledInvoices={scheduledInvoices}
        onDeleteAndProceed={deleteAndProceed}
      />

      <EpayPdfViewer
        open={pdfModalOpen}
        pdfUrl={pdfUrl}
        onClose={() => setPdfModalOpen(false)}
      />
    </>
  );
}
