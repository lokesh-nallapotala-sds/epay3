import React, {
  Ref,
  useEffect,
  useImperativeHandle,
  useState,
  useRef,
} from 'react';

import { regionalFormatSelector } from 'redux/reducers';

import { ReasonCode } from 'types/Enums';
import { useAppSelector } from 'redux/hooks';
import { styled } from '@mui/material/styles';
import {
  useEffectiveAccount,
  useGetReasonCodes,
} from 'hooks/usePaymentHelpers';
import RemoveIcon from '@mui/icons-material/Remove';
import { Invoice } from 'types/InvoicesSearchRequest';
import { CurrencySymbol } from 'types/CurrencySymbol';
import PaymentReasonCode from 'types/SapConfig/PaymentReasonCode';
import {
  compactFilterMenuItemSx,
  compactFilterSelectProps,
} from 'shared/components/compactFilterSelectStyles';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';
import {
  toCurrencyString,
  toCurrencySymbol,
  toFormattedDateString,
} from 'utilities/utilities';
import {
  Box,
  FormControl,
  FormHelperText,
  Grid,
  MenuItem,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { PaymentTypes } from '../../constants/UiOptions';
import { PaymentConfig } from 'types/Payment';
import { useFormat } from 'hooks/useFormat';

const PaymentInvoiceBox = styled(Box)(({ theme }) => ({
  width: '100%',
  borderBottom: `1px solid ${theme.mixins.border.color}`,
}));

export interface PaymentInvoiceHandle {
  validate: () => boolean;
}

interface PaymentInvoiceProps {
  data: Invoice;
  config?: PaymentConfig | null;
  onChange: (invoice: Invoice) => void;
  paymentSource?: string;
  companyCode?: string;
  canDelete?: boolean;
  isLastRow?: boolean;
  handleRemoveInvoice?: (payload: string | Invoice) => void;
  paymentMethodType?: string;
  currencyOptions?: CurrencySymbol[];
}

const INITIAL_PAYMENT_REASON_CODE: PaymentReasonCode = {
  reasonCode: '',
  companyCode: '',
  paymentTypeCode: ReasonCode.Damaged,
  description: '',
  isNoteRequired: false,
};

const formatPaymentAmountDisplay = (
  amount?: number | null,
  fixedDecimals = true,
): string => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return '';
  }

  return fixedDecimals ? amount.toFixed(2) : amount.toString();
};

const PaymentInvoice = ({
  data,
  config,
  onChange,
  paymentSource = 'Normal',
  companyCode = '',
  canDelete = false,
  isLastRow = false,
  handleRemoveInvoice,
  paymentMethodType,
  ref,
}: PaymentInvoiceProps & { ref?: Ref<PaymentInvoiceHandle> }) => {
  const theme = useTheme();
  const selectedAccount = useEffectiveAccount();

  const [paymentAmount, setPaymentAmount] = useState<number>(
    data.paymentAmount || 0,
  );
  const [paymentAmountDisplay, setPaymentAmountDisplay] = useState<string>(
    formatPaymentAmountDisplay(data.paymentAmount, false),
  );
  const isPayAmountEdited = useRef(false);
  const [invoice, setInvoice] = useState<Invoice>(data);
  const [reasonError, setReasonError] = useState<boolean>(false);
  const [description, setDescription] = useState('');
  const [descriptionError, setDescriptionError] = useState<boolean>(false);
  const [ammountError, setAmountError] = useState<boolean>(false);
  const [amountErrorText, setAmountErrorText] = useState<string>('');
  const [showReasonCode, setShowReasonCode] = useState<boolean>(false);
  const { reasonCodes } = useGetReasonCodes('O');
  const regionalFormat = useAppSelector(regionalFormatSelector);

  const [selectedReasonCode, setSelectedReasonCode] =
    useState<PaymentReasonCode>(INITIAL_PAYMENT_REASON_CODE);

  const [paymentReasonCodes, setPaymentReasonCodes] = useState<
    Array<PaymentReasonCode>
  >([]);
  const isOverPaymentAllowed = useAppSelector(
    (state) => state.config.overpaymentAllowed,
  );
  const isPartialPaymentAllowed = useAppSelector(
    (state) => state.config.isPartialPaymentAllowed,
  );
  const f = useFormat();
  const pathName = window.location.pathname === '/payment/guest';
  const firstLoad = useRef(true);
  const reasonInitialized = useRef(false);

  useEffect(() => {
    if (firstLoad.current && data) {
      setInvoice(data);
      if (data.description) {
        setDescription(data.description);
      }
      firstLoad.current = false;
    }
    if (!reasonCodes?.length) return;

    const isGuest = paymentSource?.toLowerCase() === 'guest';
    const filteredReasonCodes = reasonCodes.filter(
      (x) =>
        x.companyCode ===
        (isGuest ? companyCode : selectedAccount?.companyCode),
    );
    setPaymentReasonCodes(filteredReasonCodes);
  }, [
    data,
    reasonCodes,
    companyCode,
    paymentSource,
    selectedAccount?.companyCode,
  ]);

  useEffect(() => {
    if (reasonInitialized.current || !data?.reason || !reasonCodes?.length)
      return;
    const reasonCode = reasonCodes.find((r) => r.reasonCode === data.reason);
    if (reasonCode) {
      setSelectedReasonCode(reasonCode);
      setShowReasonCode(true);
      reasonInitialized.current = true;
    }
  }, [data?.reason, reasonCodes]);

  useEffect(() => {
    if (data) {
      setPaymentAmount(data.paymentAmount || 0);

      if (!isPayAmountEdited.current) {
        setPaymentAmountDisplay(formatPaymentAmountDisplay(data.paymentAmount));
      }
    }
  }, [data]);

  useEffect(() => {
    if (!data || isPartialPaymentAllowed || data.invoiceStatus === 'Credit') {
      return;
    }

    const openAmount = data.openAmount ?? 0;
    const shouldResetPaymentAmount = data.paymentAmount !== openAmount;
    const shouldClearPartialPaymentDetails = Boolean(
      data.reason || data.description,
    );

    if (!shouldResetPaymentAmount && !shouldClearPartialPaymentDetails) {
      return;
    }

    const updatedInvoice: Invoice = {
      ...data,
      paymentAmount: openAmount,
      reason: '',
      description: '',
    };

    setInvoice(updatedInvoice);
    setPaymentAmount(openAmount);
    setPaymentAmountDisplay(openAmount.toFixed(2));
    setShowReasonCode(false);
    setSelectedReasonCode(INITIAL_PAYMENT_REASON_CODE);
    setDescription('');
    setReasonError(false);
    setDescriptionError(false);
    onChange(updatedInvoice);
  }, [data, isPartialPaymentAllowed, onChange]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    isPayAmountEdited.current = true;
    const inputValue = e.target.value;

    const regex = /^\d*\.?\d{0,2}$/;

    setPaymentAmountDisplay(inputValue);

    if (inputValue === '0' || inputValue === '' || inputValue === '.') {
      setAmountErrorText(f('payment.zeroamount'));
      setAmountError(true);
      setPaymentAmount(0);
      setShowReasonCode(false);
      return;
    }

    if (regex.test(inputValue)) {
      const numericValue = parseFloat(inputValue);

      if (!isNaN(numericValue)) {
        setPaymentAmount(numericValue);
        setAmountErrorText('');
        setAmountError(false);

        if (
          numericValue > 0 &&
          numericValue < (invoice?.openAmount ?? 0) &&
          isPartialPaymentAllowed
        ) {
          setShowReasonCode(true);
        } else {
          setShowReasonCode(false);
          setSelectedReasonCode(INITIAL_PAYMENT_REASON_CODE);
          setDescription('');
        }

        const newInvoice: Invoice = {
          ...invoice,
          paymentAmount: numericValue,
        };
        setInvoice(newInvoice);
        onChange(newInvoice);
      }
    } else {
      setAmountErrorText(f('payment.error.invalid.amount'));
      setAmountError(true);
      setShowReasonCode(false);
    }
  };

  const handleReason = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    if (value !== '') {
      setReasonError(false);
    }

    const reasonCode = paymentReasonCodes.filter(
      (reason) => reason.reasonCode === value,
    );
    setSelectedReasonCode(reasonCode[0]);
    const newInvoice = { ...invoice, reason: value };
    setInvoice(newInvoice);
    onChange(newInvoice);
  };

  const handleDescription = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    if (value !== '') {
      setDescriptionError(false);
    } else {
      setDescriptionError(true);
    }
    setDescription(value);
    const newInvoice = { ...invoice, description: value };
    setInvoice(newInvoice);
    onChange(newInvoice);
  };
  const isPositiveNumber = (n: unknown): n is number =>
    typeof n === 'number' && Number.isFinite(n) && n > 0;
  const validateData = () => {
    const openAmount = invoice?.openAmount || 0;
    const maxPaymentAllowed =
      paymentMethodType !== PaymentTypes.EC
        ? config?.maximumAllowedCCAmount
        : config?.maximumAllowedECAmount;

    const canPayByECorCC = (paymentTotal: number) =>
      !isPositiveNumber(maxPaymentAllowed) || paymentTotal <= maxPaymentAllowed;
    if (paymentAmount === 0) {
      setAmountErrorText(f('payment.zeroamount'));
      setAmountError(true);
      return false;
    }
    if (openAmount < paymentAmount && !isOverPaymentAllowed) {
      setAmountErrorText(f('payment.error.over_payment_not_allowed'));
      setAmountError(true);
      return false;
    }
    if (paymentAmount < openAmount && !isPartialPaymentAllowed) {
      setAmountErrorText(f('payment.error.partial_payment_not_allowed'));
      setAmountError(true);
      return false;
    }
    if (
      !canPayByECorCC(paymentAmount) &&
      paymentMethodType !== PaymentTypes.EC
    ) {
      setAmountErrorText(
        f('payment.error.maximum_card_payment_exceeded_message'),
      );
      setAmountError(true);
      return false;
    }

    if (!canPayByECorCC(paymentAmount) && paymentMethodType === 'EC') {
      setAmountErrorText(
        f('payment.error.maximum_card_payment_exceeded_message'),
      );
      setAmountError(true);
      return false;
    }
    if (
      paymentAmount < openAmount &&
      (!selectedReasonCode.reasonCode || selectedReasonCode.reasonCode === '')
    ) {
      setReasonError(true);
      return false;
    }

    if (
      paymentAmount < openAmount &&
      selectedReasonCode.reasonCode === 'DG' &&
      description.trim() === ''
    ) {
      setDescriptionError(true);
      return false;
    }

    setAmountError(false);
    setReasonError(false);
    setDescriptionError(false);
    return true;
  };

  useImperativeHandle(ref, () => ({
    validate: validateData,
  }));

  const handleBlur = () => {
    isPayAmountEdited.current = false;
    if (!paymentAmountDisplay) {
      return;
    }

    if (paymentAmountDisplay !== '') {
      const numericValue = parseFloat(paymentAmountDisplay);

      if (Number.isNaN(numericValue)) {
        setPaymentAmountDisplay('');
        return;
      }

      // Prevent formatting if the user ends with '.'
      if (paymentAmountDisplay?.endsWith('.')) {
        return;
      }

      const formattedValue = Number.isInteger(numericValue)
        ? numericValue.toString()
        : numericValue.toFixed(2);

      setPaymentAmountDisplay(formattedValue);
    }
  };

  return (
    <PaymentInvoiceBox
      sx={{
        padding: { xs: '10px 0', sm: '10px' },
        ...(isLastRow && { borderBottom: '0px !important' }),
      }}
    >
      <Grid
        container
        sx={{
          alignItems: 'center',
          marginBottom: '1.25rem',
          flexWrap: 'nowrap',
          msOverflowX: 'auto',
        }}
        flexDirection="row"
      >
        <Grid item xs={4} sm={2} md={2} lg={2} sx={{ paddingLeft: '8px' }}>
          <Typography variant="body2" align="left" sx={{ color: '#0D0D12' }}>
            {invoice.billingDocumentNumber?.replace(/^0+/, '')}
          </Typography>
        </Grid>
        <Grid item sm={2} md={2} lg={2}>
          <Typography
            variant="body2"
            sx={{ color: '#0D0D12', display: { xs: 'none', sm: 'block' } }}
          >
            {invoice.documentDate
              ? toFormattedDateString(invoice.documentDate, regionalFormat)
              : ''}
          </Typography>
        </Grid>
        <Grid item sm={2} md={2} lg={2}>
          <Typography
            variant="body2"
            sx={{ color: '#0D0D12', display: { xs: 'none', sm: 'block' } }}
          >
            {invoice?.soldtoNumber?.replace(/^0+/, '')}
          </Typography>
        </Grid>
        <Grid item xs={4} sm={2} md={2} lg={2}>
          <Typography
            variant="body2"
            sx={{ color: '#0D0D12', marginLeft: '10px' }}
          >
            {toCurrencyString(
              invoice?.currencyKey,
              invoice?.openAmount ?? 0,
              true,
              regionalFormat,
            )}
          </Typography>
        </Grid>
        <Grid
          item
          container
          xs={4}
          sm={3}
          md={3}
          lg={3}
          direction={'row'}
          sx={{
            height: 'auto',
            paddingRight: { xs: canDelete ? 0 : '8px', sm: 0 },
          }}
        >
          <Grid item xs={2} sm={2} md={2} lg={1.6}>
            {invoice.invoiceStatus !== 'Credit' ? (
              <TextField
                value={toCurrencySymbol(invoice?.currencyKey)}
                fullWidth
                sx={(muiTheme) => ({
                  ...getCompactFilterFieldSx(muiTheme),
                  '& .MuiInputBase-root': {
                    ...getCompactFilterFieldSx(muiTheme)[
                      '&& .MuiInputBase-root'
                    ],
                    borderRadius: '6px 0px 0px 6px !important',
                  },
                })}
                InputProps={{
                  readOnly: true,
                  sx: {
                    height: '28px !important',
                    borderRadius: '6px 0px 0px 6px !important',
                    paddingLeft: '0px !important',
                    paddingRight: '0px !important',
                  },
                }}
                inputProps={{
                  sx: {
                    textAlign: 'center',
                    backgroundColor: !isPartialPaymentAllowed
                      ? '#F8F9F9 !important'
                      : 'inherit',
                  },
                }}
              />
            ) : (
              <Box sx={{ visibility: 'hidden', height: '40px' }} />
            )}
          </Grid>

          <Grid item xs={10} sm={10} md={10} lg={10.4}>
            {invoice.invoiceStatus != 'Credit' ? (
              <FormControl
                fullWidth
                error={ammountError}
                sx={{ position: 'relative' }}
              >
                <TextField
                  type="text"
                  disabled={!isPartialPaymentAllowed}
                  fullWidth
                  value={paymentAmountDisplay || ''}
                  onChange={handleAmountChange}
                  onBlur={handleBlur}
                  sx={(muiTheme) => ({
                    ...getCompactFilterFieldSx(muiTheme),
                    '& .MuiInputBase-root': {
                      ...getCompactFilterFieldSx(muiTheme)[
                        '&& .MuiInputBase-root'
                      ],
                      borderRadius: '0px 6px 6px 0px !important',
                    },
                    '& .MuiInputBase-input.Mui-disabled': {
                      WebkitTextFillColor: theme.palette.text.primary,
                      color: theme.palette.text.primary,
                    },
                  })}
                  InputProps={{
                    readOnly: !isPartialPaymentAllowed,
                    sx: {
                      fontSize: '12px',
                      height: '28px !important',
                      borderRadius: '0px 6px 6px 0px !important',
                      paddingLeft: '.5rem !important',
                      paddingRight: '.5rem !important',
                      backgroundColor: !isPartialPaymentAllowed
                        ? '#F8F9F9 !important'
                        : 'inherit',
                    },
                  }}
                />

                {ammountError && (
                  <FormHelperText
                    sx={{
                      position: 'absolute',
                      top: { xs: '26px', sm: '32px' },
                      left: '-13PX',
                      width: '100%',
                      lineHeight: '0.90rem',
                    }}
                  >
                    {amountErrorText}
                  </FormHelperText>
                )}
              </FormControl>
            ) : (
              <Box sx={{ visibility: 'hidden', height: '40px' }} />
            )}
          </Grid>
        </Grid>
        {canDelete && (
          <Grid item sm={1} md={1} lg={1}>
            <RemoveIcon
              onClick={() => {
                setShowReasonCode(false);
                if (handleRemoveInvoice && data.uid)
                  handleRemoveInvoice(data.uid);
              }}
              sx={{
                cursor: 'pointer',
                color: '#FFFFFF',
                border: '1px solid',
                borderRadius: '4px',
                background: theme.palette.interactiveColor,
                margin: '10px',
              }}
            />
          </Grid>
        )}
      </Grid>
      <Grid
        item
        container
        sx={{
          marginTop: ammountError ? (pathName ? '30px' : '22px') : '5px',
        }}
        alignItems="left"
      >
        {
          <Grid
            item
            container
            xs={12}
            sm={6}
            md={6}
            lg={6}
            paddingBottom=".8rem"
            alignItems="center"
            sx={{
              display:
                isPartialPaymentAllowed && showReasonCode ? 'flex' : 'none',
              width: '100%',
              paddingBottom:
                isPartialPaymentAllowed && showReasonCode ? '.8rem' : '0',
            }}
          >
            <Grid
              item
              xs={3.75}
              sm={4}
              md={4}
              lg={4}
              sx={{ paddingLeft: '8px' }}
            >
              <Typography
                variant="body2"
                sx={{ color: '#0D0D12' }}
                align="left"
              >
                {f('payment.reason')}
              </Typography>
            </Grid>
            <Grid
              item
              xs={8.25}
              sm={6}
              md={6}
              lg={6}
              sx={{ paddingRight: '10px' }}
            >
              <FormControl
                fullWidth
                error={reasonError}
                sx={{ position: 'relative' }}
              >
                <TextField
                  select
                  fullWidth
                  value={selectedReasonCode.reasonCode}
                  onChange={handleReason}
                  error={reasonError}
                  sx={(muiTheme) => ({
                    ...getCompactFilterFieldSx(muiTheme),
                    '& .MuiInputBase-root': {
                      ...getCompactFilterFieldSx(muiTheme)[
                        '&& .MuiInputBase-root'
                      ],
                      borderRadius: '6px !important',
                    },
                  })}
                  SelectProps={{
                    MenuProps: {
                      MenuListProps:
                        compactFilterSelectProps.MenuProps.MenuListProps,
                    },
                  }}
                  InputProps={{
                    sx: {
                      height: '28px !important',
                      fontSize: '12px',
                      borderRadius: '6px !important',
                    },
                  }}
                >
                  {paymentReasonCodes.length != 0 ? (
                    paymentReasonCodes.map((option) => (
                      <MenuItem
                        key={option.reasonCode}
                        value={option?.reasonCode}
                        sx={compactFilterMenuItemSx}
                      >
                        <Typography variant="body2">
                          {option.description}
                        </Typography>
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem key={''} sx={compactFilterMenuItemSx}>
                      {''}
                    </MenuItem>
                  )}
                </TextField>
                {reasonError && (
                  <FormHelperText
                    sx={{
                      position: 'absolute',
                      top: { xs: '27px', sm: '32px' },
                      left: '13px',
                      width: '100%',
                      lineHeight: '0.90rem',
                    }}
                  >
                    {reasonError ? `${f('payment.reasonrequired')}` : ''}
                  </FormHelperText>
                )}
              </FormControl>
            </Grid>
          </Grid>
        }

        <Grid
          item
          container
          xs={12}
          sm={5}
          md={5}
          lg={5}
          paddingBottom=".8rem"
          alignItems="center"
          display={
            paymentAmount > 0 &&
            paymentAmount < (invoice?.openAmount ?? 0) &&
            selectedReasonCode.reasonCode === 'DG'
              ? 'flex'
              : 'none'
          }
        >
          <Grid item xs={3.75} sm={4.8} md={4.8} lg={4.8}>
            <Typography
              variant="body2"
              align="left"
              sx={{ padding: '0 10px', color: '#0D0D12' }}
            >
              {f('payment.description')}
            </Typography>
          </Grid>
          <Grid
            item
            xs={8.25}
            sm={7.2}
            md={7.2}
            lg={7.2}
            sx={{ paddingRight: { xs: '10px', sm: 0 } }}
          >
            <FormControl
              fullWidth
              error={descriptionError}
              sx={{ position: 'relative' }}
            >
              <TextField
                type="text"
                fullWidth
                value={description}
                onChange={handleDescription}
                error={descriptionError}
                sx={(muiTheme) => ({
                  ...getCompactFilterFieldSx(muiTheme),
                  '& .MuiInputBase-root': {
                    ...getCompactFilterFieldSx(muiTheme)[
                      '&& .MuiInputBase-root'
                    ],
                    borderRadius: '6px !important',
                  },
                })}
                InputProps={{
                  sx: {
                    height: '28px !important',
                    fontSize: '12px',
                    borderRadius: '6px !important',
                  },
                }}
              />
              {descriptionError && (
                <FormHelperText
                  sx={{
                    position: 'absolute',
                    top: { xs: '27px', sm: '29px' },
                    left: '0',
                    width: '100%',
                    lineHeight: '0.90rem',
                  }}
                >
                  {descriptionError
                    ? `${f('payment.descriptionrequired')}`
                    : ''}
                </FormHelperText>
              )}
            </FormControl>
          </Grid>
        </Grid>
      </Grid>
    </PaymentInvoiceBox>
  );
};

export default PaymentInvoice;
