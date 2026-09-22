import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

import { endOfDay, isBefore, startOfDay } from 'date-fns';

import { Popover, useMediaQuery, useTheme } from '@mui/material';

import { getDateRangePickerLocale } from 'constants/languages';
import { useAppSelector } from 'redux/hooks';
import { regionalFormatSelector } from 'redux/reducers';

import DateRangeCalendar, {
  DateRangeValue,
  RangeFocusTarget,
} from './DateRangeCalendar';

interface DateRangePopupProps {
  open: boolean;
  onClose: () => void;
  onSelect: (range: DateRangeValue) => void;
  /** Fires when a start date is picked (or re-picked), before the end date
   *  is chosen — lets the anchor field show the partial range live. */
  onDraftStartChange?: (start: Date) => void;
  resetRange: boolean;
  anchorRef?: RefObject<HTMLElement | null>;
  selectedRange?: {
    startDate?: Date | null;
    endDate?: Date | null;
  };
}

const DateRangePopup = ({
  open,
  onClose,
  onSelect,
  onDraftStartChange,
  resetRange,
  anchorRef,
  selectedRange,
}: DateRangePopupProps) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const regionalFormat = useAppSelector(regionalFormatSelector);
  const calendarLocale = getDateRangePickerLocale(regionalFormat);
  const calendarBorderColor = theme.palette.primary.borderColor;

  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);
  const [focusTarget, setFocusTarget] = useState<RangeFocusTarget>('start');

  const resetSelection = () => {
    setDraftStart(null);
    setDraftEnd(null);
    setFocusTarget('start');
  };

  useEffect(() => {
    resetSelection();
  }, [resetRange]);

  useEffect(() => {
    if (open) {
      const start = selectedRange?.startDate ?? null;
      const end = selectedRange?.endDate ?? null;
      const hasSelectedRange = !!start && !!end;
      setDraftStart(hasSelectedRange ? start : null);
      setDraftEnd(hasSelectedRange ? end : null);
      setFocusTarget('start');
    }
  }, [open]);

  const handleCancel = () => {
    resetSelection();
    onClose();
  };

  const handleDayClick = (day: Date) => {
    if (focusTarget === 'start' || !draftStart) {
      setDraftStart(day);
      setDraftEnd(null);
      setFocusTarget('end');
      onDraftStartChange?.(day);
      return;
    }

    if (isBefore(startOfDay(day), startOfDay(draftStart))) {
      setDraftStart(day);
      setDraftEnd(null);
      onDraftStartChange?.(day);
      return;
    }

    onSelect({
      startDate: startOfDay(draftStart),
      endDate: endOfDay(day),
    });
    handleCancel();
  };

  const referenceDate =
    selectedRange?.startDate ?? selectedRange?.endDate ?? new Date();

  return (
    <Popover
      open={open && (isSmallScreen || !!anchorRef?.current)}
      // On small screens the anchor field is hidden, so center the picker
      // like MUI's mobile date picker dialog.
      anchorReference={isSmallScreen ? 'anchorPosition' : 'anchorEl'}
      anchorEl={isSmallScreen ? undefined : (anchorRef?.current ?? undefined)}
      anchorPosition={
        isSmallScreen
          ? { top: window.innerHeight / 2, left: window.innerWidth / 2 }
          : undefined
      }
      onClose={handleCancel}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={
        isSmallScreen
          ? { vertical: 'center', horizontal: 'center' }
          : { vertical: 'top', horizontal: 'left' }
      }
      disableScrollLock
      slotProps={{
        paper: {
          sx: {
            mt: 0,
            p: 0,
            bgcolor: 'background.paper',
            border: `1px solid ${calendarBorderColor}`,
            borderRadius: '10px',
            boxShadow: 'none',
            maxWidth: 'calc(100vw - 32px)',
          },
        },
      }}
    >
      <DateRangeCalendar
        start={draftStart}
        end={draftEnd}
        focusTarget={focusTarget}
        referenceDate={referenceDate}
        locale={calendarLocale}
        onDayClick={handleDayClick}
      />
    </Popover>
  );
};

export default DateRangePopup;
