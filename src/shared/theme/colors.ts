/**
 * VietRide Design System — Color Tokens
 *
 * Implements the official BAEMIN-inspired VietRide brand identity:
 * - Vibrant Mint Green (#2AC1BC) as primary accent for CTAs
 * - Deep glass teal (#007A76) as primary brand shade
 * - Modern dark charcoal (#181C20) for typographic legibility
 * - Soft off-white surfaces (#F7F9FF) for bento layout depth
 */

export const colors = {
  // ─── Primary Brand Teal & Mint Green ────────────────────
  primary: '#007A76',
  primaryLight: '#33D3CD', // Vibrant Mint Green
  primaryDark: '#005653',
  primaryFaded: '#E7F8F7', // Solid fallback tint for legacy static styles

  // ─── Accent / Secondary ──────────────────────────────────
  accent: '#2AC1BC', // Vibrant Mint Green
  accentLight: '#80FFF8',
  accentDark: '#006A67',

  // ─── Neutrals / Bento Surfaces ─────────────────────────
  background: '#F4F8FA', // Liquid Glass light canvas background
  surface: '#FFFFFF', // Bento Card Pure White surface
  surfaceAlt: '#EEF7F7', // Surface container low
  surfaceElevated: '#FFFFFF',

  // ─── Typography (Charcoal hierarchy) ─────────────────────
  textPrimary: '#13211F', // Dark Charcoal
  textSecondary: '#435A57', // Secondary slate/grey
  textTertiary: '#70817F', // outline variant
  textInverse: '#FFFFFF',
  textDisabled: '#BBC9C8',

  // ─── Semantic Feedback ──────────────────────────────────
  success: '#2AC1BC', // Mint green success
  successLight: 'rgba(42, 193, 188, 0.12)',
  warning: '#EBC300', // sunny tertiary yellow
  warningForeground: '#795900', // Accessible amber text/icons on light warning surfaces
  warningLight: '#FFE177',
  error: '#BA1A1A', // Pop-out coral/red
  errorLight: '#FFDAD6',
  info: '#006A67',
  infoLight: '#F1F4F9',

  // ─── Borders & Dividers ─────────────────────────────────
  border: 'rgba(0, 106, 103, 0.18)',
  borderFocused: '#007A76',
  divider: 'rgba(0, 106, 103, 0.12)',

  // ─── Overlays ───────────────────────────────────────────
  overlay: 'rgba(19, 33, 31, 0.38)',
  overlayLight: 'rgba(19, 33, 31, 0.16)',

  // ─── Skeletons ──────────────────────────────────────────
  skeleton: '#EAF1F1',
  skeletonHighlight: '#F8FCFC',

  // ─── Transparent ────────────────────────────────────────
  transparent: 'transparent',
} as const;

export type ColorToken = keyof typeof colors;
