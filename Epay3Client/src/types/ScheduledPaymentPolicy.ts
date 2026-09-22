export type DayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
export type ScheduleMode = 'None' | 'Daily' | 'Weekday' | 'Monthly';

export interface ScheduledPaymentPolicy {
  mode: ScheduleMode;
  allowedWeekdays: DayKey[];
  allowedMonthDays: number[];
}

export interface ServerScheduledPaymentPolicy {
  mode: ScheduleMode;
  allowedWeekdays: DayKey[] | null;
  allowedMonthDays: number[] | null;
}

export const EMPTY_POLICY: ScheduledPaymentPolicy = {
  mode: 'None',
  allowedWeekdays: [],
  allowedMonthDays: [],
};

export const ORDER: DayKey[] = [
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
];
export const INDEX: Record<DayKey, number> = ORDER.reduce(
  (acc, k, i) => ((acc[k] = i), acc),
  {} as Record<DayKey, number>,
);

export const DAYS: { key: DayKey; label: string }[] = [
  { key: 'sun', label: 'Sunday' },
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
];

export const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

// client -> server (null out arrays that don't apply)
export const toServerPolicy = (
  p?: ScheduledPaymentPolicy,
): ServerScheduledPaymentPolicy => ({
  mode: p?.mode ?? 'None',
  allowedWeekdays: p && p.mode === 'Weekday' ? (p.allowedWeekdays ?? []) : null,
  allowedMonthDays:
    p && p.mode === 'Monthly' ? (p.allowedMonthDays ?? []) : null,
});

// server -> client (normalize nulls to [])
export const fromServerPolicy = (
  sp?: Partial<ServerScheduledPaymentPolicy> | null,
): ScheduledPaymentPolicy => ({
  mode: sp?.mode ?? 'None',
  allowedWeekdays: sp?.allowedWeekdays ?? [],
  allowedMonthDays: sp?.allowedMonthDays ?? [],
});
