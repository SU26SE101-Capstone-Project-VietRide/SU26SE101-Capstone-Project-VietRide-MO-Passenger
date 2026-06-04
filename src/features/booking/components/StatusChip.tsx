/**
 * StatusChip — Small pill badge for status indicators
 *
 * DESIGN.md: "Status Chips — Small, playful pills using secondary
 * or tertiary colors with white bold text."
 *
 * Used for: Seats Left, On Time, Sold Out, CONFIRMED, etc.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';

type ChipVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral';

interface StatusChipProps {
  label: string;
  variant?: ChipVariant;
  style?: ViewStyle;
}

const variantStyles: Record<ChipVariant, { bg: string; text: string }> = {
  success: { bg: 'rgba(42,193,188,0.12)', text: colors.primary },
  error: { bg: 'rgba(255,77,77,0.12)', text: '#FF4B4B' },
  warning: { bg: 'rgba(235,195,0,0.15)', text: '#8A6D00' },
  info: { bg: 'rgba(42,193,188,0.12)', text: colors.primary },
  neutral: { bg: colors.surfaceAlt, text: colors.textSecondary },
};

export const StatusChip = memo(function StatusChip({
  label,
  variant = 'info',
  style,
}: StatusChipProps): React.JSX.Element {
  const palette = variantStyles[variant];
  return (
    <View style={[styles.chip, { backgroundColor: palette.bg }, style]}>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  chip: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    letterSpacing: 0.4,
  },
});
