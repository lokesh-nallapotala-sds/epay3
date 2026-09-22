export const BREAKPOINT_VALUES = {
  xs: 0,
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1536,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINT_VALUES;

const DOWN_STEP = 0.05;

export const mediaDown = (key: Exclude<BreakpointKey, 'xs'>): string =>
  `@media (max-width:${BREAKPOINT_VALUES[key] - DOWN_STEP}px)`;

export const MEDIA_DOWN_SM = mediaDown('sm');
export const MEDIA_DOWN_MD = mediaDown('md');

export const MOBILE_BREAKPOINT = 810;
export const DESKTOP_BREAKPOINT = BREAKPOINT_VALUES.lg;
