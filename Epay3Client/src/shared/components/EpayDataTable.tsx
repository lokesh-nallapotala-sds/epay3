import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useIntl } from 'react-intl';

import { styled } from '@mui/material/styles';
import { Grid, Paper } from '@mui/material';
import EpaySortIcon from 'shared/icons/EpaySortIcon';
import { Invoice } from 'types/InvoicesSearchRequest';
import { getInvoiceKey as defaultGetInvoiceKey } from 'utilities/utilities';
import EpayAscSortIcon from 'shared/icons/EpayAscSortIcon';
import EpayDescSortIcon from 'shared/icons/EpayDescSortIcon';
import { Box, ResponsiveStyleValue, Theme } from '@mui/system';

import EpayDropDown from './EpayDropDown';
import EpayCheckBox from './EpayCheckBox';
import EpayPageNavigator from './EpayPageNavigator';

export interface EpayDataTableColumnDefinition<T = Invoice> {
  header?: ReactNode;
  field?: string | null;
  renderer?: (data: T) => ReactNode;
  sortable?: boolean;
  alignment?: 'left' | 'center' | 'right';
  width?: string | ResponsiveStyleValue<string | number | undefined>;
  padding?: string;
  display?:
    | ResponsiveStyleValue<
        string[] | React.CSSProperties['display'] | undefined
      >
    | ((
        theme: Theme,
      ) => ResponsiveStyleValue<
        string[] | React.CSSProperties['display'] | undefined
      >);
}

interface EpayDataTableProps<T extends object = Invoice> {
  colDefs: EpayDataTableColumnDefinition<T>[];
  data: T[];
  defaultSort?: DataSort;
  width?: string | null;
  nullsAtTheBotttom?: boolean;
  isPreSearch?: boolean;
  preSearchMessage?: string;
  noDataMessage?: string;
  showSelectionCheck?: boolean;
  totalSum?: string;
  showTotal?: boolean;
  showPagination?: boolean;
  filterSelectors?: ReactNode;
  selectedInvoices?: T[];
  isMobile?: boolean;
  canMakePayment?: boolean;
  selectionPlaceholderWidth?: string;
  selectionCellPaddingLeft?: string;
  onPageChange?: (e: number) => void;
  onSelectionChange?: (e: T[]) => void;
  getRowKey?: (item: T) => string;
}

export interface DataSort {
  field: string;
  direction: 'asc' | 'desc';
}

interface TableScrollWrapperProps {
  availableHeight: number;
}

interface TableBoxStyledProps {
  width?: string | null;
}

interface TRStyledProps {
  selected?: boolean;
}

interface THStyledProps {
  textAlign?: 'left' | 'center' | 'right';
  width?: string | ResponsiveStyleValue<string | number | undefined>;
  display?: EpayDataTableColumnDefinition['display'];
}

interface TDStyledProps {
  textAlign?: 'left' | 'center' | 'right';
  width?: string | ResponsiveStyleValue<string | number | undefined>;
  padding?: string;
  display?: EpayDataTableColumnDefinition['display'];
  verticalBorder?: boolean;
}

const TableBox = styled(Paper)<TableBoxStyledProps>(({ width, theme }) => ({
  width: width ?? '100%',
  border: `1px solid ${theme.mixins.border.color}`,
  overflow: 'hidden',
  boxShadow: 'none',
}));

const PAGE_BOTTOM_ALLOWANCE = 24;
const MIN_SCROLL_AREA_HEIGHT = 100;
const EMBEDDED_CONTENT_THRESHOLD = 80;
const EMBEDDED_MAX_HEIGHT = 500;
// Must exceed the largest below-box chrome the geometric estimate can't see
// (bounded by EMBEDDED_CONTENT_THRESHOLD - PAGE_BOTTOM_ALLOWANCE = 56px),
// or the grow / fit-correct branches would oscillate.
const GROW_RECOVERY_MARGIN = 64;

// Sizes the table's internal scroll area:
// - Embedded (> EMBEDDED_CONTENT_THRESHOLD of content below the box, e.g. user
//   edit forms): fixed EMBEDDED_MAX_HEIGHT cap — the page scrolls regardless,
//   so viewport-fitting would only crush the table.
// - Bottom-anchored (Home/History/...): fit to the viewport so the page never
//   grows a second, page-level scrollbar — a geometric estimate from the
//   wrapper's own document offset, then trimmed by any residual page overflow.
const useAvailableHeight = () => {
  const tableBoxRef = useRef<HTMLDivElement>(null);
  const scrollWrapperRef = useRef<HTMLDivElement>(null);
  const [availableHeight, setAvailableHeight] = useState(0);
  const lastGeometricRef = useRef(0);

  const measure = useCallback(() => {
    const box = tableBoxRef.current;
    const wrapper = scrollWrapperRef.current;
    if (!box || !wrapper) return;

    const boxRect = box.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    // <body> is this app's scroll container (global body { overflow: auto }),
    // so window.scrollY stays 0 — read body.scrollTop too.
    const scrollOffset =
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;
    const wrapperDocTop = wrapperRect.top + scrollOffset;
    const chromeBelowWrapper = boxRect.bottom - wrapperRect.bottom;

    // Deliberately body.scrollHeight, not documentElement.scrollHeight — the
    // latter is clamped to the viewport height, which would misread the empty
    // space under a fitted table as content and misclassify it as embedded.
    const contentBelowBox =
      document.body.scrollHeight - (boxRect.bottom + scrollOffset);

    const geometric = Math.floor(
      window.innerHeight -
        wrapperDocTop -
        chromeBelowWrapper -
        PAGE_BOTTOM_ALLOWANCE,
    );

    const pageOverflow = Math.max(
      document.body.scrollHeight - document.body.clientHeight,
      document.documentElement.scrollHeight -
        document.documentElement.clientHeight,
      0,
    );

    setAvailableHeight((prev) => {
      let next: number;
      if (contentBelowBox > EMBEDDED_CONTENT_THRESHOLD) {
        next = EMBEDDED_MAX_HEIGHT;
      } else if (
        Math.abs(geometric - lastGeometricRef.current) > 1 ||
        prev === 0
      ) {
        // Surrounding layout moved — re-baseline from the estimate.
        next = geometric;
      } else if (pageOverflow > 0) {
        // Trim chrome the estimate can't see (gaps/margins outside the box).
        next = prev - pageOverflow;
      } else if (geometric - prev > GROW_RECOVERY_MARGIN) {
        // Stuck under-sized (e.g. after a transient overflow) — grow back.
        next = geometric;
      } else {
        next = prev;
      }
      lastGeometricRef.current = geometric;

      next = Math.max(next, MIN_SCROLL_AREA_HEIGHT);
      // 1px tolerance so the after-every-render effect can't update-loop.
      return Math.abs(prev - next) > 1 ? next : prev;
    });
  }, []);

  // After every render: layout above the table changes with data, wrapping
  // filters, etc., and none of those notify this component.
  useEffect(() => {
    measure();
  });

  useEffect(() => {
    window.addEventListener('resize', measure);

    // Catches layout shifts from sibling components (summary cards populating,
    // fonts swapping) that move this table without re-rendering it.
    const bodyObserver = new ResizeObserver(() => measure());
    bodyObserver.observe(document.body);

    return () => {
      window.removeEventListener('resize', measure);
      bodyObserver.disconnect();
    };
  }, [measure]);

  return { tableBoxRef, scrollWrapperRef, availableHeight };
};

const TableScrollWrapper = styled('div')<TableScrollWrapperProps>(
  ({ availableHeight }) => ({
    overflowY: 'auto',
    maxHeight: availableHeight > 0 ? availableHeight : '500px',
    minHeight: '100px',

    '&::-webkit-scrollbar': {
      width: '8px',
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: 'gray',
      borderRadius: '4px',
    },
  }),
);

const TableBase = styled('table')(() => ({
  display: 'table',
  width: '100%',
  borderSpacing: '0px',
  minWidth: '600px',
}));

const TR = styled('tr')<TRStyledProps>(({ selected, theme }) => ({
  display: 'table-row',
  verticalAlign: 'middle',
  outline: '0px',
  backgroundColor: selected
    ? (theme.palette as any).highlight?.contrastText
    : 'inherit',
  borderBottom: '2px solid #EDF1F3',
}));

const FR = styled('tr')<TRStyledProps>(({ selected, theme }) => ({
  display: 'table-row',
  verticalAlign: 'middle',
  outline: '0px',
  backgroundColor: selected
    ? (theme.palette as any).highlight?.contrastText
    : 'inherit',
}));

const THead = styled('thead')(() => ({
  backgroundColor: '#F8F9FB', //TODO: need to get from theme
  position: 'sticky' as const,
  top: 0,
  zIndex: 1,
}));

const TH = styled('th')<THStyledProps>`
    vertical-align: middle;
    font-weight: 500;
    font-size: 14px;
    line-height: 1.5rem;
    border-bottom: ${({ theme }) => `1px solid ${theme.mixins.border.color}`};
    text-align: ${({ textAlign }) => textAlign ?? 'left'};
    padding: .5rem;
    color: ${({ theme }) => theme.palette.text.primary};
    width: ${({ width }) => {
      if (typeof width === 'string') return width;
      if (typeof width === 'object') return (width as any)?.xs ?? 'auto';
      return 'auto';
    }};
    background-color: 'inherit';
    display: ${({ display }) => (display as any)?.sm ?? 'table-cell'};
    white-space: nowrap;

    ${({ theme }) => theme.breakpoints.up('md')} {
         width: ${({ width }) => {
           if (typeof width === 'object')
             return (
               (width as any)?.md ??
               (width as any)?.sm ??
               (width as any)?.xs ??
               'auto'
             );
           return width ?? 'auto';
         }};
         display: ${({ display }) => (display as any)?.md ?? 'table-cell'};
    }

    ${({ theme }) => theme.breakpoints.up('lg')} {
         width: ${({ width }) => {
           if (typeof width === 'object')
             return (
               (width as any)?.lg ??
               (width as any)?.md ??
               (width as any)?.sm ??
               (width as any)?.xs ??
               'auto'
             );
           return width ?? 'auto';
         }};
         display: ${({ display }) => (display as any)?.lg ?? 'table-cell'};
    }

    ${({ theme }) => theme.breakpoints.up('xl')} {
         width: ${({ width }) => {
           if (typeof width === 'object')
             return (
               (width as any)?.xl ??
               (width as any)?.lg ??
               (width as any)?.md ??
               (width as any)?.sm ??
               (width as any)?.xs ??
               'auto'
             );
           return width ?? 'auto';
         }};
         display: ${({ display }) => (display as any)?.xl ?? 'table-cell'};
   `;

const TD = styled('td')<TDStyledProps>`
    vertical-align: middle;
    font-weight: 500;
    font-size: 14px;
    line-height: 21px;
    border-bottom: ${({ verticalBorder, theme }) =>
      verticalBorder ? `1px solid ${theme.mixins.border.color}` : ''};
    text-align: ${({ textAlign }) => textAlign ?? 'left'};
    padding: ${({ padding }) => padding ?? '8px'};
    color: ${({ theme }) => theme.palette.text.primary};
     width: ${({ width }) => {
       if (typeof width === 'string') return width;
       if (typeof width === 'object') return (width as any)?.sm ?? 'auto';
       return 'auto';
     }};
    display: ${({ display }) => (display as any)?.sm ?? 'table-cell'};

    ${({ theme }) => theme.breakpoints.up('md')} {
         width: ${({ width }) => {
           if (typeof width === 'object')
             return (
               (width as any)?.md ??
               (width as any)?.sm ??
               (width as any)?.xs ??
               'auto'
             );
           return width ?? 'auto';
         }};
         display: ${({ display }) => (display as any)?.md ?? 'table-cell'};
    }

    ${({ theme }) => theme.breakpoints.up('lg')} {
         width: ${({ width }) => {
           if (typeof width === 'object')
             return (
               (width as any)?.lg ??
               (width as any)?.md ??
               (width as any)?.sm ??
               (width as any)?.xs ??
               'auto'
             );
           return width ?? 'auto';
         }};
         display: ${({ display }) => (display as any)?.lg ?? 'table-cell'};
    }

    ${({ theme }) => theme.breakpoints.up('xl')} {
         width: ${({ width }) => {
           if (typeof width === 'object')
             return (
               (width as any)?.xl ??
               (width as any)?.lg ??
               (width as any)?.md ??
               (width as any)?.sm ??
               (width as any)?.xs ??
               'auto'
             );
           return width ?? 'auto';
         }};
         display: ${({ display }) => (display as any)?.xl ?? 'table-cell'};
   `;

export default function EpayDataTable<T extends object = Invoice>({
  colDefs,
  data,
  defaultSort,
  width,
  nullsAtTheBotttom = true,
  showSelectionCheck = false,
  isPreSearch = false,
  preSearchMessage,
  noDataMessage,
  onPageChange,
  onSelectionChange,
  totalSum,
  showTotal = false,
  showPagination = true,
  filterSelectors,
  selectedInvoices,
  canMakePayment = true,
  selectionPlaceholderWidth = '2px',
  selectionCellPaddingLeft,
  getRowKey,
}: EpayDataTableProps<T>) {
  const [sort, setSort] = useState<DataSort | undefined | null>(defaultSort);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const intl = useIntl();
  const f = (id: string) => intl.formatMessage({ id: id });

  const entriesCount = [
    {
      key: 25,
      value: f('datatable.entries.25'),
    },
    {
      key: 50,
      value: f('datatable.entries.50'),
    },
    {
      key: 100,
      value: f('datatable.entries.100'),
    },
  ];

  useEffect(() => {
    setSort(defaultSort ?? null);
  }, [defaultSort]);

  useEffect(() => {
    setCurrentPage(1);
  }, [data.length, itemsPerPage]);

  const resolveItemKey = useCallback(
    (item: T) => {
      if (getRowKey) {
        return getRowKey(item);
      }
      return defaultGetInvoiceKey(item as unknown as Invoice);
    },
    [getRowKey],
  );

  const dataSet = useMemo(() => {
    const selectedKeys = new Set(
      selectedInvoices?.map((doc) => resolveItemKey(doc)) ?? [],
    );
    return (data ?? []).map((item) => ({
      ...item,
      isSelected: selectedKeys.has(resolveItemKey(item)),
    }));
  }, [data, resolveItemKey, selectedInvoices]);

  const sortedDataSet = useMemo(() => {
    if (!sort) {
      return dataSet;
    }

    const compareValues = (a: T, b: T) => {
      const aVal = a[sort.field as keyof T];
      const bVal = b[sort.field as keyof T];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal);
      }

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return -1;
      if (bVal == null) return 1;
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
      return 0;
    };

    const nonNullItems = dataSet.filter(
      (item: T) =>
        item[sort.field as keyof T] !== undefined &&
        item[sort.field as keyof T] !== null &&
        String(item[sort.field as keyof T]).length > 0,
    );
    const nullItems = dataSet.filter(
      (item: T) =>
        item[sort.field as keyof T] === undefined ||
        item[sort.field as keyof T] === null ||
        String(item[sort.field as keyof T]).length === 0,
    );

    const ordered = [...(nullsAtTheBotttom ? nonNullItems : dataSet)].sort(
      compareValues,
    );

    if (sort.direction === 'desc') {
      ordered.reverse();
    }

    return nullsAtTheBotttom ? [...ordered, ...nullItems] : ordered;
  }, [dataSet, nullsAtTheBotttom, sort]);

  const totalPages = useMemo(
    () => Math.ceil(sortedDataSet.length / itemsPerPage),
    [itemsPerPage, sortedDataSet.length],
  );

  const currentDataSet = useMemo(() => {
    const skipped = sortedDataSet.slice((currentPage - 1) * itemsPerPage);
    return skipped.slice(0, itemsPerPage);
  }, [currentPage, itemsPerPage, sortedDataSet]);

  const selectAll =
    sortedDataSet.length > 0 && sortedDataSet.every((item) => item.isSelected);

  const handleSort = (field: string, direction: 'asc' | 'desc') => {
    const newSort: DataSort = { field, direction };
    setSort(newSort);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SortIcon = ({ def }: { def: EpayDataTableColumnDefinition<any> }) => {
    if (def.sortable && def.field && sort) {
      if (def.field !== sort.field) {
        return (
          <EpaySortIcon
            onClick={() => handleSort(def.field!, 'asc')}
            sx={{ cursor: 'pointer' }}
          />
        );
      } else {
        if (sort.direction === 'asc') {
          return (
            <EpayAscSortIcon
              onClick={() => handleSort(def.field!, 'desc')}
              sx={{ cursor: 'pointer' }}
            />
          );
        } else {
          return (
            <EpayDescSortIcon
              onClick={() => handleSort(def.field!, 'asc')}
              sx={{ cursor: 'pointer' }}
            />
          );
        }
      }
    } else {
      return <></>;
    }
  };

  const handlePageChange = (e: number) => {
    setCurrentPage(e);
    if (onPageChange) {
      onPageChange(e);
    }
  };
  const handleSelectAll = (isChecked: boolean) => {
    const updatedData = sortedDataSet.map((item) => ({
      ...item,
      isSelected: isChecked,
    }));
    if (onSelectionChange) {
      const selected = updatedData.filter((item) => item.isSelected);
      onSelectionChange(selected);
    }
  };

  const handleRowSelection = (isSelected: boolean, data: T) => {
    if (onSelectionChange) {
      const targetKey = resolveItemKey(data);
      const updatedData = sortedDataSet.map((item) =>
        resolveItemKey(item) === targetKey
          ? { ...item, isSelected }
          : item,
      );
      const selected = updatedData.filter((item) => item.isSelected);
      onSelectionChange(selected);
    }
  };
  const { tableBoxRef, scrollWrapperRef, availableHeight } =
    useAvailableHeight();

  return (
    <TableBox
      ref={tableBoxRef}
      width={width}
      sx={{
        borderTopLeftRadius: filterSelectors ? '12px' : '0px',
        borderTopRightRadius: filterSelectors ? '12px' : '0px',
      }}
    >
      <Grid container flexDirection="column" paddingBottom=".8rem">
        <Grid item sx={{ marginLeft: '5px' }} id="filter-selectors">
          {!!filterSelectors && (
            <Box sx={{ padding: '1.125rem' }}>{filterSelectors}</Box>
          )}
        </Grid>
        <Grid item>
          <TableScrollWrapper
            ref={scrollWrapperRef}
            availableHeight={availableHeight}
          >
            <TableBase>
              <THead>
                <TR>
                  {showSelectionCheck ? ( // If true, render the checkbox
                    <TH
                      key="-1"
                      textAlign="right"
                      style={{ paddingLeft: selectionCellPaddingLeft }}
                    >
                      <EpayCheckBox
                        checked={selectAll}
                        onClick={handleSelectAll}
                        disabled={!canMakePayment}
                      />
                    </TH>
                  ) : (
                    // If false, render an empty TH
                    <TH width={selectionPlaceholderWidth} key="-1">
                      <Grid sx={{ height: '26px' }}></Grid>
                    </TH>
                  )}
                  {colDefs.map((def, i) => {
                    return (
                      <TH
                        key={i}
                        textAlign={def.alignment}
                        width={def.width as string}
                        display={def.display}
                      >
                        {def.header} {<SortIcon def={def} />}
                      </TH>
                    );
                  })}
                </TR>
              </THead>
              <tbody>
                {currentDataSet &&
                  currentDataSet.map((item: T) => {
                    return (
                      <TR
                        key={resolveItemKey(item)}
                        selected={(item as any).isSelected}
                      >
                        {showSelectionCheck ? (
                          <TD
                            key="-1"
                            textAlign="right"
                            verticalBorder={true}
                            style={{ paddingLeft: selectionCellPaddingLeft }}
                          >
                            <EpayCheckBox
                              checked={(item as any).isSelected || false}
                              onClick={(e) => handleRowSelection(e, item)}
                              disabled={!canMakePayment}
                            />
                          </TD>
                        ) : (
                          <TD
                            key="-1"
                            width={selectionPlaceholderWidth}
                            textAlign="right"
                            verticalBorder={true}
                          />
                        )}

                        {colDefs.map((def, i) => {
                          return (
                            <TD
                              key={i}
                              textAlign={def.alignment}
                              width={def.width as string}
                              padding={def.padding}
                              display={def.display}
                              verticalBorder={true}
                            >
                              {def.renderer
                                ? def.renderer(item)
                                : def.field
                                  ? (item[
                                      def.field as keyof T
                                    ] as React.ReactNode)
                                  : ''}
                            </TD>
                          );
                        })}
                      </TR>
                    );
                  })}
              </tbody>
              <tfoot>
                {showTotal && (
                  <FR>
                    <TD colSpan={6}>{f('invoices.table.total')}</TD>
                    <TD>{totalSum}</TD>
                  </FR>
                )}
              </tfoot>
            </TableBase>
          </TableScrollWrapper>
        </Grid>
        {showPagination && data && data.length > 0 && (
          <Grid
            item
            container
            justifyContent="space-between"
            marginTop="2rem"
            sm={12}
            lg={12}
            md={12}
            id="paginator"
          >
            <Grid item paddingLeft="1rem" lg={6}>
              <EpayPageNavigator
                totalPages={totalPages}
                currentPage={currentPage}
                onPageChange={handlePageChange}
              />
            </Grid>
            <Grid item paddingRight="1rem">
              <EpayDropDown
                data={entriesCount}
                value={itemsPerPage}
                optionKey="key"
                optionText="value"
                optionsLocation="top"
                width="10rem"
                onSelect={(e) => setItemsPerPage(e as number)}
              />
            </Grid>
          </Grid>
        )}
        <Grid item paddingTop="1rem" textAlign="center">
          {!isPreSearch && noDataMessage && (!data || data.length === 0) && (
            <>{noDataMessage}</>
          )}
          {isPreSearch && <>{preSearchMessage}</>}
        </Grid>
      </Grid>
    </TableBox>
  );
}
