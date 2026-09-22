import { useEffect, useState } from 'react';

import { useIntl } from 'react-intl';

import { styled } from '@mui/material/styles';
import { Box, Grid, Typography } from '@mui/material';
import { Invoice } from 'types/InvoicesSearchRequest';
import { useAppSelector } from 'redux/hooks';
import { regionalFormatSelector } from 'redux/reducers';
import { toCurrencyString } from 'utilities/utilities';

const AmountBox = styled('div')(({ theme }) => ({
  fontSize: '2rem',
  fontWeight: '500',
  backgroundColor: theme.palette.background.paper,
  borderRadius: '12px',
  borderColor: theme.palette.primary.borderColor,
  borderWidth: '1px',
  borderBottom: '0px',
  borderStyle: 'solid',
  padding: '1.5rem',
  [theme.breakpoints.down('sm')]: {
    padding: '1.5rem 0.75rem',
  },
  boxShadow: `${theme.palette.interactiveColor} 0px 4px 0px 0px`,
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
}));

interface InvoiceAmountsProps {
  data: Invoice[]; // TODO: this needs to be typed. I don't know what data contains to be able to type it.
  currency: string;
}
export default function InvoiceAmounts({
  data,
  currency,
}: InvoiceAmountsProps) {
  const regionalFormat = useAppSelector(regionalFormatSelector);
  const [due, setDue] = useState(0);
  const [credit, setCredit] = useState(0);
  const [balance, setBalance] = useState(0);
  const [pastDue, setPastDue] = useState(0);

  const intl = useIntl();
  const f = (id: string) => intl.formatMessage({ id: id });
  useEffect(() => {
    if (!data || data.length === 0) {
      setDue(0);
      setCredit(0);
      setBalance(0);
      setPastDue(0);
      return;
    }

    const currentDate = new Date();

    // Calculate total "Open" invoice amount
    const totalOpenAmount = data
      .filter((item) => item.invoiceStatus === 'Open')
      .reduce((total, item) => total + (item.openAmount || 0), 0);

    // Calculate total "Credit" invoice amount
    const totalCreditAmount = data
      .filter((item) => item.invoiceStatus === 'Credit')
      .reduce((total, item) => total + (item.openAmount || 0), 0);

    // Calculate past due amount for "Open" invoices
    const totalPastDueAmount = data
      .filter(
        (item) =>
          item.invoiceStatus === 'Open' &&
          item.dueDate &&
          new Date(item.dueDate) < currentDate,
      )
      .reduce((total, item) => total + (item.openAmount || 0), 0);

    // Set state values
    setDue(totalOpenAmount);
    setCredit(totalCreditAmount);
    setBalance(totalOpenAmount + totalCreditAmount);
    setPastDue(totalPastDueAmount);
  }, [data]);

  return (
    <>
      <Grid container spacing={2} id="invoiceAmounts">
        <Grid item xs={6} sm={6} md={6} lg={3} xl={3}>
          <AmountBox>
            <Box>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: '400',
                  letter: '2%',
                  lineHeight: '24px',
                  color: '#666D80 ',
                }}
              >
                {f('invoices.amount.total')}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: '600',
                  lineHeight: '30px',
                  typography: { xs: 'h4', sm: 'h2' },
                }}
              >
                {toCurrencyString(currency, due, false, regionalFormat)}
              </Typography>
            </Box>
          </AmountBox>
        </Grid>
        <Grid item xs={6} sm={6} md={6} lg={3} xl={3}>
          <AmountBox>
            <Box>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: '400',
                  letter: '2%',
                  lineHeight: '24px',
                  color: '#666D80 ',
                }}
              >
                {f('invoices.amount.credits')}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: '600',
                  lineHeight: '30px',
                  typography: { xs: 'h4', sm: 'h2' },
                }}
              >
                {toCurrencyString(currency, credit, false, regionalFormat)}
              </Typography>
            </Box>
          </AmountBox>
        </Grid>
        <Grid item xs={6} sm={6} md={6} lg={3} xl={3}>
          <AmountBox>
            <Box>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: '400',
                  letter: '2%',
                  lineHeight: '24px',
                  color: '#666D80 ',
                }}
              >
                {f('invoices.amount.balance')}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: '600',
                  lineHeight: '30px',
                  typography: { xs: 'h4', sm: 'h2' },
                }}
              >
                {toCurrencyString(currency, balance, false, regionalFormat)}
              </Typography>
            </Box>
          </AmountBox>
        </Grid>
        <Grid item xs={6} sm={6} md={6} lg={3} xl={3}>
          <AmountBox>
            <Box>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: '400',
                  letter: '2%',
                  lineHeight: '24px',
                  color: '#666D80 ',
                }}
              >
                {f('invoices.amount.pastdue')}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: '600',
                  lineHeight: '30px',
                  typography: { xs: 'h4', sm: 'h2' },
                }}
              >
                {toCurrencyString(currency, pastDue, false, regionalFormat)}
              </Typography>
            </Box>
          </AmountBox>
        </Grid>
      </Grid>
    </>
  );
}
