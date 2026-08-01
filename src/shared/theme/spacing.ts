/**
 * VietRide Design System — Spacing & Border Radius Tokens
 *
 * Consistent spatial rhythm across the entire application.
 */

// ─── Spacing Scale ────────────────────────────────────────
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  massive: 64,
} as const;

// ─── Border Radius ────────────────────────────────────────
export const borderRadius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export type SpacingToken = keyof typeof spacing;
export type BorderRadiusToken = keyof typeof borderRadius;
