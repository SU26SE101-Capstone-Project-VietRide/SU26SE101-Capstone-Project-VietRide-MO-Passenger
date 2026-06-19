/**
 * VietRide Design System — Barrel Export
 *
 * Single import point for the entire design system:
 *   import { colors, fontSizes, spacing } from '@shared/theme';
 */

export { colors } from './colors';
export type { ColorToken } from './colors';

export {
  fontFamilies,
  fontSizes,
  lineHeights,
  letterSpacings,
  textStyles,
} from './typography';
export type { FontSize, FontFamily } from './typography';

export { spacing, borderRadius, shadows } from './spacing';
export type { SpacingToken, BorderRadiusToken, ShadowToken } from './spacing';

export * from './types';
export { themes } from './themes';
export * from './helpers';
