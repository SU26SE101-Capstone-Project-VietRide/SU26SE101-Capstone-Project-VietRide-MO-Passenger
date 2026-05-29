/**
 * VietRide Design System — Color Tokens
 *
 * A modern, calm, minimalist palette centered around deep teal/ocean blue
 * with warm amber accents. All colors are semantic and purpose-driven.
 */

export const colors = {
  // ─── Primary ────────────────────────────────────────────
  primary: '#0A7EA4',
  primaryLight: '#38B2D8',
  primaryDark: '#065A76',
  primaryFaded: 'rgba(10, 126, 164, 0.08)',

  // ─── Accent ─────────────────────────────────────────────
  accent: '#F5A623',
  accentLight: '#FFD07B',
  accentDark: '#D4860A',

  // ─── Neutrals / Surfaces ────────────────────────────────
  background: '#F8FAFB',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F4F8',
  surfaceElevated: '#FFFFFF',

  // ─── Text ───────────────────────────────────────────────
  textPrimary: '#1A2138',
  textSecondary: '#5E6C84',
  textTertiary: '#97A0AF',
  textInverse: '#FFFFFF',
  textDisabled: '#C1C7D0',

  // ─── Semantic / Feedback ────────────────────────────────
  success: '#36B37E',
  successLight: '#E3FCEF',
  warning: '#FFAB00',
  warningLight: '#FFFAE6',
  error: '#FF5630',
  errorLight: '#FFEBE6',
  info: '#0065FF',
  infoLight: '#DEEBFF',

  // ─── Borders & Dividers ─────────────────────────────────
  border: '#DFE1E6',
  borderFocused: '#0A7EA4',
  divider: '#EBECF0',

  // ─── Overlay ────────────────────────────────────────────
  overlay: 'rgba(9, 30, 66, 0.54)',
  overlayLight: 'rgba(9, 30, 66, 0.25)',

  // ─── Skeleton / Placeholder ─────────────────────────────
  skeleton: '#F0F4F8',
  skeletonHighlight: '#E4E9F0',

  // ─── Transparent ────────────────────────────────────────
  transparent: 'transparent',
} as const;

export type ColorToken = keyof typeof colors;
