import { useEffect, useRef, useState, SyntheticEvent } from 'react';

import { useIntl } from 'react-intl';
import { useLocation, useSearchParams } from 'react-router';

import { useTheme, Theme } from '@mui/system';
import {
  EpayTabContext,
  EpayTabList,
  EpayTabPanel,
} from 'shared/components/EpayTabs';
import EpayBox from 'shared/components/EpayBox';
import EpayPdfIcon from 'shared/icons/EpayPdfIcon';
import useEpayNavigate from 'hooks/useEpayNavigate';
import EpayPdfViewer from 'shared/components/EpayPdfViewer';
import { useAppSelector } from 'redux/hooks';
import EpayPageHeaderText from 'shared/components/EpayPageHeaderText';
import { Invoice, InvoiceFilterState } from 'types/InvoicesSearchRequest';
import { Box, Button, Grid, Tab, Typography } from '@mui/material';
import { useSetGlobalSettings } from 'hooks/usePaymentHelpers';
import EpayDataTable, {
  EpayDataTableColumnDefinition,
} from 'shared/components/EpayDataTable';
import {
  selectPaymentDisableMessageText,
  selectPaymentConfig,
} from 'redux/selectors/configSelectors';
import {
  formatInvoiceStatus,
  isOverDue,
  toCurrencyString,
  toFormattedDateString,
} from 'utilities/utilities';
import { languageSelector } from 'redux/reducers';

import InvoiceDialog from '../invoices/InvoiceDialog';
import InvoiceFilters from '../invoices/InvoiceFilters';
import InvoiceCardList from '../invoices/InvoiceCardList';
import ScheduledPaymentsTable from './ScheduledPaymentsTable';
import ScheduledPaymentsCardsList from './ScheduledPaymentsCardsList';
import DeleteConfirmModal from '../settings/users/DeleteConfirmModal';
import { useScheduledPaymentsData } from 'hooks/useScheduledPaymentsData';

interface InvoiceColumnsConfig {
  f: (id: string) => string;
  filters: InvoiceFilterState | undefined;
  regionalFormat: string;
  theme: Theme;
  handleSubmit: (data: Invoice) => void;
  handlePdfDownload: (data: Invoice) => Promise<void>;
  showPdfActions: boolean;
  showDaysTillDue: boolean;
}

function buildInvoiceColumns({
  f,
  filters,
  regionalFormat,
  theme,
  handleSubmit,
  handlePdfDownload,
  showPdfActions,
  showDaysTillDue,
}: InvoiceColumnsConfig): EpayDataTableColumnDefinition[] {
  const colDefs: EpayDataTableColumnDefinition[] = [
    {
      header: f('invoices.table.status'),
      field: 'invoiceStatus',
      sortable: true,
      alignment: 'left',
      renderer: (data) => formatInvoiceStatus(data, f),
    },
    {
      header: f('invoices.table.reference'),
      field: 'referenceNumber',
      sortable: true,
      alignment: 'left',
      renderer: (data) =>
        data.referenceNumber ? data.referenceNumber.replace(/^0+/, '') : '',
      display: { xs: 'none', sm: 'none', md: 'none', lg: 'table-cell' },
    },
    {
      header: f('invoices.table.document'),
      field: 'billingDocumentNumber',
      sortable: true,
      alignment: 'left',
      renderer: (data) =>
        data.billingDocumentNumber ? (
          <Button
            variant="link"
            size="small"
            onClick={() => handleSubmit(data)}
            sx={{ padding: 0 }}
          >
            {data.billingDocumentNumber.replace(/^0+/, '')}
          </Button>
        ) : (
          <Typography
            variant="body2"
            align="center"
            sx={{
              height: '32px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {data.documentNumberFinance?.replace(/^0+/, '') ?? ''}
          </Typography>
        ),
    },
    {
      header: f('invoices.table.date'),
      field: 'documentDate',
      sortable: true,
      alignment: 'left',
      renderer: (data) =>
        data.documentDate
          ? toFormattedDateString(data.documentDate, regionalFormat)
          : '',
    },
    {
      header: f('invoices.table.total'),
      field: 'totalAmount',
      sortable: true,
      alignment: 'left',
      renderer: (data) =>
        toCurrencyString(
          data.currencyKey || filters?.currencyType || '',
          data.totalAmount ?? 0,
          true,
          regionalFormat,
        ),
    },
    {
      header: f('invoices.table.paid'),
      field: 'paidAmount',
      sortable: true,
      alignment: 'left',
      renderer: (data) =>
        toCurrencyString(
          data.currencyKey || filters?.currencyType || '',
          data.paidAmount ?? 0,
          true,
          regionalFormat,
        ),
    },
    {
      header: f('invoices.table.open'),
      field: 'openAmount',
      sortable: true,
      alignment: 'left',
      renderer: (data) =>
        toCurrencyString(
          data.currencyKey || filters?.currencyType || '',
          data.openAmount ?? 0,
          true,
          regionalFormat,
        ),
    },
    {
      header: f('invoices.table.due'),
      field: 'dueDate',
      sortable: true,
      alignment: 'left',
      renderer: (data) => {
        if (data.dueDate) {
          if (new Date(data.dueDate) < new Date()) {
            return (
              <Typography
                variant="fieldHeader"
                color={theme.palette.error.main}
              >
                {toFormattedDateString(data.dueDate, regionalFormat)}
              </Typography>
            );
          } else {
            return toFormattedDateString(data.dueDate, regionalFormat);
          }
        }
        return '';
      },
    },
    {
      header: f('invoices.table.account'),
      field: 'soldtoNumber',
      alignment: 'left',
      renderer: (data) => data.soldtoNumber.replace(/^0+/, ''),
    },
  ];

  if (showPdfActions) {
    colDefs.push({
      header: f('invoices.table.pdf'),
      field: 'hasKeys',
      alignment: 'center',
      renderer: (data) =>
        data.hasKey ? (
          <EpayPdfIcon
            sx={{
              color: theme.palette.error.main,
              cursor: 'pointer',
            }}
            onClick={() => handlePdfDownload(data)}
          />
        ) : (
          <EpayPdfIcon
            sx={{
              color: theme.palette.text.disabled,
            }}
          />
        ),
    });
  }

  if (showDaysTillDue) {
    colDefs.push({
      header: f('invoices.table.days'),
      field: 'daysInArrears',
      sortable: true,
      alignment: 'left',
      display: { xs: 'none', sm: 'none', md: 'none', lg: 'table-cell' },
      renderer: (data) =>
        (data.openAmount ?? 0) > 0 ? (
          data.daysInArrears &&
          data.daysInArrears > 0 &&
          isOverDue(data) && (
            <Typography variant="fieldHeader" color={theme.palette.error.main}>
              -{data.daysInArrears}
            </Typography>
          )
        ) : (
          <></>
        ),
    });
  }

  return colDefs;
}

const SCHEDULED_PAYMENTS_DEFAULT_SORT = {
  field: 'dueDate',
  direction: 'asc',
} as const;

export default function ScheduledPayments() {
  const theme = useTheme();
  const intl = useIntl();
  const [searchParams] = useSearchParams();
  const f = (id: string) => intl.formatMessage({ id, defaultMessage: id });
  const query = new URLSearchParams(useLocation().search);
  const newId = query.get('newId');
  const currencyParam = query.get('currency') || '';
  const { navigate } = useEpayNavigate();

  const selectedLanguage = useAppSelector(languageSelector);
  const paymentDisableMessageText = useAppSelector(
    selectPaymentDisableMessageText,
  );
  const config = useAppSelector(selectPaymentConfig);

  const [tabValue, setTabValue] = useState(() => {
    const tabParam = searchParams.get('tab');
    return tabParam === 'scheduled' ? '2' : '1';
  });
  const previousTabValueRef = useRef(tabValue);
  const [showPayment] = useState(false);

  useSetGlobalSettings();

  const {
    relatedAccounts,
    filters,
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
  } = useScheduledPaymentsData(currencyParam);

  // Sync tab and currency from URL parameters
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    setTabValue(tabParam === 'scheduled' ? '2' : '1');
    const currencyUrlParam = searchParams.get('currency');
    if (currencyUrlParam) {
      setSelectedCurrency(currencyUrlParam);
    }
  }, [searchParams]);

  // Reload invoices when switching to tab 1
  useEffect(() => {
    const previousTabValue = previousTabValueRef.current;
    previousTabValueRef.current = tabValue;

    if (previousTabValue !== '1' && tabValue === '1' && filters) {
      getData(filters);
    }
  }, [filters, getData, tabValue]);

  const handleTabChange = (event: SyntheticEvent, newValue: string) => {
    setTabValue(newValue);
    const newSearchParams = new URLSearchParams(searchParams);
    if (newValue === '2') {
      newSearchParams.set('tab', 'scheduled');
    } else {
      newSearchParams.delete('tab');
    }
    navigate(`/scheduleddetails?${newSearchParams.toString()}`, {
      replace: true,
    });
  };

  const colDefs = buildInvoiceColumns({
    f,
    filters,
    regionalFormat,
    theme,
    handleSubmit,
    handlePdfDownload,
    showPdfActions,
    showDaysTillDue,
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
            ...(paymentAmount > 0 && {
              border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
              '&:hover': {
                border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
              },
            }),
            width: { xs: '100%', sm: '180px' },
          }}
          variant="contained"
          disabled={paymentAmount <= 0}
          onClick={() => handlePay(soldTo, payer)}
        >
          {f('schedule.payment.button.text')}
        </Button>
      )}
    </>
  );

  return (
    <>
      <Box
        width="100%"
        margin="1rem 0"
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
        <Grid container flexDirection="column" rowGap="2rem">
          <Grid container spacing={{ xs: 2, sm: 0 }}>
            <EpayPageHeaderText
              header={f('header.schedule_payments')}
              subheader={f('header.schedule_payment.subheader')}
            />
          </Grid>

          <Grid item sx={{ marginTop: '-0.10rem' }}>
            <Grid
              container
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              justifyContent="space-between"
              spacing={1}
              position="sticky"
              top="var(--app-header-height, 70px)"
              zIndex={1}
              sx={{
                width: '100%',
                backgroundColor: theme.palette.background.default,
              }}
            >
              <Grid item xs={12} sm sx={{ marginRight: '-8px' }}>
                <EpayTabContext value={tabValue}>
                  <EpayBox
                    height="48px"
                    boxSizing="border-box"
                    display="flex"
                    sx={{
                      width: { xs: '100%', sm: 'fit-content' },
                      padding: '0.25rem',
                      paddingLeft: '0.1875rem',
                      '@media (min-resolution: 1.25dppx)': {
                        paddingLeft: '0.25rem',
                      },
                      backgroundColor: '#eeeff2', //TODO: get from theme
                      alignItems: 'center',
                    }}
                  >
                    <EpayTabList
                      onChange={handleTabChange}
                      sx={{
                        minHeight: '40px',
                        '& .MuiTabs-indicator': {
                          display: 'none',
                        },
                        '& .Mui-selected': {
                          backgroundColor: (theme) =>
                            theme.palette.background.paper,
                          color: '#0D0D12 !important',
                        },
                        '& .MuiTab-root': {
                          color: '#6f7687',
                          minHeight: '40px',
                          padding: '0px 16px',
                          lineHeight: '40px',
                          fontSize: '12px',
                          whiteSpace: 'nowrap',
                          minWidth: 'auto',
                          flex: '0 0 auto',
                        },
                      }}
                      id="scheduledPaymentsTabs"
                    >
                      <Tab
                        value="1"
                        label={
                          <Typography
                            variant="h6"
                            color="inherit"
                            sx={{ lineHeight: '40px', whiteSpace: 'nowrap' }}
                          >
                            {f('header.invoices')}
                          </Typography>
                        }
                        sx={{
                          borderRadius: '6px',
                          minHeight: '40px',
                          padding: '0px 16px',
                          minWidth: 'auto',
                          flex: '0 0 auto',
                        }}
                      />
                      <Tab
                        value="2"
                        label={
                          <Typography
                            variant="h6"
                            color="inherit"
                            sx={{ lineHeight: '40px', whiteSpace: 'nowrap' }}
                          >
                            {f('header.scheduledpayments')}
                          </Typography>
                        }
                        sx={{
                          borderRadius: '6px',
                          minHeight: '40px',
                          padding: '0px 16px',
                          minWidth: 'auto',
                          flex: '0 0 auto',
                        }}
                      />
                    </EpayTabList>
                  </EpayBox>
                </EpayTabContext>
              </Grid>
              <Grid
                item
                xs={12}
                sm="auto"
                flexDirection={{ xs: 'column', sm: 'row' }}
                flexWrap="wrap"
                whiteSpace="nowrap"
                alignItems={{ xs: 'stretch', sm: 'center' }}
                gap={{ xs: 1, sm: 0 }}
                sx={{
                  display: tabValue === '2' ? 'none' : 'flex',
                  justifyContent: { xs: 'stretch', sm: 'flex-end' },
                  marginRight: '-8px',
                }}
              >
                {selectedPayBarContent}
              </Grid>
            </Grid>

            <Grid item>
              <EpayTabContext value={tabValue}>
                <EpayTabPanel
                  value="1"
                  sx={{
                    padding: 0,
                    marginTop: '1.1rem',
                  }}
                >
                  <Grid container flexDirection="column" rowGap="2rem">
                    {/* Desktop Invoice Table */}
                    <Grid sx={{ display: { xs: 'none', md: 'block' } }} item>
                      <Box>
                        <EpayDataTable
                          showTotal={false}
                          colDefs={colDefs}
                          data={filteredInvoices}
                          selectedInvoices={selectedDocs}
                          defaultSort={SCHEDULED_PAYMENTS_DEFAULT_SORT}
                          showSelectionCheck={true}
                          onSelectionChange={handleSelectionChange}
                          canMakePayment={canMakePayment}
                          width="100%"
                          selectionCellPaddingLeft="12px"
                          noDataMessage={f('invoices.noopen.invoice')}
                          filterSelectors={
                            <InvoiceFilters
                              subAccounts={relatedAccounts}
                              currencies={currencyTypes}
                              filters={filters}
                              data={filteredInvoices}
                              selectedInvoices={selectedDocs}
                              onChange={(
                                e: InvoiceFilterState,
                                requery: boolean,
                              ) => updateFilters(e, requery)}
                            />
                          }
                        />
                      </Box>
                    </Grid>

                    {/* Mobile Invoice Cards */}
                    <Grid item display={{ xs: 'block', md: 'none' }}>
                      <InvoiceCardList
                        data={filteredInvoices}
                        currency={filters?.currencyType ?? ''}
                        onSelectionChange={handleSelectionChange}
                        handlePdfDownload={handlePdfDownload}
                        showPdfActions={showPdfActions}
                        width="100%"
                        noDataMessage={f('invoices.noopen.invoice')}
                        selectedInvoices={selectedDocs}
                        isMobile={isMobile}
                        isScheduledpayment={true}
                        filterSelectors={
                          <InvoiceFilters
                            subAccounts={relatedAccounts}
                            currencies={currencyTypes}
                            filters={filters}
                            isMobile={isMobile}
                            data={filteredInvoices}
                            selectedInvoices={selectedDocs}
                            onChange={(
                              e: InvoiceFilterState,
                              requery: boolean,
                            ) => updateFilters(e, requery)}
                          />
                        }
                        handleSubmit={handleSubmit}
                      />
                    </Grid>
                  </Grid>
                </EpayTabPanel>

                <EpayTabPanel
                  value="2"
                  sx={{
                    padding: 0,
                    marginTop: '1rem',
                  }}
                >
                  {/* Desktop Scheduled Payments Table */}
                  <Grid item display={{ xs: 'none', md: 'block' }}>
                    <ScheduledPaymentsTable
                      data={filteredScheduledInvoices}
                      onDelete={openDeleteModal}
                      isNew={newId ?? ''}
                      selectedCurrency={selectedCurrency}
                      setSelectedCurrency={setSelectedCurrency}
                      currencyOptions={currencyOptions}
                      regionalFormat={regionalFormat}
                    />
                  </Grid>

                  {/* Mobile Scheduled Payments Cards List */}
                  <Grid item display={{ xs: 'block', md: 'none' }}>
                    <ScheduledPaymentsCardsList
                      data={filteredScheduledInvoices}
                      width="100%"
                      noDataMessage="No scheduled payments found"
                      onDelete={openDeleteModal}
                      isNew={newId ?? ''}
                      selectedCurrency={selectedCurrency}
                      setSelectedCurrency={setSelectedCurrency}
                      currencyOptions={currencyOptions}
                      regionalFormat={regionalFormat}
                    />
                  </Grid>
                </EpayTabPanel>
              </EpayTabContext>
            </Grid>
          </Grid>
        </Grid>
      </Box>

      <InvoiceDialog
        open={open}
        onClose={handleClose}
        onPayInvoice={handleSelectedInvoiceSchedulePayment}
        payInvoiceLabelId="schedule.payment.button.text"
        selectedInvoice={selectedInvoice}
      />
      <DeleteConfirmModal
        open={modalOpen}
        onClose={handleDeleteClose}
        onOk={handleOk}
        message={f('user_account.confirm_delete_scheduled_message')}
      />
      <EpayPdfViewer
        open={pdfModalOpen}
        pdfUrl={pdfUrl}
        onClose={handlePdfModalClose}
      />
    </>
  );
}
