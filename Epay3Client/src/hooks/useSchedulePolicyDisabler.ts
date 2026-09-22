// useSchedulePolicyDisabler.ts
import { useMemo } from 'react';
import type { Dayjs } from 'dayjs';
import { ScheduledPaymentPolicy, DayKey } from 'types/ScheduledPaymentPolicy';

const DAY_KEYS: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function useSchedulePolicyDisabler(
  enabled: boolean,
  policy?: ScheduledPaymentPolicy,
) {
  const wkSet = useMemo(
    () => new Set(policy?.allowedWeekdays ?? []),
    [policy?.allowedWeekdays],
  );
  const mdSet = useMemo(
    () => new Set(policy?.allowedMonthDays ?? []),
    [policy?.allowedMonthDays],
  );

  const shouldDisableDate = useMemo(() => {
    if (!enabled) return () => false;

    switch (policy?.mode) {
      case 'Daily':
        return () => false;

      case 'Weekday':
        return (d: Dayjs) => {
          const key = DAY_KEYS[d.day()]; // 0..6 => sun..sat
          return !wkSet.has(key);
        };

      case 'Monthly':
        return (d: Dayjs) => !mdSet.has(d.date());

      default:
        return () => false;
    }
  }, [enabled, policy?.mode, wkSet, mdSet]);

  /** Find the next allowed date from a starting point (inclusive). */
  const findNextAllowedDate = (
    from: Dayjs,
    direction: 1 | -1 = 1,
    limit = 365,
  ) => {
    let d = from;
    for (let i = 0; i < limit; i++) {
      if (!shouldDisableDate(d)) return d;
      d = d.add(direction, 'day');
    }
    return null;
  };

  return { shouldDisableDate, findNextAllowedDate };
}
