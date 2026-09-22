import { useEffect, useState } from 'react';

import { useIntl } from 'react-intl';

import {
  Box,
  Button,
  Grid,
  Link,
  List,
  ListItem,
  ListItemText,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';

import { Address } from 'types/Address';
import { InvoiceDetail, ValidateInvoiceAccount } from 'types/Invoice';
import AutoLinkAccountForm from './AutoLinkAccountForm';
import EpayBox from 'shared/components/EpayBox';
import { EpayDocumentType } from 'types/EpayDocumentType';
import { InvoiceStatus } from 'types/InvoiceStatus';
import useEpayNavigate from 'hooks/useEpayNavigate';
import { clearPaymentSession, trimLeadingZeroes } from 'utilities/utilities';
import { useEpayToast } from 'providers/EpayToastProvider';
import { EpayInvoicesService } from 'services/EpayInvoicesService';
import { useAppDispatch, useAppSelector } from 'redux/hooks';
import {
  addValidatedAccount,
  clearValidatedAccounts,
  validatedAccountsSelector,
} from 'redux/reducers';
import {
  Invoice,
  InvoiceRequestBody,
  InvoicesSearchRequest,
  PayerData,
  SearchFilter,
} from 'types/InvoicesSearchRequest';

const AddAccountPage = ({ page }: { page: string }) => {
  const invoiceDetail: InvoiceDetail = {
    itemData: [],
    partnerData: [],
  };

  const theme = useTheme();
  const lgUp = useMediaQuery(theme.breakpoints.up('lg'));
  const intl = useIntl();
  const f = (id: string) =>
    intl.formatMessage({
      id: id,
    });
  const dispatch = useAppDispatch();
  const accounts = useAppSelector(validatedAccountsSelector);
  const { navigate } = useEpayNavigate();
  const [invoice, setInvoices] = useState<InvoiceDetail>(invoiceDetail);
  const [status, setStatus] = useState('form');
  const getInvoices = EpayInvoicesService.useGetInvoiceSearch();
  const { showToastMessage } = useEpayToast();

  const handleValidateSuccess = (success) => {
    if (success && page != 'guestpayment') {
      setStatus('success');
    }
  };

  const handleAccount = (account: ValidateInvoiceAccount) => {
    dispatch(addValidatedAccount(account));
  };

  const handleInvoice = (
    nextInvoice: InvoiceDetail,
    validatedAccount?: ValidateInvoiceAccount,
  ) => {
    if (nextInvoice) {
      setInvoices(nextInvoice);
      if (page === 'guestpayment') {
        const filters: SearchFilter[] = [];
        const documentNumber =
          nextInvoice.headerData?.billingDocumentNumber || '';

        if (isStringNotEmptyOrNull(documentNumber)) {
          filters.push({ filterType: '01', value: documentNumber });
        }
        const searchParams: InvoicesSearchRequest = {
          documentType: EpayDocumentType.Invoice,
          status: InvoiceStatus.All,
          selectedAccount: '',
          dateFrom: new Date('01-01-1800'),
          dateTo: new Date('12-31-9999'),
          dueDateFrom: undefined,
          dueDateTo: undefined,
          subAccounts: [],
          currencyKey: '',
          filters,
        };

        const partnerNumber: string =
          nextInvoice.partnerData != undefined
            ? (nextInvoice.partnerData?.find((f) => f.partnerFunction === 'RG')
                ?.partnerNumber ?? '')
            : '';
        const payerData: PayerData = {
          customerNumber: partnerNumber.replace(/^0+/, ''),
          companyCode: nextInvoice.headerData?.companyCode.replace(/^0+/, ''),
        };

        const address: Address | null =
          nextInvoice.partnerData?.[0]?.addressData || null;

        const invoiceRequest: InvoiceRequestBody = {
          selectedAccount: '',
          searchParameters: searchParams,
          payerData,
          validatedAccounts: validatedAccount
            ? [...accounts, validatedAccount]
            : accounts,
        };
        getInvoices(invoiceRequest)
          .then((response: Invoice[]) => {
            if (!response || response.length === 0) {
              showToastMessage('info', f('payment.invoice.notfound'));
              setStatus('form');
              return;
            }

            const payableInvoices = response.filter(
              (i) => Number(i.openAmount ?? 0) > 0,
            );

            if (payableInvoices.length === 0) {
              showToastMessage('info', f('payment.noopen.to.pay'));
              setStatus('form');
              return;
            }
            if (response.length > 0) {
              const hasScheduled = response.some(
                (item) =>
                  (item as unknown as Record<string, unknown>).scheduledId,
              );
              if (hasScheduled) {
                showToastMessage('error', f('schedule.paymnet.error'));
                setStatus('form');
              } else {
                navigate('/payment/guest', {
                  state: {
                    payerData,
                    invoiceData: response,
                    partnerAddress: address,
                  },
                });
              }
            }
          })
          .catch((error) => {
            handleError(error);
          });
      }
    }
  };

  const handleError = (error) => {
    if (error) {
      const message =
        typeof error === 'string'
          ? error
          : error.message || f('user.account.error_no_account_found');
      showToastMessage('error', message);
    }
  };

  const addAnotherAccount = () => {
    setStatus('form');
  };

  useEffect(() => {
    clearPaymentSession();
  }, []);

  return (
    <Grid container spacing={1} direction={'column'}>
      <Grid item container flexDirection="column" rowGap="2rem" marginY="1rem">
        <Grid item display="flex" flexDirection="column">
          {(status === 'form' || status === 'success') &&
            page !== 'guestpayment' && (
              <Typography variant="h1">{f('login.registerAccount')}</Typography>
            )}

          {page === 'guestpayment' && (
            <Typography variant="h1">
              {f('guest.header.GuestPayment')}
            </Typography>
          )}
        </Grid>
      </Grid>
      <Grid
        item
        container
        spacing={2}
        sx={{ flexDirection: lgUp ? 'row' : 'column' }}
      >
        <Grid item lg={6}>
          {status === 'form' && (
            <AutoLinkAccountForm
              page={page}
              onValidateSuccess={handleValidateSuccess}
              onError={handleError}
              onInvoice={handleInvoice}
              onAccount={handleAccount}
            />
          )}
          {status === 'success' && page != 'guestpayment' && (
            <AutoLinkAccountSuccess
              invoice={invoice}
              addAnotherAccount={addAnotherAccount}
            />
          )}
        </Grid>
        <Grid item lg={6}>
          {page != 'guestpayment' && (
            <EpayBox height={'100%'}>
              <Grid
                container
                direction={'column'}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                }}
              >
                <Grid
                  item
                  sx={{
                    borderBottom: '1px solid',
                    borderBottomColor: '#E0E0E0',
                    padding: '20px',
                  }}
                >
                  <Typography variant="h5" align="left">
                    {f('user.account')}
                  </Typography>
                </Grid>
                <Grid
                  item
                  container
                  direction="column"
                  rowGap="1.25rem"
                  sx={{ paddingX: '12px', paddingY: '7px', flexGrow: 1 }}
                >
                  {accounts.length > 0 && (
                    <List>
                      {accounts.map((account) => {
                        const partner = account.invoiceDetail?.partnerData.find(
                          (e) => e.partnerFunction === 'RG',
                        );

                        const address = partner?.addressData;
                        return (
                          <Box
                            key={`${partner?.partnerNumber ?? account.accountNumber}-${account.invoiceNumber}`}
                          >
                            <ListItem
                              sx={{
                                width: 'calc(100% - 10px)',
                                border: '1px solid',
                                borderColor: '#DFE1E6',
                                padding: '10px',
                                margin: '5px',
                                borderRadius: `${theme.shape.borderRadius}px`,
                              }}
                            >
                              <ListItemText>
                                <Typography variant="body2" fontWeight={600}>
                                  {`${address?.name ?? ''} - ${trimLeadingZeroes(partner?.partnerNumber ?? '')}`}
                                </Typography>
                              </ListItemText>
                            </ListItem>
                          </Box>
                        );
                      })}
                    </List>
                  )}
                  {accounts.length === 0 && (
                    <Typography
                      variant="body2"
                      align="left"
                      paddingX="8px"
                      paddingY="13px"
                    >
                      {f('header.account.errorMessage')}
                    </Typography>
                  )}
                </Grid>
                <Grid item sx={{ margin: '20px' }}>
                  {accounts.length !== 0 && (
                    <Grid container direction="row" justifyContent="flex-end">
                      <Grid item>
                        <Button
                          variant="contained"
                          sx={{
                            height: '48px',
                            fontSize: '16px',
                            width: '12rem',
                            border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                            '&:hover': {
                              border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                            },
                          }}
                          href="/auto-registration/create"
                        >
                          {f('user.register.continue')}
                        </Button>
                      </Grid>
                    </Grid>
                  )}
                </Grid>
              </Grid>
            </EpayBox>
          )}
        </Grid>
        {page === 'guestpayment' && (
          <Grid item lg={6}>
            <Grid container justifyContent="center">
              <Grid item>
                <Link
                  href="/"
                  onClick={() => dispatch(clearValidatedAccounts())}
                  sx={{
                    textDecoration: 'none',
                  }}
                >
                  <Typography
                    variant="body1"
                    color={theme.palette.interactiveColor}
                  >
                    {f('user.go_back_login')}
                  </Typography>
                </Link>
              </Grid>
            </Grid>
          </Grid>
        )}
      </Grid>
      {page !== 'guestpayment' && (
        <Grid item container justifyContent="center">
          <Grid item marginY="1.3rem">
            <Link
              href="/"
              onClick={() => dispatch(clearValidatedAccounts())}
              sx={{
                textDecoration: 'none',
              }}
            >
              <Typography
                variant="body1"
                color={theme.palette.interactiveColor}
              >
                {f('user.go_back_login')}
              </Typography>
            </Link>
          </Grid>
        </Grid>
      )}
    </Grid>
  );
};

function AutoLinkAccountSuccess(props) {
  const theme = useTheme();

  const intl = useIntl();
  const f = (id: string) =>
    intl.formatMessage({
      id: id,
    });

  const addAnotherAccount = () => {
    props.addAnotherAccount();
  };
  if (props.invoice) {
    const invoice: InvoiceDetail = props.invoice;
    if (!invoice) return;
    const partner = invoice.partnerData.find((x) => x.partnerFunction === 'RG');
    const address = partner?.addressData;
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
            <Typography
              variant="h5"
              sx={{ textTransform: 'capitalize' }}
              align="left"
            >
              {f('app.common.success')}
            </Typography>
          </Grid>

          <Grid
            item
            rowGap="1.25rem"
            sx={{ padding: '20px', flexDirection: 'column' }}
          >
            <Box
              sx={{
                border: '1px solid',
                borderColor: '#0F973D',
                backgroundColor: '#E7F6EC',
                padding: '16px',
                borderRadius: `${theme.shape.borderRadius}px`,
              }}
            >
              <Typography variant="body2" color="#0F973D">
                {address?.name}
              </Typography>
              <Typography variant="body2" color="#0F973D">
                {address?.street}
              </Typography>
              <Typography variant="body2" color="#0F973D">
                {address?.city}, {address?.country}
              </Typography>
            </Box>
          </Grid>
          <Grid
            item
            rowGap="1.25rem"
            sx={{ padding: '20px', flexDirection: 'column' }}
          >
            <Grid container direction="row" justifyContent="flex-end">
              <Grid item>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={addAnotherAccount}
                  sx={{
                    border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                    '&:hover': {
                      border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                    },
                  }}
                >
                  {f('user.linkedaccount.addAnotherAccount')}
                </Button>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </EpayBox>
    );
  } else {
    return null;
  }
}

function isStringNotEmptyOrNull(val: string | null) {
  return typeof val !== 'undefined' && val !== null && val !== '';
}

export default AddAccountPage;
