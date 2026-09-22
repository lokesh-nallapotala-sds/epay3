import { useRef } from 'react';
import type { Ref } from 'react';

import { useAppSelector } from 'redux/hooks';
import useEpayNavigate from 'hooks/useEpayNavigate';
import { Grid } from '@mui/material';
import { useEpayToast } from 'providers/EpayToastProvider';
import InvoiceDialog from 'components/invoices/InvoiceDialog';
import CreditPaymentDetailsModal from 'components/payments/CreditPaymentDetailsModal';
import { EpayPaymentService } from 'services/EpayPaymentService';
import {
  selectCompanyCodes,
  selectShowPaymentHistoryFilter,
} from 'redux/selectors/configSelectors';
import {
  useEffectiveAccount,
  useRelatedAccounts,
} from 'hooks/usePaymentHelpers';
import {
  impersonatedUserSelector,
  regionalFormatSelector,
  userSelector,
} from 'redux/reducers';
import EpayDataTable from 'shared/components/EpayDataTable';
import DateRangePopup from 'shared/components/DateComponents/DateRangePopUp';

import PaymentHistoryCardList from './PaymentHistoryCardList';
import PaymentHistoryFilterSelectors from './PaymentHistoryFilterSelectors';
import { buildPaymentHistoryColumns } from './paymentHistory/paymentHistoryColumns';
import {
  usePaymentHistoryData,
  type InvoiceHistoryHandle,
} from './paymentHistory/usePaymentHistoryData';
import MobilePaymentHistoryFilters from './paymentHistory/MobilePaymentHistoryFilters';
import { useFormat } from 'hooks/useFormat';

export type { InvoiceHistoryHandle };

const PAYMENT_HISTORY_DEFAULT_SORT = {
  field: 'documentNumberFinance',
  direction: 'desc',
} as const;

const PaymentHistory = ({ ref }: { ref?: Ref<InvoiceHistoryHandle> }) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { location, navigate } = useEpayNavigate(); // do not remove.

  const f = useFormat();
  const { showToastMessage } = useEpayToast();
  const relatedAccountsLoaded = useRelatedAccounts();
  const getPaymentHistory = EpayPaymentService.useGetPaymentHistory();

  const user = useAppSelector(userSelector);
  const regionalFormat = useAppSelector(regionalFormatSelector);
  const impersonatedUser = useAppSelector(impersonatedUserSelector);
  const selectedAccount = useEffectiveAccount();
  const showPaymentHistoryFilter = useAppSelector(
    selectShowPaymentHistoryFilter,
  );
  const companyCodes = useAppSelector(selectCompanyCodes);
  const dateFilterRef = useRef<HTMLDivElement>(null);

  const {
    isPreSearch,
    invoiceList,
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
  } = usePaymentHistoryData({
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
  });

  const colDefs = buildPaymentHistoryColumns({
    f,
    regionalFormat,
    handleSubmit,
    handlePaymentDetailsOpen,
  });

  if (!user) {
    return null;
  }

  return (
    <Grid container spacing={2} direction="column" marginTop="0rem">
      <Grid item display={{ xs: 'none', md: 'flex' }}>
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
        {/* TODO: figure out why we have to set max-height on the filters */}
        <EpayDataTable
          colDefs={colDefs}
          data={invoiceList}
          isPreSearch={isPreSearch}
          preSearchMessage={f('presearch.nodata')}
          noDataMessage={f('payments.nodata')}
          showTotal={false}
          defaultSort={PAYMENT_HISTORY_DEFAULT_SORT}
          width="100%"
          filterSelectors={
            <PaymentHistoryFilterSelectors
              {...buildFilterProps(false)}
              dateFilterRef={dateFilterRef}
              dateFilterActive={popupOpen}
            />
          }
        />
        <InvoiceDialog
          open={open}
          onClose={handleClose}
          selectedInvoice={selectedInvoice}
        />
        <CreditPaymentDetailsModal
          open={isPaymentDialogOpen}
          onClose={handlePaymentDialogClose}
          selectedPayment={selectedPayment}
        />
      </Grid>
      <Grid item flexDirection="column">
        <Grid item display={{ xs: 'block', md: 'none' }}>
          <PaymentHistoryCardList
            data={invoiceList}
            width="100%"
            isPreSearch={isPreSearch}
            preSearchMessage={f('presearch.nodata')}
            noDataMessage={f('payments.nodata')}
            handlePreviewInvoice={handleSubmit}
            handlePreviewPayment={handlePaymentDetailsOpen}
            regionalFormat={regionalFormat}
            filterSelectors={
              <MobilePaymentHistoryFilters
                f={f}
                filterOpen={filterOpen}
                setFilterOpen={setFilterOpen}
                handleExportData={handleExportData}
                invoiceList={invoiceList}
                filterProps={buildFilterProps(filterOpen)}
              />
            }
          />
        </Grid>
      </Grid>
    </Grid>
  );
};

export default PaymentHistory;
