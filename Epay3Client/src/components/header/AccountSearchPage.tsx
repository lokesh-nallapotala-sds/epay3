import { useState, useMemo } from 'react';
import {
  Grid,
  TextField,
  Button,
  useMediaQuery,
  Box,
  Paper,
} from '@mui/material';
import { InputAdornment, Typography } from '@mui/material';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { useTheme } from '@mui/material/styles';
import { Account } from '../../types/Account';
import { useFormat } from 'hooks/useFormat';
import EpayDataTable, {
  EpayDataTableColumnDefinition,
} from 'shared/components/EpayDataTable';
import {
  MobileCardHeader,
  MobileCardShell,
} from 'shared/components/common/MobileCardPrimitives';
import { mobileCardStyles } from 'shared/components/common/mobileCardStyles';
import { usePaginatedCardList } from 'shared/components/common/usePaginatedCardList';
import EpayDropDown from 'shared/components/EpayDropDown';
import EpayPageNavigator from 'shared/components/EpayPageNavigator';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

interface AccountSearchPageProps {
  accountData: Account[];
  onAccountSelect: (account: Account) => void;
}

const ACCOUNT_SEARCH_DEFAULT_SORT = {
  field: 'primaryAcct',
  direction: 'asc',
} as const;

type AccountSearchRow = Account & {
  name: string;
  street: string;
  city: string;
  region: string;
  postalCodeCity: string;
};

interface AccountSearchMobileCardProps {
  account: AccountSearchRow;
  width: string;
  onAccountSelect: (account: Account) => void;
}

function AccountSearchMobileCard({
  account,
  width,
  onAccountSelect,
}: AccountSearchMobileCardProps) {
  const theme = useTheme();
  const f = useFormat();
  const detailRows = [
    {
      label: f('account.search.name'),
      value: account.name,
      testId: 'account-search-card-name',
    },
    {
      label: f('account.search.street'),
      value: account.street,
      testId: 'account-search-card-street',
    },
    {
      label: f('account.search.city'),
      value: account.city,
      testId: 'account-search-card-city',
    },
    {
      label: f('account.search.state'),
      value: account.region,
      testId: 'account-search-card-region',
    },
    {
      label: f('account.search.postalcode'),
      value: account.postalCodeCity,
      testId: 'account-search-card-postalcode',
    },
  ];

  return (
    <MobileCardShell width={width}>
      <MobileCardHeader
        content={
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            <Typography
              component="button"
              type="button"
              onClick={() => onAccountSelect(account)}
              sx={{
                padding: 0,
                border: 0,
                background: 'transparent',
                cursor: 'pointer',
                fontSize: mobileCardStyles.typography.titleFontSize,
                fontWeight: mobileCardStyles.typography.valueFontWeight,
                lineHeight: 1.2,
                color: theme.palette.info.main,
                textDecoration: 'underline',
                textUnderlineOffset: '2px',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                '&:hover': {
                  color: theme.palette.info.main,
                },
              }}
            >
              {account.primaryAcct}
            </Typography>
          </Box>
        }
      />

      {detailRows.map((row) => (
        <Grid
          key={row.testId}
          container
          paddingTop=".55rem"
          alignItems="center"
          wrap="nowrap"
          columnGap="12px"
        >
          <Grid item flexShrink={0} minWidth="5.5rem">
            <Typography
              variant="body2"
              sx={{
                fontSize: mobileCardStyles.typography.labelFontSize,
                fontWeight: mobileCardStyles.typography.labelFontWeight,
                fontStyle: mobileCardStyles.typography.labelFontStyle,
                color: mobileCardStyles.typography.labelColor,
                lineHeight: 1.25,
              }}
            >
              {row.label}
            </Typography>
          </Grid>
          <Grid
            item
            flexGrow={1}
            minWidth={0}
            display="flex"
            justifyContent="flex-start"
            textAlign="left"
            overflow="hidden"
          >
            <Typography
              variant="body2"
              title={row.value}
              data-testid={row.testId}
              sx={{
                fontSize: mobileCardStyles.typography.valueFontSize,
                fontWeight: mobileCardStyles.typography.valueFontWeight,
                fontStyle: mobileCardStyles.typography.valueFontStyle,
                color: mobileCardStyles.typography.valueColor,
                lineHeight: 1.25,
                wordBreak: 'break-word',
                whiteSpace: 'normal',
                textAlign: 'left',
              }}
            >
              {row.value}
            </Typography>
          </Grid>
        </Grid>
      ))}
    </MobileCardShell>
  );
}

const AccountSearchPage = ({
  accountData,
  onAccountSelect,
}: AccountSearchPageProps) => {
  const f = useFormat();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [search, setSearch] = useState('');
  const [, setPage] = useState(0);

  const filteredAccounts = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    if (!searchText) return accountData;

    return accountData.filter((u) =>
      [
        u.primaryAcct,
        u.address?.name,
        u.address?.street,
        u.address?.city,
        u.address?.district,
        u.address?.postalCodeCity,
        u.address?.region,
      ]
        .filter(Boolean)
        .some((field) => field?.toLowerCase().includes(searchText)),
    );
  }, [search, accountData]);

  const sortableTableData = useMemo<AccountSearchRow[]>(() => {
    return filteredAccounts.map((acc) => ({
      ...acc,
      name: acc.address?.name ?? '',
      street: acc.address?.street ?? '',
      city: acc.address?.city ?? '',
      region: acc.address?.region ?? '',
      postalCodeCity: acc.address?.postalCodeCity ?? '',
    }));
  }, [filteredAccounts]);

  const {
    currentDataSet,
    totalPages,
    currentPage,
    itemsPerPage,
    setItemsPerPage,
    handlePageChange,
  } = usePaginatedCardList(sortableTableData, {
    sortField: ACCOUNT_SEARCH_DEFAULT_SORT.field,
  });

  const columnDefs: EpayDataTableColumnDefinition<Account>[] = [
    {
      header: f('account.search.primaryAcct'),
      field: 'primaryAcct',
      sortable: true,
      renderer: (acc: Account) => (
        <Button
          variant="link"
          size="small"
          onClick={() => onAccountSelect(acc)}
        >
          {acc.primaryAcct}
        </Button>
      ),
    },
    {
      header: f('account.search.name'),
      field: 'name',
      sortable: true,
      renderer: (acc: Account) => acc.address?.name ?? '',
    },
    {
      header: f('account.search.street'),
      field: 'street',
      sortable: true,
      renderer: (acc: Account) => acc.address?.street ?? '',
    },
    {
      header: f('account.search.city'),
      field: 'city',
      sortable: true,
      renderer: (acc: Account) => acc.address?.city ?? '',
    },
    {
      header: f('account.search.state'),
      field: 'region',
      sortable: true,
      renderer: (acc: Account) => acc.address?.region ?? '',
    },
    {
      header: f('account.search.postalcode'),
      field: 'postalCodeCity',
      sortable: true,
      renderer: (acc: Account) => acc.address?.postalCodeCity ?? '',
    },
  ];

  const searchFilters = (
    <Grid
      container
      direction="row"
      alignItems={{ xs: 'inherit', sm: 'flex-end' }}
      sx={{
        pt: '0.45rem',
        pb: '0.3rem',
      }}
    >
      <Grid item xs={12} sm={8} md={8} lg={8} sx={{ pl: '-16px' }}>
        <Grid container direction="column" rowGap=".3rem">
          <Grid item>
            <Typography variant="fieldHeader">{f('account.search')}</Typography>
          </Grid>

          <Grid item>
            <TextField
              type="text"
              size="small"
              fullWidth
              value={search}
              placeholder={f('account.search.placeholder')}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              sx={(muiTheme) => ({
                ...getCompactFilterFieldSx(muiTheme),
              })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlinedIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );

  const entriesCount = [10, 15, 25].map((count) => ({
    key: count,
    value: f(`datatable.entries.${count}`),
  }));

  return (
    <Grid
      container
      sm={12}
      md={12}
      lg={12}
      sx={{
        height: '100%',
        mt: { xs: 0, md: '20px' },
      }}
    >
      <Grid
        item
        xs={12}
        sx={{
          width: '100%',
          minWidth: { xs: 0, md: '800px' },
        }}
      >
        {isMobile ? (
          <Paper
            sx={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              height: {
                xs: 'calc(100dvh - 235px)',
                sm: 'calc(100dvh - 275px)',
              },
              minHeight: {
                xs: 'calc(100dvh - 235px)',
                sm: 'calc(100dvh - 275px)',
              },
              maxHeight: {
                xs: 'calc(100dvh - 235px)',
                sm: 'calc(100dvh - 275px)',
              },
              border: '1px solid #DFE1E6',
              borderRadius: '10px',
              backgroundColor: 'background.paper',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                px: '16px',
                pt: '12px',
                pb: '8px',
                flexShrink: 0,
              }}
            >
              {searchFilters}
            </Box>

            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                pt: '.8rem',
                px: '12px',
                scrollbarGutter: 'stable',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box
                sx={{
                  width: 'calc(100% - 14px)',
                  margin: '0 auto',
                  display: 'grid',
                  alignContent: 'start',
                  flexGrow: 1,
                }}
              >
                {currentDataSet.map((account) => (
                  <AccountSearchMobileCard
                    key={account.accountId ?? account.primaryAcct}
                    account={account}
                    width="100%"
                    onAccountSelect={onAccountSelect}
                  />
                ))}
              </Box>
            </Box>

            {currentDataSet.length > 0 && (
              <Grid
                item
                container
                justifyContent="space-between"
                sx={{ p: '0 .5rem .8rem', flexShrink: 0 }}
              >
                <Grid item>
                  <EpayPageNavigator
                    totalPages={totalPages}
                    currentPage={currentPage}
                    onPageChange={handlePageChange}
                  />
                </Grid>
                <Grid item>
                  <EpayDropDown
                    data={entriesCount}
                    value={itemsPerPage}
                    optionKey="key"
                    optionText="value"
                    optionsLocation="top"
                    width="8rem"
                    onSelect={(count) => setItemsPerPage(count as number)}
                  />
                </Grid>
              </Grid>
            )}

            {currentDataSet.length === 0 && (
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  px: '1rem',
                  pb: '.8rem',
                  textAlign: 'center',
                }}
              >
                {f('app.common.nodata')}
              </Box>
            )}
          </Paper>
        ) : (
          <EpayDataTable
            data={sortableTableData}
            colDefs={columnDefs}
            defaultSort={ACCOUNT_SEARCH_DEFAULT_SORT}
            noDataMessage={f('app.common.nodata')}
            width="100%"
            filterSelectors={searchFilters}
          />
        )}
      </Grid>
    </Grid>
  );
};

export default AccountSearchPage;
