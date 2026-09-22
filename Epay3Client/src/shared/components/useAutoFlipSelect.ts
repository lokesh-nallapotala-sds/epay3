import { useCallback, useMemo, useRef, useState } from 'react';
import type { SelectProps } from '@mui/material/Select';
import type { SxProps, Theme } from '@mui/material/styles';

const VIEWPORT_PADDING = 8;
const BOTTOM_DROPDOWN_GAP = 0;
const TOP_DROPDOWN_GAP = 1;
const MENU_MAX_HEIGHT = 320;
const MENU_ITEM_ESTIMATED_HEIGHT = 40;
const MENU_VERTICAL_PADDING = 16;

interface UseAutoFlipSelectOptions {
  optionCount: number;
  selectProps: Partial<SelectProps>;
  paperSx?: SxProps<Theme>;
}

export function useAutoFlipSelect({
  optionCount,
  selectProps,
  paperSx,
}: UseAutoFlipSelectOptions) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [menuPlacement, setMenuPlacement] = useState<'top' | 'bottom'>(
    'bottom',
  );

  const handleOpen = useCallback(() => {
    if (!fieldRef.current) {
      return;
    }

    const triggerRect = fieldRef.current.getBoundingClientRect();
    const estimatedMenuHeight = Math.min(
      MENU_MAX_HEIGHT,
      optionCount * MENU_ITEM_ESTIMATED_HEIGHT + MENU_VERTICAL_PADDING,
    );
    const availableAbove = Math.max(0, triggerRect.top - VIEWPORT_PADDING);
    const availableBelow = Math.max(
      0,
      window.innerHeight - triggerRect.bottom - VIEWPORT_PADDING,
    );

    if (
      availableBelow < estimatedMenuHeight + BOTTOM_DROPDOWN_GAP &&
      availableAbove > availableBelow
    ) {
      setMenuPlacement('top');
      return;
    }

    setMenuPlacement('bottom');
  }, [optionCount]);

  const resolveAnchorEl = useCallback(() => {
    // MUI's function-form anchorEl must not return null; fall back to an
    // empty rect for the (unreachable) unmounted case.
    const rect = fieldRef.current?.getBoundingClientRect() ?? new DOMRect();
    const gap =
      menuPlacement === 'top' ? TOP_DROPDOWN_GAP : BOTTOM_DROPDOWN_GAP;

    return {
      nodeType: 1 as const,
      getBoundingClientRect: () =>
        new DOMRect(
          rect.x,
          menuPlacement === 'top' ? rect.y - gap : rect.y,
          rect.width,
          rect.height + gap,
        ),
    };
  }, [menuPlacement]);

  const resolvedSelectProps = useMemo(() => {
    const anchorVertical: 'top' | 'bottom' =
      menuPlacement === 'top' ? 'top' : 'bottom';
    const transformVertical: 'top' | 'bottom' =
      menuPlacement === 'top' ? 'bottom' : 'top';
    const mergedPaperSx = [
      selectProps.MenuProps?.PaperProps?.sx,
      paperSx,
      {
        mt: menuPlacement === 'bottom' ? '2px' : 0,
        mb: menuPlacement === 'top' ? '4px' : 0,
      },
    ].filter(Boolean) as SxProps<Theme>;

    return {
      ...selectProps,
      onOpen: handleOpen,
      MenuProps: {
        ...selectProps.MenuProps,
        anchorEl: resolveAnchorEl,
        anchorOrigin: {
          vertical: anchorVertical,
          horizontal: 'left' as const,
        },
        transformOrigin: {
          vertical: transformVertical,
          horizontal: 'left' as const,
        },
        PaperProps: {
          ...selectProps.MenuProps?.PaperProps,
          sx: mergedPaperSx,
        },
      },
    } satisfies Partial<SelectProps>;
  }, [handleOpen, menuPlacement, paperSx, resolveAnchorEl, selectProps]);

  return {
    fieldRef,
    resolvedSelectProps,
  };
}
