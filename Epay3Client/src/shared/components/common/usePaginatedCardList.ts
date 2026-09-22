import { useEffect, useState } from 'react';

interface Selectable {
  isSelected?: boolean;
}

export interface PaginatedCardListOptions<T> {
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  clearSelectionOnSlice?: boolean;
  syncSelection?: {
    selected: T[];
    getKey: (item: T) => string;
    resyncDeps?: unknown[];
  };
  onPageChange?: (page: number) => void;
  onSelectionChange?: (items: T[]) => void;
}

const fieldValue = <T>(item: T, sortField: string) =>
  (item as Record<string, unknown>)[sortField];

const sortByFieldNullsLast = <T>(
  data: T[],
  sortField: string,
  sortDirection: 'asc' | 'desc' = 'asc',
): T[] => {
  const hasValue = (x: T) => {
    const value = fieldValue(x, sortField);
    return value !== undefined && value !== null && String(value).length > 0;
  };

  const notNulls = data.filter(hasValue);
  const nulls = data.filter((x) => !hasValue(x));

  const ordered = notNulls.sort((a, b) => {
    const aVal = fieldValue(a, sortField) as string | number | null;
    const bVal = fieldValue(b, sortField) as string | number | null;
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return -1;
    if (bVal == null) return 1;
    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
    return 0;
  });

  if (sortDirection === 'desc') {
    ordered.reverse();
  }

  return [...ordered, ...nulls];
};

export function usePaginatedCardList<T>(
  data: T[],
  {
    sortField,
    sortDirection = 'asc',
    clearSelectionOnSlice = false,
    syncSelection,
    onPageChange,
    onSelectionChange,
  }: PaginatedCardListOptions<T> = {},
) {
  const [dataSet, setDataSet] = useState<T[]>();
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentDataSet, setCurrentDataSet] = useState<T[]>([]);

  useEffect(() => {
    if (data) {
      setDataSet(
        sortField ? sortByFieldNullsLast(data, sortField, sortDirection) : data,
      );
      setTotalPages(Math.ceil(data.length / itemsPerPage));
      setCurrentPage(1);
    } else {
      setTotalPages(0);
      setCurrentDataSet([]);
    }
  }, [data, sortDirection, sortField]);

  useEffect(() => {
    if (!syncSelection || !data) {
      return;
    }
    const selectedKeys = new Set(
      syncSelection.selected.map(syncSelection.getKey),
    );
    setDataSet(
      data.map(
        (item) =>
          ({
            ...item,
            isSelected: selectedKeys.has(syncSelection.getKey(item)),
          }) as T,
      ),
    );
  }, [data, ...(syncSelection?.resyncDeps ?? [])]);

  useEffect(() => {
    if (dataSet) {
      if (clearSelectionOnSlice) {
        dataSet.forEach((item) => ((item as Selectable).isSelected = false));
      }
      const skipped = dataSet.slice((currentPage - 1) * itemsPerPage);
      setCurrentDataSet(skipped.slice(0, itemsPerPage));
      if (clearSelectionOnSlice && onSelectionChange) {
        onSelectionChange([]);
      }
    }
  }, [dataSet, currentPage, totalPages, itemsPerPage]);

  useEffect(() => {
    if (data) {
      setTotalPages(Math.ceil(data.length / itemsPerPage));
      setCurrentPage(1);
    } else {
      setTotalPages(0);
      setCurrentDataSet([]);
    }
  }, [itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    onPageChange?.(page);
  };

  const handleRowSelection = (selected: boolean, item: T) => {
    (item as Selectable).isSelected = selected;
    if (dataSet && onSelectionChange) {
      onSelectionChange(
        dataSet.filter((entry) => (entry as Selectable).isSelected),
      );
    }
  };

  return {
    currentDataSet,
    totalPages,
    currentPage,
    itemsPerPage,
    setItemsPerPage,
    handlePageChange,
    handleRowSelection,
  };
}
