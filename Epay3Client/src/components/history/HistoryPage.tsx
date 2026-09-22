import { useState, useRef, SyntheticEvent } from 'react';

import { useIntl } from 'react-intl';

import { Button, Tab } from '@mui/material';
import {
  EpayTabContext,
  EpayTabList,
  EpayTabPanel,
} from 'shared/components/EpayTabs';
import EpayBox from 'shared/components/EpayBox';
import { Grid, Typography } from '@mui/material';
import PaymentHistory from 'components/payments/PaymentHistory';
import EpayPageHeaderText from 'shared/components/EpayPageHeaderText';
import InvoiceHistory, {
  InvoiceHistoryHandle,
} from 'components/invoiceHistory/InvoiceHistoryPage';
import { useTheme } from '@mui/material/styles';

export default function HistoryPage() {
  const intl = useIntl();
  const theme = useTheme();
  const f = (id: string) => intl.formatMessage({ id, defaultMessage: id });
  const [value, setValue] = useState('1');
  const handleChange = (event: SyntheticEvent, newValue: string) => {
    setValue(newValue);
  };

  // Refs to children
  const invoiceRef = useRef<InvoiceHistoryHandle | null>(null);
  const paymentRef = useRef<InvoiceHistoryHandle | null>(null);

  const handleSearchClick = () => {
    if (value === '1') {
      invoiceRef.current?.fetchData();
    } else {
      paymentRef.current?.fetchData();
    }
  };
  return (
    <Grid container flexDirection="column" rowGap="2rem" marginTop="1rem">
      <Grid container spacing={{ xs: 2, sm: 0 }}>
        <EpayPageHeaderText
          header={f('header.invoicehistory')}
          subheader={f('invoicehistory.page.description')}
        />
      </Grid>

      <Grid item xs={12}>
        {/* Row: Tabs (left) + Search button (right) */}
        <Grid
          container
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
          spacing={1}
          sx={{ width: '100%' }}
        >
          {/* LEFT: Tab list in an EpayBox */}
          <Grid item xs={12} sm sx={{ marginRight: '-8px' }}>
            <EpayTabContext value={value}>
              <EpayBox
                height="48px"
                boxSizing="border-box"
                display="flex"
                sx={{
                  width: { xs: '100%', sm: '195px' },
                  padding: '0.25rem',
                  paddingLeft: '0.1875rem',
                  '@media (min-resolution: 1.25dppx)': {
                    paddingLeft: '0.25rem',
                  },
                  backgroundColor: '#eeeff2',
                  alignItems: 'center',
                }}
              >
                <EpayTabList
                  onChange={handleChange}
                  sx={{
                    width: '100%',
                    minHeight: '40px',
                    '& .MuiTabs-indicator': { display: 'none' },
                    '& .Mui-selected': {
                      backgroundColor: (theme) =>
                        theme.palette.background.paper,
                      color: '#0D0D12 !important',
                      width: '100%',
                    },
                    '& .MuiTab-root': {
                      color: '#6f7687',
                      minHeight: '40px',
                      padding: '0px',
                      lineHeight: '40px',
                      fontSize: '12px',
                    },
                  }}
                  variant="fullWidth"
                  id="historyTabs"
                >
                  <Tab
                    value="1"
                    label={
                      <Typography
                        variant="h6"
                        color="inherit"
                        sx={{ lineHeight: '40px' }}
                      >
                        {f('header.invoices')}
                      </Typography>
                    }
                    sx={{
                      borderRadius: '6px',
                      minHeight: '40px',
                      padding: '0px',
                    }}
                  />
                  <Tab
                    value="2"
                    label={
                      <Typography
                        variant="h6"
                        color="inherit"
                        sx={{ lineHeight: '40px' }}
                      >
                        {f('header.payments')}
                      </Typography>
                    }
                    sx={{
                      borderRadius: '6px',
                      minHeight: '40px',
                      padding: '0px',
                    }}
                  />
                </EpayTabList>
              </EpayBox>
            </EpayTabContext>
          </Grid>

          {/* RIGHT: Search button (aligned to right on sm+, full width on xs) */}
          <Grid
            item
            xs={12}
            sm="auto"
            sx={{
              display: 'flex',
              justifyContent: { xs: 'stretch', sm: 'flex-end' },
              marginRight: '-8px',
            }}
          >
            <Button
              variant="contained"
              sx={{
                width: { xs: '100%', sm: '180px' },
                textTransform: 'none',
                border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                '&:hover': {
                  border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                },
              }}
              onClick={handleSearchClick}
            >
              {f('user.search')}
            </Button>
          </Grid>
        </Grid>

        {/* Panels below the row (keep full width) */}
        <EpayTabContext value={value}>
          <EpayTabPanel value="1" sx={{ padding: 0 }}>
            <InvoiceHistory ref={invoiceRef} />
          </EpayTabPanel>
          <EpayTabPanel value="2" sx={{ padding: 0 }}>
            <PaymentHistory ref={paymentRef} />
          </EpayTabPanel>
        </EpayTabContext>
      </Grid>
    </Grid>
  );
}
