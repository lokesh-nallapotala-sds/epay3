import { useEffect, useState } from 'react';
import { Grid, MenuItem, TextField, Typography } from '@mui/material';
import {
  useEffectiveAccount,
  useGetReasonCodes,
} from 'hooks/usePaymentHelpers';
import { DepositDetails } from 'types/DepositDetails';
import EpayBox from 'shared/components/EpayBox';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';
import { ReasonCode } from 'types/Enums';
import PaymentReasonCode from 'types/SapConfig/PaymentReasonCode';
import { useFormat } from 'hooks/useFormat';

export default function NewDeposit({
  isDisabled,
  onAmountChange,
  onReferenceNumberChange,
  onNotesChange,
  onCurrencyChange,
  onReasonCodeChange,
  storedDepositDetails,
  currencyOptions,
}: {
  isDisabled?: boolean;
  onAmountChange: (value: string) => void;
  onReferenceNumberChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onReasonCodeChange: (reasonCode: unknown) => void;
  storedDepositDetails: DepositDetails;
  currencyOptions: { value: string; label: string }[];
}) {
  const f = useFormat();
  const selectedAccount = useEffectiveAccount();
  const [amount, setAmount] = useState(
    storedDepositDetails.amountToProcess === 0
      ? ''
      : storedDepositDetails.amountToProcess,
  );
  const [referenceNumber, setReferenceNumber] = useState(
    storedDepositDetails.referenceNumber,
  );
  const [notes, setNotes] = useState(storedDepositDetails.comment);
  const [selectedOption, setSelectedOption] = useState(
    storedDepositDetails.currencyKey ? storedDepositDetails.currencyKey : 'USD',
  );

  const { reasonCodes } = useGetReasonCodes(ReasonCode.Damaged);
  const [selectedReasonCode, setSelectedReasonCode] =
    useState<PaymentReasonCode>({
      reasonCode: storedDepositDetails.reasonCode || '',
      companyCode: '',
      paymentTypeCode: ReasonCode.Damaged,
      description: '',
      isNoteRequired: false,
    });

  const [paymentReasonCodes, setPaymentReasonCodes] = useState<
    Array<PaymentReasonCode>
  >([]);

  useEffect(() => {
    if (currencyOptions.length === 0) {
      return;
    }

    const storedCurrency = storedDepositDetails.currencyKey;
    const hasStoredCurrency = currencyOptions.some(
      (x) => x.value === storedCurrency,
    );
    const hasSelectedCurrency = currencyOptions.some(
      (x) => x.value === selectedOption,
    );
    const selectedCurrency = hasStoredCurrency
      ? storedCurrency
      : hasSelectedCurrency
        ? selectedOption
        : currencyOptions.some((x) => x.value === 'USD')
          ? 'USD'
          : currencyOptions[0].value;

    if (selectedOption !== selectedCurrency) {
      setSelectedOption(selectedCurrency);
    }

    if (storedCurrency !== selectedCurrency) {
      onCurrencyChange(selectedCurrency);
    }
  }, [
    currencyOptions,
    onCurrencyChange,
    selectedOption,
    storedDepositDetails.currencyKey,
  ]);

  useEffect(() => {
    if (reasonCodes.length > 0) {
      const filteredReasonCodes = reasonCodes.filter(
        (x) => x.companyCode === selectedAccount?.companyCode,
      );

      if (filteredReasonCodes.length > 0) {
        const storedReasonCode = filteredReasonCodes.find(
          (reason) => reason.reasonCode === storedDepositDetails.reasonCode,
        );
        const nextReasonCode = storedReasonCode || filteredReasonCodes[0];

        setPaymentReasonCodes(filteredReasonCodes);
        setSelectedReasonCode(nextReasonCode);
        if (storedDepositDetails.reasonCode !== nextReasonCode.reasonCode) {
          onReasonCodeChange(nextReasonCode);
        }
      }
    }
  }, [
    reasonCodes,
    selectedAccount?.companyCode,
    storedDepositDetails.reasonCode,
  ]);

  //#region onChange events
  const changeSelectedReasonCode = (event) => {
    const reasonCodeId = event.target.value;
    const reasonCode = paymentReasonCodes?.find(
      (reason) => reason.reasonCode === reasonCodeId,
    );
    if (reasonCode) {
      setSelectedReasonCode(reasonCode);
      onReasonCodeChange(reasonCode);
    }
  };

  const handleAmountChange = (e) => {
    if (e.target.value.length > 8) {
      return;
    }
    setAmount(e.target.value);
    onAmountChange(e.target.value);
  };

  const handleReferenceNumberChange = (e) => {
    setReferenceNumber(e.target.value);
    onReferenceNumberChange(e.target.value);
  };

  const handleNotesChange = (e) => {
    setNotes(e.target.value);
    onNotesChange(e.target.value);
  };

  const handleCurrencyChange = (e) => {
    setSelectedOption(e.target.value);
    onCurrencyChange(e.target.value);
  };
  //#endregion

  return (
    <EpayBox
      aria-disabled={isDisabled}
      sx={{
        width: '100%',
        padding: '0px',
        height: '100%',
        pointerEvents: isDisabled ? 'none' : 'auto',
      }}
    >
      <Grid container flexDirection="column">
        <Grid
          sx={{
            borderBottom: '1px solid',
            borderBottomColor: '#E0E0E0',
            padding: '1rem 1.3rem',
            height: '51px',
          }}
        >
          <Typography variant="h5" align="left">
            {f('deposits.header')}
          </Typography>
        </Grid>
        <Grid
          container
          flexDirection="column"
          sx={{
            padding: '1rem 1.3rem 1.3rem',
          }}
        >
          <Grid item container sm={12} lg={12} flexDirection={'column'}>
            <Grid item sm={4} lg={2} marginBottom="0.5rem" display="flex">
              <Typography variant="fieldHeader">
                {f('deposits.amount')}
              </Typography>
              <Typography variant="fieldHeader" color="red" ml=".25rem">
                {f('app.common.required_indicator')}
              </Typography>
            </Grid>
            <Grid
              item
              container
              direction="row"
              flexWrap="nowrap"
              sm={12}
              lg={12}
              marginBottom="1.3rem"
            >
              <Grid
                item
                xs="auto"
                sm={3}
                md={2}
                lg={1.35}
                sx={{
                  width: { xs: '75px', sm: 'auto' },
                  minWidth: 0,
                  position: 'relative',
                  zIndex: 1,
                  '&:focus-within': {
                    zIndex: 3,
                  },
                }}
              >
                <TextField
                  select
                  value={selectedOption || 'USD'}
                  fullWidth
                  onChange={handleCurrencyChange}
                  sx={(theme) => ({
                    ...getCompactFilterFieldSx(theme),
                    '& .MuiInputBase-root': {
                      ...getCompactFilterFieldSx(theme)[
                        '&& .MuiInputBase-root'
                      ],
                      borderTopRightRadius: '0 !important',
                      borderBottomRightRadius: '0 !important',
                    },
                    '& .MuiSelect-select': {
                      ...getCompactFilterFieldSx(theme)['&& .MuiSelect-select'],
                      borderTopRightRadius: '0 !important',
                      borderBottomRightRadius: '0 !important',
                    },
                    '& .MuiSelect-select:focus': {
                      ...getCompactFilterFieldSx(theme)[
                        '&& .MuiSelect-select:focus'
                      ],
                      borderTopRightRadius: '0 !important',
                      borderBottomRightRadius: '0 !important',
                    },
                    '& .MuiInputBase-root.Mui-focused': {
                      position: 'relative',
                      zIndex: 3,
                    },
                  })}
                  InputProps={{
                    sx: {
                      borderTopRightRadius: '0 !important',
                      borderBottomRightRadius: '0 !important',
                    },
                  }}
                >
                  {currencyOptions.length > 0 ? (
                    currencyOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem key={''}>{''}</MenuItem>
                  )}
                </TextField>
              </Grid>
              <Grid
                item
                xs={10}
                sm={10}
                md={10}
                lg={10.65}
                sx={{ minWidth: 0 }}
              >
                <TextField
                  type="number"
                  onChange={handleAmountChange}
                  value={amount || ''}
                  fullWidth
                  required
                  sx={(theme) => ({
                    ...getCompactFilterFieldSx(theme),
                    '& .MuiInputBase-root': {
                      ...getCompactFilterFieldSx(theme)[
                        '&& .MuiInputBase-root'
                      ],
                      borderTopLeftRadius: '0 !important',
                      borderBottomLeftRadius: '0 !important',
                    },
                  })}
                  InputProps={{
                    sx: {
                      borderTopLeftRadius: '0 !important',
                      borderBottomLeftRadius: '0 !important',
                    },
                  }}
                />
              </Grid>
            </Grid>
          </Grid>
          <Grid item container sm={12} lg={12} flexDirection={'column'}>
            <Grid item sx={{ marginBottom: '0.5rem' }} display="flex">
              <Typography variant="fieldHeader">
                {f('deposits.reasoncode')}
              </Typography>
              <Typography variant="fieldHeader" color="red" ml=".25rem">
                {f('app.common.required_indicator')}
              </Typography>
            </Grid>
            <Grid item sm={12} lg={12} marginBottom="1.3rem">
              <TextField
                select
                onChange={changeSelectedReasonCode}
                fullWidth
                value={selectedReasonCode.reasonCode || ''}
                sx={getCompactFilterFieldSx}
              >
                {paymentReasonCodes.length != 0 ? (
                  paymentReasonCodes.map((option) => (
                    <MenuItem
                      key={option?.reasonCode}
                      value={option?.reasonCode}
                    >
                      {option.description}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem
                    key="no-options"
                    value={selectedReasonCode.reasonCode}
                  >
                    {''}
                  </MenuItem>
                )}
              </TextField>
            </Grid>
          </Grid>
          <Grid item container sm={12} lg={12} flexDirection={'column'}>
            <Grid item sx={{ marginBottom: '0.5rem' }} display="flex">
              <Typography variant="fieldHeader">
                {f('deposits.referncenumber')}
              </Typography>
              <Typography variant="fieldHeader" color="red" ml=".25rem">
                {f('app.common.required_indicator')}
              </Typography>
            </Grid>
            <Grid item marginBottom="1.3rem">
              <TextField
                type="text"
                value={referenceNumber}
                onChange={handleReferenceNumberChange}
                required
                fullWidth
                sx={getCompactFilterFieldSx}
              />
            </Grid>
          </Grid>
          <Grid item container sm={12} lg={12} flexDirection={'column'}>
            <Grid item marginBottom="0.5rem" display="flex">
              <Typography variant="fieldHeader">
                {f('deposits.paymentnote')}
              </Typography>
              <Typography variant="fieldHeader" color="red" ml=".25rem">
                {f('app.common.required_indicator')}
              </Typography>
            </Grid>
            <Grid item>
              <TextField
                multiline
                fullWidth
                rows={3.2}
                value={notes}
                onChange={handleNotesChange}
                sx={getCompactFilterFieldSx}
              ></TextField>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </EpayBox>
  );
}
