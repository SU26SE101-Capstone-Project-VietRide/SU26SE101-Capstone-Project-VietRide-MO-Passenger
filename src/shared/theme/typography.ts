/**
 * VietRide Design System — Typography Tokens
 *
 * Uses Inter font family with responsive sizing via react-native-responsive-fontsize.
 * All text styles should reference these tokens instead of raw numbers.
 */

import { RFValue } from 'react-native-responsive-fontsize';
import { TextStyle } from 'react-native';

// ─── Font Families ────────────────────────────────────────
export const fontFamilies = {
  regular: 'BeVietnamPro-Regular',
  medium: 'BeVietnamPro-Medium',
  semiBold: 'BeVietnamPro-SemiBold',
  bold: 'BeVietnamPro-Bold',
} as const;

// ─── Font Sizes (responsive) ─────────────────────────────
export const fontSizes = {
  xs: RFValue(10),
  sm: RFValue(12),
  md: RFValue(14),
  lg: RFValue(16),
  xl: RFValue(18),
  xxl: RFValue(22),
  h3: RFValue(24),
  h2: RFValue(28),
  h1: RFValue(32),
} as const;

// ─── Line Heights ─────────────────────────────────────────
export const lineHeights = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const;

// ─── Letter Spacings ──────────────────────────────────────
export const letterSpacings = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1,
} as const;

// ─── Pre-composed Text Styles ─────────────────────────────
export const textStyles: Record<string, TextStyle> = {
  h1: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h1,
    lineHeight: fontSizes.h1 * lineHeights.tight,
    letterSpacing: letterSpacings.tight,
  },
  h2: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h2,
    lineHeight: fontSizes.h2 * lineHeights.tight,
    letterSpacing: letterSpacings.tight,
  },
  h3: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.h3,
    lineHeight: fontSizes.h3 * lineHeights.tight,
  },
  bodyLarge: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * lineHeights.normal,
  },
  bodyMedium: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.normal,
  },
  bodySmall: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * lineHeights.normal,
  },
  label: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * lineHeights.normal,
    letterSpacing: letterSpacings.wide,
  },
  caption: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * lineHeights.normal,
  },
  button: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.normal,
    letterSpacing: letterSpacings.wide,
  },
} as const;

export type FontSize = keyof typeof fontSizes;
export type FontFamily = keyof typeof fontFamilies;
