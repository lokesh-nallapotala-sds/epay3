import { ChangeEvent, MouseEvent, useEffect, useState } from 'react';

import { useIntl } from 'react-intl';

import Grid from '@mui/material/Grid';
import Radio from '@mui/material/Radio';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import RadioGroup from '@mui/material/RadioGroup';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/system';
import FormControlLabel from '@mui/material/FormControlLabel';
import { Account } from 'types/Account';
import { ErrorInfo } from 'types/ErrorInfo';
import { EpayUserService } from 'services/EpayUserService';
import { useEpayToast } from 'providers/EpayToastProvider';
import { EpayModal } from 'shared/components/EpayModalLayout';
import {
  compactFilterMenuItemSx,
  compactFilterSelectProps,
} from 'shared/components/compactFilterSelectStyles';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

class LinkedAccountEntryMode {
  public static readonly Invoice = 'invoice';
  public static readonly Manual = 'manual';

  public static getResourceId(mode: string): string {
    switch (mode) {
      case LinkedAccountEntryMode.Invoice:
        return 'user.linkedaccount.entry.invoice';
      case LinkedAccountEntryMode.Manual:
        return 'user.linkedaccount.entry.manual';
      default:
        return '';
    }
  }
}
interface EpayDropDownEntry {
  key: string;
  displayText: string;
}

interface AccountDialogProps {
  selectedAccount: Account | null;
  companyCodes: EpayDropDownEntry[];
  salesOrgCodes: EpayDropDownEntry[];
  isOpen: boolean;
  onClose: () => void;
  onAccountSaved: (userId: string, primaryAccount: string) => void;
  mode?: 'admin' | 'user';
}

function AddEditUserLinkedAccountDialog(props: AccountDialogProps) {
  const {
    selectedAccount,
    companyCodes,
    salesOrgCodes,
    isOpen,
    onClose,
    onAccountSaved,
    mode = 'admin',
  } = props;

  const theme = useTheme();
  const lgUp = useMediaQuery(theme.breakpoints.up('lg'));
  const modalFieldColumnSpacing = theme.spacing(2);
  const modalFieldMobileRowSpacing = theme.spacing(2);
  const { showToastMessage } = useEpayToast();
  const primaryButtonColor = theme.palette.primary.main;
  const intl = useIntl();
  const f = (id) => intl.formatMessage({ id: id });

  const saveAccountManual = EpayUserService.useSaveAccountManual();
  const saveAccountByInvoice = EpayUserService.useSaveAccountByInvoice();

  // meta-props
  const [accountEntryMode, setAccountEntryMode] = useState(
    LinkedAccountEntryMode.Invoice,
  );

  // fields
  const [accountNr, setAccountNr] = useState(
    selectedAccount?.primaryAcct ?? '',
  );
  const [accountNrError, setAccountNrError] = useState('');

  //invoice mode fields
  const [invoiceNr, setInvoiceNr] = useState('');
  const [invoiceNrError, setInvoiceNrError] = useState('');

  const [invoiceAmt, setInvoiceAmt] = useState('');
  const [invoiceAmtError, setInvoiceAmtError] = useState('');

  // manual mode fields
  const [accountType] = useState('both');
  const [companyCode, setCompanyCode] = useState('');
  const [companyCodeError, setCompanyCodeError] = useState('');

  const [salesOrgCode, setSalesOrgCode] = useState('');
  const [salesOrgCodeError, setSalesOrgCodeError] = useState('');

  const [distrChannelCode, setDistrChannelCode] = useState('');
  const [distrChannelCodeError, setDistrChannelCodeError] = useState('');

  const [divisionCode, setDivisionCode] = useState('');
  const [divisionCodeError, setDivisionCodeError] = useState('');

  //events
  function handleAccountEntryModeChange(e: ChangeEvent<HTMLInputElement>) {
    const s = (e.target as HTMLInputElement).value;
    setAccountEntryMode(s);
  }
  function handleAccountNrChange(e: ChangeEvent<HTMLInputElement>) {
    const s = e.currentTarget.value;
    setAccountNr(s);
    if (s.length > 0) setAccountNrError('');
  }
  function handleInvoiceNrChange(e: ChangeEvent<HTMLInputElement>) {
    const s = e.currentTarget.value;
    setInvoiceNr(s);
    if (s.length > 0) setInvoiceNrError('');
  }
  function handleInvoiceAmtChange(e: ChangeEvent<HTMLInputElement>) {
    const s = e.currentTarget.value;
    setInvoiceAmt(s);
    if (s.length > 0) setInvoiceAmtError('');
  }

  function handleCompanyCodeChange(e: ChangeEvent<HTMLInputElement>) {
    const s = e.target.value; //note, not `e.currentTarget` - that's null
    setCompanyCode(s);
    if (s.length > 0) setCompanyCodeError('');
  }
  function handleSalesOrgCodeChange(e: ChangeEvent<HTMLInputElement>) {
    const s = e.target.value; //note, not `e.currentTarget` - that's null
    setSalesOrgCode(s);
    if (s.length > 0) setSalesOrgCodeError('');
  }
  function handleDistrChannelCodeChange(e: ChangeEvent<HTMLInputElement>) {
    const s = e.currentTarget.value;
    setDistrChannelCode(s);
    if (s.length > 0) setDistrChannelCodeError('');
  }
  function handleDivisionCodeChange(e: ChangeEvent<HTMLInputElement>) {
    const s = e.currentTarget.value;
    setDivisionCode(s);
    if (s.length > 0) setDivisionCodeError('');
  }

  function handleCancel() {
    onClose();
  }
  function handleSubmit(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();

    let hasError = false;

    if (accountEntryMode === LinkedAccountEntryMode.Invoice) {
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

      const userId = selectedAccount?.userId ?? '';

      createAccountInvoiceMode(userId, accountNr, invoiceNr, invoiceAmount);
    } else if (accountEntryMode === LinkedAccountEntryMode.Manual) {
      if (accountNr.trim().length === 0) {
        setAccountNrError(f('user.account.error.acctid.required'));
        hasError = true;
      }
      if (companyCode.trim().length === 0) {
        setCompanyCodeError(f('user.account.error.companyid.required'));
        hasError = true;
      }
      if (salesOrgCode.trim().length === 0) {
        setSalesOrgCodeError(f('user.account.error.salesorgid.required'));
        hasError = true;
      }
      if (distrChannelCode.trim().length === 0) {
        setDistrChannelCodeError(
          f('user.account.error.distchannelid.required'),
        );
        hasError = true;
      }
      if (divisionCode.trim().length === 0) {
        setDivisionCodeError(f('user.account.error.divisionid.required'));
        hasError = true;
      }

      if (hasError) return;

      const userId = selectedAccount?.userId ?? '';

      const newAccount: Account = {
        userId: userId,
        accountId: selectedAccount?.accountId ?? null,
        primaryAcct: accountNr,
        accountTypeId: accountType,
        companyCode: companyCode,
        division: divisionCode,
        salesOrganization: salesOrgCode,
        distributionChannel: distrChannelCode,
      };
      createAccountManualMode(userId, newAccount);
    }
  }

  function createAccountManualMode(userId: string, account: Account) {
    saveAccountManual(userId, account)
      .then((resp) => {
        //TODO: figure out what to do in case of an error
        // (as I understand it, if SAP rejects the request, we still get a
        // 200/OK status - not sure what the response looks like though)
        const saveSucceeded = !!resp && !!(resp?.data as Account)?.accountId;

        if (saveSucceeded) {
          showToastMessage('success', f('user.account.save.success'));

          // notify the user editor to refresh the account list
          // (has to be done this way: the account obj in the response is incomplete)
          onAccountSaved(userId, account.primaryAcct);

          onClose();
        } else {
          showToastMessage('error', f('user.account.save.error'));
        }
      })
      .catch((err: ErrorInfo) => {
        showToastMessage('error', err.message);
      });
  }
  function createAccountInvoiceMode(
    userId: string,
    accountNr: string,
    invoiceNr: string,
    invoiceAmt: number,
  ) {
    saveAccountByInvoice(userId, accountNr, invoiceNr, invoiceAmt)
      .then((resp) => {
        //TODO: figure out what to do in case of an error
        // (as I understand it, if SAP rejects the request, we still get a
        // 200/OK status - not sure what the response looks like though)
        const saveSucceeded = !!resp && !!(resp?.data as Account)?.accountId;

        if (saveSucceeded) {
          showToastMessage('success', f('user.account.save.success'));

          // notify the user editor to refresh the account list
          // (has to be done this way: the account obj in the response is incomplete)
          onAccountSaved(userId, accountNr);

          onClose();
        } else {
          showToastMessage('error', f('user.account.save.error'));
        }
      })
      .catch((err: ErrorInfo) => {
        showToastMessage('error', err.message);
      });
  }

  useEffect(() => {
    if (mode === 'user') {
      // User mode: always Invoice mode, no editing, always new account
      setAccountNr('');
      setInvoiceNr('');
      setInvoiceAmt('');
      setAccountEntryMode(LinkedAccountEntryMode.Invoice);
    } else if (!!selectedAccount && !!selectedAccount.accountId) {
      // Admin mode: editing existing account
      setAccountNr(selectedAccount.primaryAcct);
      setCompanyCode(selectedAccount.companyCode);
      setDivisionCode(selectedAccount.division);
      setSalesOrgCode(selectedAccount.salesOrganization);
      setDistrChannelCode(selectedAccount.distributionChannel);
      setAccountEntryMode(LinkedAccountEntryMode.Manual);
    } else {
      // Admin mode: new account
      setAccountNr('');
      setCompanyCode(companyCodes?.length > 0 ? companyCodes[0].key : '');
      setDivisionCode('');
      setSalesOrgCode(salesOrgCodes?.length > 0 ? salesOrgCodes[0].key : '');
      setDistrChannelCode('');
      setInvoiceNr('');
      setInvoiceAmt('');
      setAccountEntryMode(LinkedAccountEntryMode.Invoice);
    }
  }, [selectedAccount, companyCodes, salesOrgCodes, mode]);

  const title =
    mode === 'user' || !selectedAccount?.accountId
      ? f('user.linkedaccount.action.add')
      : f('user.linkedaccount.action.edit');

  const actions = [
    <Button
      variant="outlined"
      color="secondary"
      onClick={handleCancel}
      sx={{
        width: '8rem',
      }}
    >
      {f('app.common.cancel')}
    </Button>,
    <Button
      variant="contained"
      color="primary"
      onClick={handleSubmit}
      sx={{
        width: '8rem',
        border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
        '&:hover': {
          border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
        },
      }}
    >
      {f('app.common.save')}
    </Button>,
  ];

  return (
    <EpayModal
      open={isOpen}
      onClose={onClose}
      title={title}
      actions={actions}
      bodyVariant="form"
      fullScreenOnMobile={false}
      paperSx={{
        width: { xs: 'calc(100% - 32px)', sm: 'auto' },
        maxHeight: { xs: 'calc(100dvh - 48px)', sm: 'none' },
        margin: { xs: '24px auto', sm: '32px' },
      }}
    >
      <Grid container direction="column">
        <Grid
          container
          direction="column"
          rowGap={theme.mixins.modal.contentGap}
        >
          {mode === 'admin' && (
            <Grid item sx={{ marginTop: '-5px' }}>
              <RadioGroup
                row
                value={accountEntryMode}
                onChange={handleAccountEntryModeChange}
              >
                <FormControlLabel
                  control={
                    <Radio
                      size="small"
                      disabled={!!selectedAccount?.accountId}
                    />
                  }
                  value={LinkedAccountEntryMode.Invoice}
                  label={
                    <Typography variant="fieldHeader">
                      {f(
                        LinkedAccountEntryMode.getResourceId(
                          LinkedAccountEntryMode.Invoice,
                        ),
                      )}
                    </Typography>
                  }
                />
                <FormControlLabel
                  control={
                    <Radio
                      size="small"
                      sx={{
                        color: primaryButtonColor,
                        '&.Mui-checked': {
                          color: primaryButtonColor,
                        },
                      }}
                      disabled={!!selectedAccount?.accountId}
                    />
                  }
                  value={LinkedAccountEntryMode.Manual}
                  label={
                    <Typography variant="fieldHeader">
                      {f(
                        LinkedAccountEntryMode.getResourceId(
                          LinkedAccountEntryMode.Manual,
                        ),
                      )}
                    </Typography>
                  }
                />
              </RadioGroup>
            </Grid>
          )}
          <Grid item>
            {accountEntryMode === LinkedAccountEntryMode.Invoice && (
              <Grid container direction="column" rowGap="1.25rem">
                <Grid
                  item
                  container
                  direction={lgUp ? 'row' : 'column'}
                  columnSpacing={modalFieldColumnSpacing}
                  rowSpacing={lgUp ? 0 : modalFieldMobileRowSpacing}
                  alignItems={lgUp ? 'center' : undefined}
                >
                  <Grid item xs={12} lg={5} display="flex">
                    <Typography variant="fieldHeader">
                      {f('user.account.nr')}
                    </Typography>
                    <Typography variant="fieldHeader" color="red" ml="4px">
                      {f('app.common.required_indicator')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} lg={7}>
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
                <Grid
                  item
                  container
                  direction={lgUp ? 'row' : 'column'}
                  columnSpacing={modalFieldColumnSpacing}
                  rowSpacing={lgUp ? 0 : modalFieldMobileRowSpacing}
                  alignItems={lgUp ? 'center' : undefined}
                >
                  <Grid item xs={12} lg={5} display="flex">
                    <Typography variant="fieldHeader">
                      {f('user.account.invoice.nr')}
                    </Typography>
                    <Typography variant="fieldHeader" color="red" ml="4px">
                      {f('app.common.required_indicator')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} lg={7}>
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
                <Grid
                  item
                  container
                  direction={lgUp ? 'row' : 'column'}
                  columnSpacing={modalFieldColumnSpacing}
                  rowSpacing={lgUp ? 0 : modalFieldMobileRowSpacing}
                  alignItems={lgUp ? 'center' : undefined}
                >
                  <Grid item xs={12} lg={5} display="flex">
                    <Typography variant="fieldHeader">
                      {f('user.account.invoice.amt')}
                    </Typography>
                    <Typography variant="fieldHeader" color="red" ml="4px">
                      {f('app.common.required_indicator')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} lg={7}>
                    <TextField
                      type="text"
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
              </Grid>
            )}
            {accountEntryMode === LinkedAccountEntryMode.Manual && (
              <Grid container direction="column" rowGap="1.25rem">
                <Grid
                  item
                  container
                  direction={lgUp ? 'row' : 'column'}
                  columnSpacing={modalFieldColumnSpacing}
                  rowSpacing={lgUp ? 0 : modalFieldMobileRowSpacing}
                  alignItems={lgUp ? 'center' : undefined}
                >
                  <Grid item xs={12} lg={5} display="flex">
                    <Typography variant="fieldHeader">
                      {f('user.account.nr')}
                    </Typography>
                    <Typography variant="fieldHeader" color="red" ml="4px">
                      {f('app.common.required_indicator')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} lg={7}>
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
                <Grid
                  item
                  container
                  direction={lgUp ? 'row' : 'column'}
                  columnSpacing={modalFieldColumnSpacing}
                  rowSpacing={lgUp ? 0 : modalFieldMobileRowSpacing}
                  alignItems={lgUp ? 'center' : undefined}
                >
                  <Grid item xs={12} lg={5} display="flex">
                    <Typography variant="fieldHeader">
                      {f('user.account.companycode')}
                    </Typography>
                    <Typography variant="fieldHeader" color="red" ml="4px">
                      {f('app.common.required_indicator')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} lg={7}>
                    <TextField
                      select
                      fullWidth
                      value={companyCode}
                      onChange={handleCompanyCodeChange}
                      error={!!companyCodeError}
                      helperText={companyCodeError}
                      SelectProps={compactFilterSelectProps}
                      sx={(muiTheme) => ({
                        ...getCompactFilterFieldSx(muiTheme),
                      })}
                    >
                      {companyCodes.map((cc) => (
                        <MenuItem
                          key={cc.key}
                          value={cc.key}
                          sx={compactFilterMenuItemSx}
                        >
                          {cc.displayText}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>
                <Grid
                  item
                  container
                  direction={lgUp ? 'row' : 'column'}
                  columnSpacing={modalFieldColumnSpacing}
                  rowSpacing={lgUp ? 0 : modalFieldMobileRowSpacing}
                  alignItems={lgUp ? 'center' : undefined}
                >
                  <Grid item xs={12} lg={5} display="flex">
                    <Typography variant="fieldHeader">
                      {f('user.account.salesorg')}
                    </Typography>
                    <Typography variant="fieldHeader" color="red" ml="4px">
                      {f('app.common.required_indicator')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} lg={7}>
                    <TextField
                      select
                      type="text"
                      fullWidth
                      value={salesOrgCode}
                      onChange={handleSalesOrgCodeChange}
                      error={!!salesOrgCodeError}
                      helperText={salesOrgCodeError}
                      SelectProps={compactFilterSelectProps}
                      sx={(muiTheme) => ({
                        ...getCompactFilterFieldSx(muiTheme),
                      })}
                    >
                      {salesOrgCodes.map((soc) => (
                        <MenuItem
                          key={soc.key}
                          value={soc.key}
                          sx={compactFilterMenuItemSx}
                        >
                          {soc.displayText}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>
                <Grid
                  item
                  container
                  direction={lgUp ? 'row' : 'column'}
                  columnSpacing={modalFieldColumnSpacing}
                  rowSpacing={lgUp ? 0 : modalFieldMobileRowSpacing}
                  alignItems={lgUp ? 'center' : undefined}
                >
                  <Grid item xs={12} lg={5} display="flex">
                    <Typography variant="fieldHeader">
                      {f('user.account.channel')}
                    </Typography>
                    <Typography variant="fieldHeader" color="red" ml="4px">
                      {f('app.common.required_indicator')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} lg={7}>
                    <TextField
                      type="text"
                      fullWidth
                      value={distrChannelCode}
                      onChange={handleDistrChannelCodeChange}
                      error={!!distrChannelCodeError}
                      helperText={distrChannelCodeError}
                      sx={(muiTheme) => ({
                        ...getCompactFilterFieldSx(muiTheme),
                      })}
                    />
                  </Grid>
                </Grid>
                <Grid
                  item
                  container
                  direction={lgUp ? 'row' : 'column'}
                  columnSpacing={modalFieldColumnSpacing}
                  rowSpacing={lgUp ? 0 : modalFieldMobileRowSpacing}
                  alignItems={lgUp ? 'center' : undefined}
                >
                  <Grid item xs={12} lg={5} display="flex">
                    <Typography variant="fieldHeader">
                      {f('user.account.division')}
                    </Typography>
                    <Typography variant="fieldHeader" color="red" ml="4px">
                      {f('app.common.required_indicator')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} lg={7}>
                    <TextField
                      type="text"
                      fullWidth
                      value={divisionCode}
                      onChange={handleDivisionCodeChange}
                      error={!!divisionCodeError}
                      helperText={divisionCodeError}
                      sx={(muiTheme) => ({
                        ...getCompactFilterFieldSx(muiTheme),
                      })}
                    />
                  </Grid>
                </Grid>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>
    </EpayModal>
  );
}

export default AddEditUserLinkedAccountDialog;
