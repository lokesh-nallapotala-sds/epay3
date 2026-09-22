import { ChangeEvent, FormEvent, useState } from 'react';

import { useIntl } from 'react-intl';

import { Button, Grid, TextField, Typography, useTheme } from '@mui/material';

import { InvoiceDetail, ValidateInvoiceAccount } from 'types/Invoice';
import EpayBox from 'shared/components/EpayBox';
import { EpayInvoicesService } from 'services/EpayInvoicesService';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

function AutoLinkAccountForm({
  page,
  onValidateSuccess,
  onInvoice,
  onAccount,
  onError,
}) {
  const [accountNr, setAccountNr] = useState('');
  const [accountNrError, setAccountNrError] = useState('');
  const [invoiceNr, setInvoiceNr] = useState('');
  const [invoiceNrError, setInvoiceNrError] = useState('');
  const [invoiceAmt, setInvoiceAmt] = useState('');
  const [invoiceAmtError, setInvoiceAmtError] = useState('');
  const intl = useIntl();
  const f = (id: string) =>
    intl.formatMessage({
      id: id,
    });
  const theme = useTheme();
  const validateAccount = EpayInvoicesService.useValidateAccount();

  function handleAccountNrChange(e: ChangeEvent<HTMLInputElement>): void {
    const s = e.currentTarget.value;
    setAccountNr(s);
    if (s.length > 0) setAccountNrError('');
  }

  function handleInvoiceNrChange(e: ChangeEvent<HTMLInputElement>): void {
    const s = e.currentTarget.value;
    setInvoiceNr(s);
    if (s.length > 0) setInvoiceNrError('');
  }

  function handleInvoiceAmtChange(e: ChangeEvent<HTMLInputElement>): void {
    const s = e.currentTarget.value;
    if (/^\d*\.?\d*$/.test(s)) {
      setInvoiceAmt(s);
      if (s.length > 0) setInvoiceAmtError('');
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    let hasError = false;
    let invoiceAmount = 0;

    if (accountNr.trim().length === 0) {
      setAccountNrError(f('user.account.error.acctid.required'));
      hasError = true;
    }
    if (invoiceNr.trim().length === 0) {
      setInvoiceNrError(f('user.account.error.invoiceid.required'));
      hasError = true;
    }
    if (invoiceAmt.trim().length === 0) {
      setInvoiceAmtError(f('user.account.error.invoiceamt.required'));
      hasError = true;
    } else {
      invoiceAmount = parseFloat(invoiceAmt);
      if (isNaN(invoiceAmount)) {
        setInvoiceAmtError(f('user.account.error.invoiceamt.nan'));
        hasError = true;
      }
    }

    if (hasError) return;
    createAccountInvoiceMode(accountNr, invoiceNr, invoiceAmount);
  }

  function createAccountInvoiceMode(
    accountNr: string,
    invoiceNr: string,
    invoiceAmt: number,
  ) {
    validateAccount(accountNr, invoiceNr, invoiceAmt)
      .then((resp) => {
        if (resp.invoice?.detail && resp.account) {
          const invoiceDetail: InvoiceDetail = resp.invoice.detail;
          const validatedAccount: ValidateInvoiceAccount = resp.account;
          onValidateSuccess(true);
          onInvoice(invoiceDetail, validatedAccount);
          onAccount(validatedAccount);
        } else {
          onValidateSuccess(false);
          onError(resp.message || 'error');
        }
      })
      .catch((error) => {
        onValidateSuccess(false);
        onError(error.message || 'error');
      });
  }

  return (
    <EpayBox height={'100%'} sx={{ padding: '0px' }}>
      <Grid container direction="column">
        <Grid
          item
          sx={{
            borderBottom: '1px solid',
            borderBottomColor: '#E0E0E0',
            padding: '20px',
          }}
        >
          <Typography variant="h5" align="left">
            {f('header.invoicedetails')}
          </Typography>
        </Grid>
        <Grid
          item
          container
          direction="column"
          rowGap="1.25rem"
          sx={{ padding: '20px' }}
        >
          <Grid item container direction={'column'} spacing={0.5}>
            <Grid item>
              <Typography
                variant="body2"
                fontWeight="500"
                sx={{
                  '&::after': {
                    content: '" *"',
                    color: 'red',
                    marginTop: '4px',
                  },
                }}
              >
                {f('user.account.nr')}
              </Typography>
            </Grid>
            <Grid item>
              <TextField
                type="text"
                fullWidth
                value={accountNr}
                onChange={handleAccountNrChange}
                error={!!accountNrError}
                helperText={accountNrError}
                sx={(muiTheme) => ({
                  ...getCompactFilterFieldSx(muiTheme),
                })}
              />
            </Grid>
          </Grid>
          <Grid item container direction={'column'} spacing={0.5}>
            <Grid item>
              <Typography
                variant="body2"
                fontWeight="500"
                sx={{
                  '&::after': {
                    content: '" *"',
                    color: 'red',
                    marginTop: '4px',
                  },
                }}
              >
                {f('user.account.invoice.nr')}
              </Typography>
            </Grid>
            <Grid item>
              <TextField
                type="text"
                fullWidth
                value={invoiceNr}
                onChange={handleInvoiceNrChange}
                error={!!invoiceNrError}
                helperText={invoiceNrError}
                sx={(muiTheme) => ({
                  ...getCompactFilterFieldSx(muiTheme),
                })}
              />
            </Grid>
          </Grid>
          <Grid item container direction={'column'} spacing={0.5}>
            <Grid item>
              <Typography
                variant="body2"
                fontWeight="500"
                sx={{
                  '&::after': {
                    content: '" *"',
                    color: 'red',
                    marginTop: '4px',
                  },
                }}
              >
                {f('user.account.invoice.amt')}
              </Typography>
            </Grid>
            <Grid item>
              <TextField
                type="text"
                InputProps={{
                  inputProps: { inputMode: 'numeric', pattern: '[0-9]*' },
                }}
                fullWidth
                value={invoiceAmt}
                onChange={handleInvoiceAmtChange}
                error={!!invoiceAmtError}
                helperText={invoiceAmtError}
                sx={(muiTheme) => ({
                  ...getCompactFilterFieldSx(muiTheme),
                })}
              />
            </Grid>
          </Grid>

          <Grid item>
            <Grid container direction="row" justifyContent="flex-end">
              <Grid item>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  sx={{
                    width: 'auto',
                    border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                    '&:hover': {
                      border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                    },
                  }}
                >
                  {page === 'guestpayment'
                    ? f('guest.action.next')
                    : f('user.action.addacct')}
                </Button>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </EpayBox>
  );
}

export default AutoLinkAccountForm;
