import { ReactNode } from 'react';

import { Invoice } from 'types/InvoicesSearchRequest';
import { getInvoiceKey } from 'utilities/utilities';
import MobileCardListShell from 'shared/components/common/MobileCardListShell';
import { usePaginatedCardList } from 'shared/components/common/usePaginatedCardList';

import InvoiceCard from './InvoiceCard';

interface EpayInvoiceCardListProps {
  data: Invoice[];
  width?: string | null;
  noDataMessage?: string;
  currency: string;
  selectedInvoices: Invoice[];
  isMobile: boolean;
  showPdfActions?: boolean;
  filterSelectors?: ReactNode;
  isScheduledpayment?: boolean;
  canMakePayment?: boolean;
  onPageChange?: (e: number) => void;
  onSelectionChange?: (e: Invoice[]) => void;
  handleSubmit: (e: Invoice) => void;
  handlePdfDownload: (e: Invoice) => void;
}

export default function InvoiceCardList({
  data,
  filterSelectors,
  noDataMessage,
  currency,
  onPageChange,
  onSelectionChange,
  handleSubmit,
  handlePdfDownload,
  selectedInvoices,
  isMobile,
  showPdfActions,
  isScheduledpayment,
  canMakePayment = true,
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
    syncSelection: {
      selected: selectedInvoices,
      getKey: getInvoiceKey,
      resyncDeps: [isMobile],
    },
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
      filterSelectorsSx={{ padding: '16px 5%' }}
      pagerSx={{ padding: '0 2%' }}
      pagerEdgePadding={false}
      noDataMessage={noDataMessage}
    >
      {currentDataSet.map((item) => (
        <InvoiceCard
          currency={currency}
          key={getInvoiceKey(item)}
          data={item}
          width="90%"
          showPdfActions={showPdfActions ?? false}
          canMakePayment={canMakePayment}
          onSelect={handleRowSelection}
          handleSubmit={handleSubmit}
          handlePdfDownload={handlePdfDownload}
          isScheduledpayment={isScheduledpayment}
        />
      ))}
    </MobileCardListShell>
  );
}
