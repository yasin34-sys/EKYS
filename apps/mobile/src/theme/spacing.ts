// 8pt-based scale, generous by default — the single biggest lever for
// moving away from a cramped, "dev scaffold" feel.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const screenPadding = spacing.lg;
