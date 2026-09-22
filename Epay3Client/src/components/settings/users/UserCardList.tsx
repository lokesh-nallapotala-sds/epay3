import { ReactNode } from 'react';

import {
  DataSort,
  EpayDataTableColumnDefinition,
} from 'shared/components/EpayDataTable';
import { User } from 'types';
import MobileCardListShell from 'shared/components/common/MobileCardListShell';
import { usePaginatedCardList } from 'shared/components/common/usePaginatedCardList';

import UserCard from './UserCard';

interface UserCardListProps {
  data: User[];
  width?: string | null;
  noDataMessage?: string;
  filterSelectors?: ReactNode;
  defaultSort?: DataSort;
  colDefs: EpayDataTableColumnDefinition<any>[];
}

export default function UserCardList({
  data,
  filterSelectors,
  noDataMessage,
  colDefs,
}: UserCardListProps) {
  const {
    currentDataSet,
    totalPages,
    currentPage,
    itemsPerPage,
    setItemsPerPage,
    handlePageChange,
  } = usePaginatedCardList(data);

  return (
    <MobileCardListShell
      hasData={!!data && data.length > 0}
      totalPages={totalPages}
      currentPage={currentPage}
      itemsPerPage={itemsPerPage}
      onPageChange={handlePageChange}
      onItemsPerPageChange={setItemsPerPage}
      filterSelectors={filterSelectors}
      filterSelectorsSx={{ padding: '12px', paddingBottom: '16px' }}
      noDataMessage={noDataMessage}
    >
      {currentDataSet.map((item) => (
        <UserCard key={item.userId} data={item} width="90%" colDefs={colDefs} />
      ))}
    </MobileCardListShell>
  );
}
