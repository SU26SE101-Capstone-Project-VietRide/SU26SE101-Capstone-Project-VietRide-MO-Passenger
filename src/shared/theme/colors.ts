/**
 * VietRide Design System — Color Tokens
 *
 * Implements the official BAEMIN-inspired VietRide brand identity:
 * - Vibrant Mint Green (#2AC1BC) as primary accent for CTAs
 * - Deep forest/ocean teal (#006A67) as primary brand shade
 * - Modern dark charcoal (#181C20) for typographic legibility
 * - Soft off-white surfaces (#F7F9FF) for bento layout depth
 */

export const colors = {
  // ─── Primary Brand Teal & Mint Green ────────────────────
  primary: '#006A67',
  primaryLight: '#2AC1BC', // Vibrant Mint Green
  primaryDark: '#004A48',
  primaryFaded: '#EAF8F7', // Mint green faded tint (solid color to prevent Android elevation bugs)

  // ─── Accent / Secondary ──────────────────────────────────
  accent: '#2AC1BC', // Vibrant Mint Green
  accentLight: '#71F7F1',
  accentDark: '#00504d',

  // ─── Neutrals / Bento Surfaces ─────────────────────────
  background: '#F7F9FF', // Off-white canvas background
  surface: '#FFFFFF', // Bento Card Pure White surface
  surfaceAlt: '#F1F4F9', // Surface container low
  surfaceElevated: '#FFFFFF',

  // ─── Typography (Charcoal hierarchy) ─────────────────────
  textPrimary: '#181C20', // Dark Charcoal
  textSecondary: '#3C4948', // Secondary slate/grey
  textTertiary: '#6C7A78', // outline variant
  textInverse: '#FFFFFF',
  textDisabled: '#BBC9C8',

  // ─── Semantic Feedback ──────────────────────────────────
  success: '#2AC1BC', // Mint green success
  successLight: 'rgba(42, 193, 188, 0.12)',
  warning: '#EBC300', // sunny tertiary yellow
  warningLight: '#FFE177',
  error: '#BA1A1A', // Pop-out coral/red
  errorLight: '#FFDAD6',
  info: '#006A67',
  infoLight: '#F1F4F9',

  // ─── Borders & Dividers ─────────────────────────────────
  border: '#BBC9C8',
  borderFocused: '#006A67',
  divider: '#E5E8EE',

  // ─── Overlays ───────────────────────────────────────────
  overlay: 'rgba(24, 28, 32, 0.54)',
  overlayLight: 'rgba(24, 28, 32, 0.25)',

  // ─── Skeletons ──────────────────────────────────────────
  skeleton: '#EBEBF3',
  skeletonHighlight: '#E0E3E8',

  // ─── Transparent ────────────────────────────────────────
  transparent: 'transparent',
} as const;

export type ColorToken = keyof typeof colors;
