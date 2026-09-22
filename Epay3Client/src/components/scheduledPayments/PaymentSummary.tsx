import { useEffect, useMemo, useState } from 'react';
import { Invoice } from 'types/InvoicesSearchRequest';

import { useIntl } from 'react-intl';
import dayjs, { Dayjs } from 'dayjs';

import { useTheme } from '@mui/system';
import { useAppDispatch, useAppSelector } from 'redux/hooks';
import { getDatePickerFormat } from 'constants/languages';
import { regionalFormatSelector } from 'redux/reducers';
import { toCurrencyString } from 'utilities/utilities';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Box, Button, Grid, Typography } from '@mui/material';
import EpayCheckBox from 'shared/components/EpayCheckBox';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useSchedulePolicyDisabler } from 'hooks/useSchedulePolicyDisabler';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
  selectIsSchedulePaymentsEnabled,
  selectScheduledPaymentPolicy,
} from 'redux/selectors/configSelectors';
import { setScheduleDate } from '../../redux/reducers/paymentSlice';
import {
  DayKey,
  EMPTY_POLICY,
  ScheduledPaymentPolicy,
  ServerScheduledPaymentPolicy,
} from '../../types/ScheduledPaymentPolicy';

interface PaymentSummaryProps {
  payTotal: number;
  currencyKey: string;
  data: Invoice[];
  paymentDate?: string;
  creditAmount: number;
  amountToPay: number;
  onPaymentDateChange?: (date: string) => void;
  isPaymentMethodComplete: boolean;
  paymentMethodType?: 'echeck' | 'creditcard';
  onSchedulePayment: () => void;
  agreeToSchedulePayment: boolean;
  onAgreeToSchedulePaymentChange: (checked: boolean) => void;
  isPaymentMethodExpanded: boolean;
  isAddressValidationExpanded: boolean;
  isAddressValidationComplete: boolean;
}

export default function PaymentSummary({
  payTotal,
  currencyKey,
  amountToPay,
  paymentDate,
  onPaymentDateChange,
  isPaymentMethodComplete,
  paymentMethodType,
  onSchedulePayment,
  agreeToSchedulePayment,
  onAgreeToSchedulePaymentChange,
  isPaymentMethodExpanded,
  isAddressValidationExpanded,
  isAddressValidationComplete,
  creditAmount,
}: PaymentSummaryProps) {
  const intl = useIntl();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const regionalFormat = useAppSelector(regionalFormatSelector);
  const datePickerFormat = getDatePickerFormat(regionalFormat);
  const f = (id: string) => intl.formatMessage({ id, defaultMessage: id });
  const [paymentDateSelected, setPaymentDateSelected] = useState<Dayjs | null>(
    null,
  );
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const toDayKey = (s: string): DayKey | null => {
    const k = s.toLowerCase().slice(0, 3);
    const map: Record<string, DayKey> = {
      sun: 'sun',
      mon: 'mon',
      tue: 'tue',
      wed: 'wed',
      thu: 'thu',
      fri: 'fri',
      sat: 'sat',
    };
    return map[k] ?? null;
  };

  const normalizeServerPolicy = (
    sp?: ServerScheduledPaymentPolicy | null,
  ): ScheduledPaymentPolicy => {
    if (!sp) return EMPTY_POLICY;

    const mode: ScheduledPaymentPolicy['mode'] =
      sp.mode === 'Daily' || sp.mode === 'Weekday' || sp.mode === 'Monthly'
        ? sp.mode
        : 'Daily';

    const wk: DayKey[] = (sp.allowedWeekdays ?? [])
      .map((v) => (typeof v === 'string' ? toDayKey(v) : v))
      .filter((v): v is DayKey => !!v);

    const md: number[] = (sp.allowedMonthDays ?? [])
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 31);

    return {
      mode,
      allowedWeekdays: mode === 'Weekday' ? [...new Set(wk)] : [],
      allowedMonthDays:
        mode === 'Monthly' ? [...new Set(md)].sort((a, b) => a - b) : [],
    };
  };

  const isSchedulePaymentsEnabled = useAppSelector(
    selectIsSchedulePaymentsEnabled,
  );
  const reduxScheduledPaymentPolicy = useAppSelector(
    selectScheduledPaymentPolicy,
  );
  const scheduledPaymentPolicy = useMemo(
    () => normalizeServerPolicy(reduxScheduledPaymentPolicy),
    [reduxScheduledPaymentPolicy],
  );

  useEffect(() => {
    if (!paymentDate) {
      setPaymentDateSelected(null);
      return;
    }

    const d = dayjs(paymentDate);
    if (!paymentDateSelected || !paymentDateSelected.isSame(d, 'day')) {
      setPaymentDateSelected(d);
    }
  }, [paymentDate]);

  const handlePaymentDateChange = (next: Dayjs | null) => {
    setPaymentDateSelected(next);
    setIsCalendarOpen(false);

    if (next && next.isValid && next.isValid()) {
      const year = next.year();
      const currentYear = dayjs().year();
      const isWithinRange = year >= currentYear && year <= 2500;
      if (isWithinRange && !shouldDisableDate(next)) {
        const formattedDate = next.format('MM-DD-YYYY');
        onPaymentDateChange?.(formattedDate);
        dispatch(setScheduleDate(formattedDate));
        return;
      }
    }

    onPaymentDateChange?.('');
    dispatch(setScheduleDate(''));
  };

  const isDateFieldEnabled =
    isPaymentMethodComplete &&
    !isPaymentMethodExpanded &&
    (paymentMethodType === 'echeck' ||
      (paymentMethodType === 'creditcard' &&
        isAddressValidationComplete &&
        !isAddressValidationExpanded));

  const isScheduleButtonEnabled =
    isDateFieldEnabled && paymentDate && payTotal > 0 && agreeToSchedulePayment;

  const { shouldDisableDate } = useSchedulePolicyDisabler(
    isSchedulePaymentsEnabled,
    scheduledPaymentPolicy,
  );

  const openCalendar = () => {
    if (isDateFieldEnabled) {
      setIsCalendarOpen(true);
    }
  };

  return (
    <Grid item container sm={12} md={12} lg={12} p="1.3rem">
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        width="100%"
      >
        <Box flex={1}>
          <Typography
            variant="fieldHeader"
            sx={{
              color: '#808897',
            }}
          >
            {f('payment.pay_amount')}
          </Typography>
        </Box>

        <Box minWidth="80px" textAlign="right">
          <Typography variant="body2">
            {`${toCurrencyString(currencyKey, amountToPay, false, regionalFormat)}`}
          </Typography>
        </Box>
      </Box>
      {creditAmount != 0 && (
        <Grid
          container
          mt="10px"
          justifyContent="space-between"
          alignItems="center"
        >
          <Grid item lg={9}>
            <Typography
              variant="fieldHeader"
              sx={{
                color: '#808897',
              }}
            >
              {f('payment.credits')}
            </Typography>
          </Grid>
          <Grid item lg={3}>
            <Typography
              variant="body2"
              sx={{
                textAlign: 'right',
                color: 'green',
              }}
            >
              {`${toCurrencyString(currencyKey, creditAmount, false, regionalFormat)}`}
            </Typography>
          </Grid>
        </Grid>
      )}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        width="100%"
        sx={{
          paddingTop: '10px',
          borderTop: '1px solid',
          borderTopColor: '#E0E0E0',
          marginTop: 2,
        }}
      >
        <Box flex={1}>
          <Typography
            variant="fieldHeader"
            sx={{
              color: '#808897',
            }}
          >
            {f('invoices.table.total')}
          </Typography>
        </Box>
        <Box minWidth="80px" textAlign="right">
          <Typography variant="body2">
            {`${toCurrencyString(currencyKey, payTotal, false, regionalFormat)}`}
          </Typography>
        </Box>
      </Box>

      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        width="100%"
        sx={{
          paddingTop: '10px',
          marginTop: 2,
        }}
      >
        <Box flex={1}>
          <Typography
            variant="fieldHeader"
            sx={{
              color: '#808897',
            }}
          >
            {f('schedule.payment.date')}
          </Typography>
        </Box>
        <Box minWidth="120px">
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              value={paymentDateSelected ?? null}
              onChange={handlePaymentDateChange}
              open={isCalendarOpen}
              onOpen={() => setIsCalendarOpen(true)}
              onClose={() => setIsCalendarOpen(false)}
              format={datePickerFormat}
              shouldDisableDate={shouldDisableDate}
              disabled={!isDateFieldEnabled}
              disablePast
              slots={{ switchViewIcon: KeyboardArrowDownIcon }}
              slotProps={{
                textField: {
                  error: false,
                  placeholder: '',
                  onClick: openCalendar,
                  inputProps: {
                    inputMode: 'none',
                    readOnly: true,
                    onClick: openCalendar,
                  },
                },
                openPickerButton: {
                  onClick: openCalendar,
                  sx: {
                    color: isDateFieldEnabled
                      ? theme.palette.interactiveColor
                      : theme.palette.action.disabled,
                  },
                },
              }}
            />
          </LocalizationProvider>
        </Box>
      </Box>

      <Box
        display="flex"
        alignItems="flex-start"
        width="100%"
        sx={{
          gap: 1,
          marginTop: 3,
        }}
      >
        <EpayCheckBox
          checked={agreeToSchedulePayment}
          onClick={onAgreeToSchedulePaymentChange}
          sx={{
            m: 0,
            mt: '0.16rem',
            width: '1.1rem',
            minWidth: '1.1rem',
            height: '1.1rem',
            transform: 'scale(1.15)',
            alignSelf: 'flex-start',
          }}
          fontSize="1.1rem"
        />
        <Typography
          variant="body2"
          sx={{
            lineHeight: 1.5,
          }}
        >
          {f('schedule.consent.agree')}
        </Typography>
      </Box>

      <Box
        display="flex"
        justifyContent="center"
        width="100%"
        sx={{
          marginTop: 3,
        }}
      >
        <Button
          variant="contained"
          onClick={onSchedulePayment}
          disabled={!isScheduleButtonEnabled}
          fullWidth
          sx={{
            ...(isScheduleButtonEnabled && {
              border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
              '&:hover': {
                border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
              },
            }),
            minWidth: '200px',
            py: 1.5,
            px: 3,
          }}
        >
          {f('schedule.payment.button.text')}
        </Button>
      </Box>
    </Grid>
  );
}
