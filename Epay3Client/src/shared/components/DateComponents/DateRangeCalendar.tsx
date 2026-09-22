import { useState } from 'react';
import type { ComponentType } from 'react';

import type { Locale } from 'date-fns';
import {
  endOfWeek,
  isAfter,
  isBefore,
  isFirstDayOfMonth,
  isLastDayOfMonth,
  isSameDay,
  startOfWeek,
} from 'date-fns';

import { Box } from '@mui/system';
import { styled } from '@mui/material/styles';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
// The AdapterDateFnsV3 module targets the installed date-fns v3 (the plain
// AdapterDateFns module targets date-fns v2).
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers/PickersDay';

export interface DateRangeValue {
  startDate: Date;
  endDate: Date;
}

export type RangeFocusTarget = 'start' | 'end';

interface DateRangeCalendarProps {
  start: Date | null;
  end: Date | null;
  focusTarget: RangeFocusTarget;
  referenceDate: Date;
  locale: Locale;
  onDayClick: (day: Date) => void;
}

type BandType = 'fill' | 'preview';

// 'day': cap at a range endpoint — inset to hug the day circle.
// 'edge': cap at a week-row/month boundary — flush with the cell edge.
type BandCap = 'day' | 'edge';

interface RangeDayFlags {
  band?: BandType;
  capLeft?: BandCap;
  capRight?: BandCap;
}

interface DateRangeDayProps extends PickersDayProps<Date> {
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  hoveredDay?: Date | null;
  focusTarget?: RangeFocusTarget;
  onDayHover?: (day: Date) => void;
  dayLocale?: Locale;
}

// Half of the 36px PickersDay circle, so band caps hug the day circles.
const BAND_RADIUS = 18;
// The day button's horizontal margin inside its wrapper cell; endpoint caps
// inset by this so they meet the circle instead of the cell edge.
const DAY_MARGIN = 2;

const RANGE_DAY_FLAGS: (keyof RangeDayFlags)[] = [
  'band',
  'capLeft',
  'capRight',
];

// Pin the generic day component to Date; the app also loads the Dayjs adapter
// elsewhere, so the un-pinned generic widens to Date | Dayjs and fails to
// accept Date-typed handler props.
const DatePickersDay = PickersDay as ComponentType<PickersDayProps<Date>>;

// The band lives on a wrapper around the day button (the structure MUI X Pro
// uses): an in-flow layer paints above the popup paper background and below
// the button's selected circle, which no pseudo-element z-index arrangement
// on the button itself can achieve. The wrapper spans the button plus its
// 2px side margins, so adjacent cells' bands join seamlessly.
const RangeDayRoot = styled('div', {
  shouldForwardProp: (prop) =>
    !RANGE_DAY_FLAGS.includes(prop as keyof RangeDayFlags),
})<RangeDayFlags>(({ theme, band, capLeft, capRight }) => ({
  display: 'flex',
  position: 'relative',
  ...(band && {
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: capLeft === 'day' ? DAY_MARGIN : 0,
      right: capRight === 'day' ? DAY_MARGIN : 0,
      pointerEvents: 'none',
      boxSizing: 'border-box',
      ...(capLeft && {
        borderTopLeftRadius: BAND_RADIUS,
        borderBottomLeftRadius: BAND_RADIUS,
      }),
      ...(capRight && {
        borderTopRightRadius: BAND_RADIUS,
        borderBottomRightRadius: BAND_RADIUS,
      }),
      ...(band === 'fill'
        ? {
            backgroundColor:
              theme.calendarHoverColor || theme.palette.highlight.main,
          }
        : {
            // MUI DateRangePicker previews the hovered interval with a
            // dashed outline; the solid fill appears only once committed.
            border: `2px dashed ${theme.palette.primary.borderColor}`,
            borderLeftWidth: capLeft ? 2 : 0,
            borderRightWidth: capRight ? 2 : 0,
          }),
    },
  }),
}));

const DateRangeDay = (props: DateRangeDayProps) => {
  const {
    rangeStart = null,
    rangeEnd = null,
    hoveredDay = null,
    focusTarget = 'start',
    onDayHover,
    dayLocale,
    ...pickersDayProps
  } = props;
  const { day, outsideCurrentMonth, disabled } = pickersDayProps;

  const isStart = !!rangeStart && isSameDay(day, rangeStart);
  const isEnd = !!rangeEnd && isSameDay(day, rangeEnd);

  const previewEnd =
    focusTarget === 'end' &&
    rangeStart &&
    !rangeEnd &&
    hoveredDay &&
    !isBefore(hoveredDay, rangeStart)
      ? hoveredDay
      : null;
  const bandEnd = rangeEnd ?? previewEnd;

  const inBand =
    !outsideCurrentMonth &&
    !!rangeStart &&
    !!bandEnd &&
    !isBefore(day, rangeStart) &&
    !isAfter(day, bandEnd) &&
    !isSameDay(rangeStart, bandEnd);
  const band: BandType | undefined = inBand
    ? rangeEnd
      ? 'fill'
      : 'preview'
    : undefined;

  const isRowStart =
    isSameDay(day, startOfWeek(day, { locale: dayLocale })) ||
    isFirstDayOfMonth(day);
  const isRowEnd =
    isSameDay(day, endOfWeek(day, { locale: dayLocale })) ||
    isLastDayOfMonth(day);

  const capLeft: BandCap | undefined = inBand
    ? isSameDay(day, rangeStart as Date)
      ? 'day'
      : isRowStart
        ? 'edge'
        : undefined
    : undefined;
  const capRight: BandCap | undefined = inBand
    ? isSameDay(day, bandEnd as Date)
      ? 'day'
      : isRowEnd
        ? 'edge'
        : undefined
    : undefined;

  return (
    <RangeDayRoot band={band} capLeft={capLeft} capRight={capRight}>
      <DatePickersDay
        {...pickersDayProps}
        selected={isStart || isEnd}
        onMouseEnter={() => {
          if (!disabled && !outsideCurrentMonth) {
            onDayHover?.(day);
          }
        }}
      />
    </RangeDayRoot>
  );
};

const DateRangeCalendar = ({
  start,
  end,
  focusTarget,
  referenceDate,
  locale,
  onDayClick,
}: DateRangeCalendarProps) => {
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={locale}>
      <Box onMouseLeave={() => setHoveredDay(null)}>
        <DateCalendar<Date>
          value={null}
          referenceDate={referenceDate}
          onChange={(day, _selectionState, selectedView) => {
            // Year-view picks also fire onChange; only day-view picks select.
            if (day && selectedView === 'day') {
              onDayClick(day);
            }
          }}
          disableFuture
          showDaysOutsideCurrentMonth={false}
          slots={{ day: DateRangeDay, switchViewIcon: KeyboardArrowDownIcon }}
          slotProps={{
            day: {
              rangeStart: start,
              rangeEnd: end,
              hoveredDay,
              focusTarget,
              onDayHover: setHoveredDay,
              dayLocale: locale,
            } as Partial<DateRangeDayProps>,
          }}
        />
      </Box>
    </LocalizationProvider>
  );
};

export default DateRangeCalendar;
