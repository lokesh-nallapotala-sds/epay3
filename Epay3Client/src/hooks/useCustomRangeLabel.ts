import type { Dispatch, SetStateAction } from 'react';

import {
  DateRangeOption,
  getResourceIdForDateRangeOption,
} from 'types/DateRangeOption';
import { toFormattedDateString } from 'utilities/utilities';

interface PeriodOption {
  key: string;
  value: string;
}

interface UseCustomRangeLabelParams {
  setPeriodOptions: Dispatch<SetStateAction<PeriodOption[]>>;
  regionalFormat: Parameters<typeof toFormattedDateString>[1];
  f: (id: string) => string;
}

/**
 * Keeps the Date filter's "Custom Range" option label in sync with the date
 * range popup: partial "start - " text while picking, the full formatted
 * range once committed, and the default label when nothing is selected.
 */
export function useCustomRangeLabel({
  setPeriodOptions,
  regionalFormat,
  f,
}: UseCustomRangeLabelParams) {
  const setCustomPeriodLabel = (label: string) =>
    setPeriodOptions((prevOptions) =>
      prevOptions.map((option) =>
        option.key === DateRangeOption.Custom
          ? { ...option, value: label }
          : option,
      ),
    );

  const handleDateDraftStartChange = (start: Date) => {
    setCustomPeriodLabel(`${toFormattedDateString(start, regionalFormat)} - `);
  };

  const setCommittedRangeLabel = (startDate: Date, endDate: Date) => {
    setCustomPeriodLabel(
      `${toFormattedDateString(startDate, regionalFormat)} - ${toFormattedDateString(endDate, regionalFormat)}`,
    );
  };

  const restoreCustomPeriodLabel = (range: {
    startDate: Date | null;
    endDate: Date | null;
  }) => {
    if (range.startDate && range.endDate) {
      setCommittedRangeLabel(range.startDate, range.endDate);
    } else {
      setCustomPeriodLabel(
        f(getResourceIdForDateRangeOption(DateRangeOption.Custom)),
      );
    }
  };

  return {
    handleDateDraftStartChange,
    setCommittedRangeLabel,
    restoreCustomPeriodLabel,
  };
}
