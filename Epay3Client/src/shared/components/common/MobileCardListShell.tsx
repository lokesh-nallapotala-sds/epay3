import { ReactNode } from 'react';

import { useIntl } from 'react-intl';

import { Box } from '@mui/system';
import styled from '@emotion/styled';
import { Grid, Paper, SxProps } from '@mui/material';
import EpayDropDown from 'shared/components/EpayDropDown';
import EpayPageNavigator from 'shared/components/EpayPageNavigator';

interface CardListBoxProps {
  width?: string;
  bottomMargin?: string;
}

const CardListBox = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'bottomMargin' && prop !== 'width',
})<CardListBoxProps>(({ width, bottomMargin }) => ({
  overflowX: 'auto',
  width: width ?? '100%',
  marginBottom: bottomMargin ?? '20px',
}));

interface MobileCardListShellProps {
  children: ReactNode;
  hasData: boolean;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (count: number) => void;
  headerSlot?: ReactNode;
  filterSelectors?: ReactNode;
  filterSelectorsSx?: SxProps;
  pagerSx?: SxProps;
  pagerEdgePadding?: boolean;
  noDataMessage?: string;
  isPreSearch?: boolean;
  preSearchMessage?: string;
  bottomMargin?: string;
  listSx?: SxProps;
}

export default function MobileCardListShell({
  children,
  hasData,
  totalPages,
  currentPage,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  headerSlot,
  filterSelectors,
  filterSelectorsSx,
  pagerSx,
  pagerEdgePadding = true,
  noDataMessage,
  isPreSearch = false,
  preSearchMessage,
  bottomMargin,
  listSx,
}: MobileCardListShellProps) {
  const intl = useIntl();
  const f = (id: string) => intl.formatMessage({ id: id });

  const entriesCount = [10, 15, 25].map((count) => ({
    key: count,
    value: f(`datatable.entries.${count}`),
  }));

  return (
    <CardListBox bottomMargin={bottomMargin}>
      {headerSlot}
      {!!filterSelectors && (
        <Box sx={filterSelectorsSx ?? { padding: '16px' }}>
          {filterSelectors}
        </Box>
      )}
      <Grid container flexDirection="column" paddingBottom=".8rem">
        <Grid item display="grid" marginTop=".8rem" sx={listSx}>
          {children}
        </Grid>

        {hasData && (
          <Grid item container justifyContent="space-between" sx={pagerSx}>
            <Grid item paddingLeft={pagerEdgePadding ? '.5rem' : undefined}>
              <EpayPageNavigator
                totalPages={totalPages}
                currentPage={currentPage}
                onPageChange={onPageChange}
              />
            </Grid>
            <Grid item paddingRight={pagerEdgePadding ? '.5rem' : undefined}>
              <EpayDropDown
                data={entriesCount}
                value={itemsPerPage}
                optionKey="key"
                optionText="value"
                optionsLocation="top"
                width="8rem"
                onSelect={(count) => onItemsPerPageChange(count as number)}
              />
            </Grid>
          </Grid>
        )}

        <Grid item paddingTop={!hasData ? '1rem' : '0rem'} textAlign="center">
          {!isPreSearch && noDataMessage && !hasData && <>{noDataMessage}</>}
          {isPreSearch && <>{preSearchMessage}</>}
        </Grid>
      </Grid>
    </CardListBox>
  );
}
