import { ReactNode } from 'react';

import { PaymentHistoryRow } from 'types/InvoicesSearchRequest';
import MobileCardListShell from 'shared/components/common/MobileCardListShell';
import { usePaginatedCardList } from 'shared/components/common/usePaginatedCardList';

import PaymentHistoryCard from './PaymentHistoryCard';

const getPaymentRowKey = (row: PaymentHistoryRow) =>
  `${row.documentNumberFinance}-${row.billingDocumentNumber}`;

interface EpayPaymentCardListProps {
  data: PaymentHistoryRow[];
  width?: string | null;
  isPreSearch?: boolean;
  preSearchMessage?: string;
  noDataMessage?: string;
  filterSelectors?: ReactNode;
  onPageChange?: (e: number) => void;
  onSelectionChange?: (e: PaymentHistoryRow[]) => void;
  handlePreviewInvoice: (e: PaymentHistoryRow) => void;
  handlePreviewPayment: (e: PaymentHistoryRow) => void;
  regionalFormat?: string | null;
}

export default function PaymentHistoryCardList({
  data,
  filterSelectors,
  isPreSearch = false,
  preSearchMessage,
  noDataMessage,
  onPageChange,
  onSelectionChange,
  handlePreviewInvoice,
  handlePreviewPayment,
  regionalFormat,
}: EpayPaymentCardListProps) {
  const {
    currentDataSet,
    totalPages,
    currentPage,
    itemsPerPage,
    setItemsPerPage,
    handlePageChange,
    handleRowSelection,
  } = usePaginatedCardList(data, {
    sortField: 'documentNumberFinance',
    sortDirection: 'desc',
    clearSelectionOnSlice: true,
    onPageChange,
    onSelectionChange,
  });

  return (
    <MobileCardListShell
      hasData={!!data && data.length > 0}
      totalPages={totalPages}
      currentPage={currentPage}
      itemsPerPage={itemsPerPage}
      onPageChange={handlePageChange}
      onItemsPerPageChange={setItemsPerPage}
      filterSelectors={filterSelectors}
      isPreSearch={isPreSearch}
      preSearchMessage={preSearchMessage}
      noDataMessage={noDataMessage}
    >
      {currentDataSet.map((item) => (
        <PaymentHistoryCard
          key={getPaymentRowKey(item)}
          data={item}
          width="90%"
          onSelect={handleRowSelection}
          handlePreviewInvoice={handlePreviewInvoice}
          handlePreviewPayment={handlePreviewPayment}
          regionalFormat={regionalFormat}
        />
      ))}
    </MobileCardListShell>
  );
}
