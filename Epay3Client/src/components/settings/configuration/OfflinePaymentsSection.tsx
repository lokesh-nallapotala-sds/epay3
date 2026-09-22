import { ReactNode, useEffect, useMemo, ChangeEvent } from 'react';

import { SelectChangeEvent } from '@mui/material/Select';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useFormat } from 'hooks/useFormat';
import {
  Box,
  Chip,
  Divider,
  Grid,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  DayKey,
  DAYS,
  INDEX,
  MONTH_DAYS,
  ScheduledPaymentPolicy,
} from 'types/ScheduledPaymentPolicy';
import {
  compactFilterMenuItemSx,
  compactFilterSelectProps,
} from 'shared/components/compactFilterSelectStyles';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

type Props = {
  isAutoPayEnabled: boolean;
  isSchedulePaymentsEnabled: boolean;
  policy: ScheduledPaymentPolicy;
  onChange: (next: {
    isAutoPayEnabled: boolean;
    isSchedulePaymentsEnabled: boolean;
    policy: ScheduledPaymentPolicy;
  }) => void;
  onValidationChange?: (hasError: boolean) => void;
};

export default function OfflinePaymentsSection({
  isAutoPayEnabled,
  isSchedulePaymentsEnabled,
  policy,
  onChange,
  onValidationChange,
}: Props) {
  const f = useFormat();

  const update = (partial: Partial<Props>) => {
    onChange({
      isAutoPayEnabled: partial.isAutoPayEnabled ?? isAutoPayEnabled,
      isSchedulePaymentsEnabled:
        partial.isSchedulePaymentsEnabled ?? isSchedulePaymentsEnabled,
      policy: partial.policy ?? policy,
    });
  };

  const getPolicyErrors = (enabled: boolean, p: ScheduledPaymentPolicy) => {
    if (!enabled || p.mode === 'Daily') {
      return { weekdaysError: false, monthDaysError: false, hasError: false };
    }
    if (p.mode === 'Weekday') {
      const miss = !p.allowedWeekdays || p.allowedWeekdays.length === 0;
      return { weekdaysError: miss, monthDaysError: false, hasError: miss };
    }
    if (p.mode === 'Monthly') {
      const miss = !p.allowedMonthDays || p.allowedMonthDays.length === 0;
      return { weekdaysError: false, monthDaysError: miss, hasError: miss };
    }
    return { weekdaysError: false, monthDaysError: false, hasError: false };
  };

  const { weekdaysError, monthDaysError, hasError } = useMemo(
    () => getPolicyErrors(isSchedulePaymentsEnabled, policy),
    [isSchedulePaymentsEnabled, policy],
  );

  useEffect(() => {
    onValidationChange?.(hasError);
  }, [hasError, onValidationChange]);

  const handleEnableAutoPay = (
    _: ChangeEvent<HTMLInputElement>,
    checked: boolean,
  ) => {
    update({ isAutoPayEnabled: checked });
  };

  const handleEnableScheduledPayments = (
    _: ChangeEvent<HTMLInputElement>,
    checked: boolean,
  ) => {
    update({ isSchedulePaymentsEnabled: checked });
  };

  const handleModeChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const mode = e.target.value as ScheduledPaymentPolicy['mode'];
    const next: ScheduledPaymentPolicy = {
      ...policy,
      mode,
      allowedWeekdays: mode === 'Weekday' ? (policy.allowedWeekdays ?? []) : [],
      allowedMonthDays:
        mode === 'Monthly' ? (policy.allowedMonthDays ?? []) : [],
    };
    update({ policy: next });
  };

  const handleWeekdaysChange = (
    e: SelectChangeEvent<unknown>,
    _child: ReactNode,
  ) => {
    const raw = e.target.value as string | string[];
    const selected = Array.isArray(raw) ? raw : raw.split(',');
    const dayKeys = selected as DayKey[];
    const sorted = dayKeys.slice().sort((a, b) => INDEX[a] - INDEX[b]);
    update({ policy: { ...policy, allowedWeekdays: sorted } });
  };

  const handleMonthDaysChange = (
    e: SelectChangeEvent<unknown>,
    _child: ReactNode,
  ) => {
    const raw = e.target.value as string | string[];
    const selected = Array.isArray(raw) ? raw : raw.split(',');
    const nums = selected.map((v) => Number(v)).filter(Number.isFinite);
    const sorted = nums.slice().sort((a, b) => a - b);
    update({ policy: { ...policy, allowedMonthDays: sorted } });
  };

  const scheduledModeOptions = [
    { key: 'Daily', value: 'Daily' },
    { key: 'Weekday', value: 'Weekday(s)' },
    { key: 'Monthly', value: 'Monthly (specific dates)' },
  ] as const;

  return (
    <Box>
      <Divider />

      <Grid item sx={{ mt: '1.5rem' }}>
        <Typography variant="h2">Offline Payments</Typography>
      </Grid>

      {/* Enable Auto Pay */}
      <Grid item container alignItems="center" sx={{ mt: '1.5rem' }}>
        <Grid item xs={6}>
          <Typography variant="h6">Enable Auto Pay</Typography>
        </Grid>
        <Grid item xs={6} container justifyContent="flex-end">
          <Switch
            color="primary"
            checked={isAutoPayEnabled}
            onChange={handleEnableAutoPay}
            sx={{ width: 49, p: '12px 4px 12px 12px' }}
          />
        </Grid>
      </Grid>

      {/* Enable Scheduled Payments */}
      <Grid item container alignItems="center" sx={{ mt: '1.5rem' }}>
        <Grid item xs={6}>
          <Typography variant="h6">Enable Scheduled Payments</Typography>
        </Grid>
        <Grid item xs={6} container justifyContent="flex-end">
          <Switch
            color="primary"
            checked={isSchedulePaymentsEnabled}
            onChange={handleEnableScheduledPayments}
            sx={{ width: 49, p: '12px 4px 12px 12px' }}
          />
        </Grid>
      </Grid>

      {/* Scheduling Mode */}
      {isSchedulePaymentsEnabled && (
        <Grid item container alignItems="center" sx={{ mt: '1.5rem' }}>
          <Grid item xs={6}>
            <Typography variant="h6">Scheduling Mode</Typography>
          </Grid>
          <Grid item xs={6} container justifyContent="flex-end">
            <TextField
              select
              fullWidth
              sx={(muiTheme) => ({
                ...getCompactFilterFieldSx(muiTheme),
              })}
              value={policy.mode}
              onChange={handleModeChange}
              SelectProps={compactFilterSelectProps}
            >
              {scheduledModeOptions.map((opt) => (
                <MenuItem
                  key={opt.key}
                  value={opt.key}
                  sx={compactFilterMenuItemSx}
                >
                  <Typography variant="body2">{opt.value}</Typography>
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      )}

      {/* Weekday selection */}
      {isSchedulePaymentsEnabled && policy.mode === 'Weekday' && (
        <Grid item container alignItems="center" sx={{ mt: '1.5rem' }}>
          <Grid item xs={6}>
            <Typography variant="h6">Select Allowed Weekdays</Typography>
          </Grid>
          <Grid item xs={6} container justifyContent="flex-end">
            <TextField
              select
              fullWidth
              sx={(muiTheme) => ({
                ...getCompactFilterFieldSx(muiTheme),
              })}
              value={policy.allowedWeekdays}
              SelectProps={{
                IconComponent: KeyboardArrowDownIcon,
                multiple: true,
                onChange: handleWeekdaysChange,
                renderValue: (selected) => {
                  const set = new Set(selected as DayKey[]);
                  const order: DayKey[] = [
                    'sun',
                    'mon',
                    'tue',
                    'wed',
                    'thu',
                    'fri',
                    'sat',
                  ];
                  const ordered = order.filter((k) => set.has(k));
                  return (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
                      {ordered.map((k) => (
                        <Chip
                          key={k}
                          label={DAYS.find((d) => d.key === k)?.label ?? k}
                          size="small"
                        />
                      ))}
                    </Box>
                  );
                },
                MenuProps: {
                  PaperProps: {
                    sx: {
                      maxHeight: { xs: '75vh', md: 560 },
                      overflowY: 'auto',
                    },
                  },
                  anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                  transformOrigin: { vertical: 'top', horizontal: 'right' },
                  MenuListProps:
                    compactFilterSelectProps.MenuProps.MenuListProps,
                },
              }}
              error={weekdaysError}
              helperText={weekdaysError ? f('Required') : ''}
            >
              {DAYS.map((d) => (
                <MenuItem
                  key={d.key}
                  value={d.key}
                  dense
                  sx={compactFilterMenuItemSx}
                >
                  {d.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      )}

      {/* Monthly: choose specific days (1..31) */}
      {isSchedulePaymentsEnabled && policy.mode === 'Monthly' && (
        <Grid item container alignItems="center" sx={{ mt: '1.5rem' }}>
          <Grid item xs={6}>
            <Typography variant="h6">Select Allowed Month Days</Typography>
          </Grid>
          <Grid item xs={6} container justifyContent="flex-end">
            <TextField
              select
              fullWidth
              sx={(muiTheme) => ({
                ...getCompactFilterFieldSx(muiTheme),
              })}
              value={policy.allowedMonthDays}
              SelectProps={{
                IconComponent: KeyboardArrowDownIcon,
                multiple: true,
                onChange: handleMonthDaysChange,
                renderValue: (selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as number[])
                      .slice()
                      .sort((a, b) => a - b)
                      .map((v) => (
                        <Chip key={v} label={v} size="small" />
                      ))}
                  </Box>
                ),
                MenuProps: {
                  PaperProps: {
                    sx: {
                      maxHeight: { xs: '75vh', md: 560 },
                      overflowY: 'auto',
                    },
                  },
                  anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                  transformOrigin: { vertical: 'top', horizontal: 'right' },
                  MenuListProps:
                    compactFilterSelectProps.MenuProps.MenuListProps,
                },
              }}
              error={monthDaysError}
              helperText={monthDaysError ? f('Required') : ''}
            >
              {MONTH_DAYS.map((d) => (
                <MenuItem
                  key={d}
                  value={String(d)}
                  dense
                  sx={compactFilterMenuItemSx}
                >
                  {d}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
