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
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import type { AppTheme } from '@shared/theme';

type ChipVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral';

interface StatusChipProps {
  label: string;
  variant?: ChipVariant;
  style?: ViewStyle;
}

const getVariantStyle = (theme: AppTheme, variant: ChipVariant): { bg: string; text: string } => {
  const styles: Record<ChipVariant, { bg: string; text: string }> = {
    success: { bg: theme.colors.successLight, text: theme.colors.success },
    error: { bg: theme.colors.errorLight, text: theme.colors.error },
    warning: { bg: theme.colors.warningLight, text: theme.colors.warning },
    info: { bg: theme.colors.infoLight, text: theme.colors.primary },
    neutral: {
      bg: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
      text: theme.colors.textSecondary,
    },
  };

  return styles[variant];
};

export const StatusChip = memo(function StatusChipComponent({
  label,
  variant = 'info',
  style,
}: StatusChipProps): React.JSX.Element {
  const theme = useTheme();
  const palette = getVariantStyle(theme, variant);
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
