export const DateRangeOption = {
  All: 'all',
  Today: '0',
  Yesterday: '1',
  Last7Days: '7',
  //LastWeek: '7',
  Last30Days: '30',
  //LastMonth: '30',
  Last365Days: '365',
  //LastYear: '365',
  Custom: '-1',
} as const;

export type DateRangeOptionType =
  (typeof DateRangeOption)[keyof typeof DateRangeOption];

export function getResourceIdForDateRangeOption(
  s: DateRangeOptionType | string,
): string {
  switch (s) {
    case DateRangeOption.All:
      return 'app.common.date_range.all';
    case DateRangeOption.Today:
      return 'app.common.date_range.today';
    case DateRangeOption.Yesterday:
      return 'app.common.date_range.yesterday';
    case DateRangeOption.Last7Days:
      return 'app.common.date_range.last_7_days';
    case DateRangeOption.Last30Days:
      return 'app.common.date_range.last_30_days';
    case DateRangeOption.Last365Days:
      return 'app.common.date_range.last_365_days';
    case DateRangeOption.Custom:
      return 'app.common.date_range.custom';
    //should never get here
    default:
      return '';
  }
}
