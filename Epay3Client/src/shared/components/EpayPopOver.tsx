import {
  ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  CSSProperties,
  MouseEvent,
  MutableRefObject,
} from 'react';

import { Box } from '@mui/system';
import { styled } from '@mui/material/styles';

interface EpayPopoverProps {
  onClickOutSide?: () => void;
  componentRef?: MutableRefObject<HTMLElement | null>;
  children: ReactNode;
  childrenLocation?: 'top' | 'bottom' | 'auto';
  id?: string;
}

const VIEWPORT_PADDING = 8;
const BOTTOM_DROPDOWN_GAP = 1;
const TOP_DROPDOWN_GAP = 1;
const MIN_DROPDOWN_HEIGHT = 96;

const PopoverBase = styled('aside')(() => ({
  position: 'fixed',
  inset: 0,
  zIndex: 1400,
  transform: 'translateZ(0)',
  backgroundColor: 'transparent',
}));

export default function EpayPopOver({
  id,
  onClickOutSide,
  componentRef,
  children,
  childrenLocation = 'auto',
}: EpayPopoverProps) {
  const [sx, setSx] = useState<CSSProperties>({
    visibility: 'hidden',
    position: 'fixed',
  });

  if (!id) {
    id = `epaypopover-${Math.random()}`;
  }

  const boxRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const updatePosition = () => {
      if (!componentRef?.current || !boxRef.current) {
        return;
      }

      const triggerRect = componentRef.current.getBoundingClientRect();
      const popoverRect = boxRef.current.getBoundingClientRect();
      const popoverHeight = popoverRect.height;
      const popoverWidth = popoverRect.width;
      const availableAbove = Math.max(0, triggerRect.top - VIEWPORT_PADDING);
      const availableBelow = Math.max(
        0,
        window.innerHeight - triggerRect.bottom - VIEWPORT_PADDING,
      );

      const shouldOpenTop =
        childrenLocation === 'top' ||
        (childrenLocation === 'auto' &&
          availableBelow < popoverHeight + BOTTOM_DROPDOWN_GAP &&
          availableAbove > availableBelow);

      const availableHeight = shouldOpenTop ? availableAbove : availableBelow;
      const maxHeight = Math.max(MIN_DROPDOWN_HEIGHT, availableHeight);
      const clampedLeft = Math.min(
        Math.max(VIEWPORT_PADDING, triggerRect.left),
        Math.max(
          VIEWPORT_PADDING,
          window.innerWidth - popoverWidth - VIEWPORT_PADDING,
        ),
      );

      const top = shouldOpenTop
        ? Math.max(
            VIEWPORT_PADDING,
            triggerRect.top -
              Math.min(popoverHeight, maxHeight) -
              TOP_DROPDOWN_GAP,
          )
        : Math.min(
            triggerRect.bottom + BOTTOM_DROPDOWN_GAP,
            window.innerHeight -
              VIEWPORT_PADDING -
              Math.min(popoverHeight, maxHeight),
          );

      setSx({
        position: 'fixed',
        top,
        left: clampedLeft,
        width: 'fit-content',
        maxHeight,
        overflowY: 'auto',
        visibility: 'visible',
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [childrenLocation, componentRef]);

  const handleOnClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target?.id && target.id === id && onClickOutSide) {
      onClickOutSide();
    }
  };

  return (
    <PopoverBase onClick={handleOnClick} id={id}>
      <Box sx={sx} ref={boxRef}>
        {children}
      </Box>
    </PopoverBase>
  );
}
