import { ReactNode } from 'react';

import { Invoice } from 'types/InvoicesSearchRequest';
import { getInvoiceKey } from 'utilities/utilities';
import MobileCardListShell from 'shared/components/common/MobileCardListShell';
import { usePaginatedCardList } from 'shared/components/common/usePaginatedCardList';

import InvoiceHistoryCard from './InvoiceHistoryCard';

interface EpayInvoiceCardListProps {
  data: Invoice[];
  width?: string | null;
  isPreSearch?: boolean;
  preSearchMessage?: string;
  noDataMessage?: string;
  showPdfActions: boolean;
  onPageChange?: (e: number) => void;
  onSelectionChange?: (e: Invoice[]) => void;
  filterSelectors?: ReactNode;
  handlePdfDownload: (e: Invoice) => void;
  handleInvoicePreview: (e: Invoice) => void;
}

export default function InvoiceHistoryCardList({
  data,
  filterSelectors,
  isPreSearch = false,
  preSearchMessage,
  noDataMessage,
  showPdfActions,
  onPageChange,
  onSelectionChange,
  handlePdfDownload,
  handleInvoicePreview,
}: EpayInvoiceCardListProps) {
  const {
    currentDataSet,
    totalPages,
    currentPage,
    itemsPerPage,
    setItemsPerPage,
    handlePageChange,
    handleRowSelection,
  } = usePaginatedCardList(data, {
    sortField: 'dueDate',
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
        <InvoiceHistoryCard
          key={getInvoiceKey(item)}
          data={item}
          width="90%"
          showPdfActions={showPdfActions}
          onSelect={handleRowSelection}
          handlePdfDownload={handlePdfDownload}
          handleInvoicePreview={handleInvoicePreview}
        />
      ))}
    </MobileCardListShell>
  );
}
