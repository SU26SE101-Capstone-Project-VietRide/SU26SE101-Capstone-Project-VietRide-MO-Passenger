/**
 * TripSummaryRow — Single key/value row with optional divider, used inside
 * the Trip Summary card on the Payment screen.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, fontFamilies, fontSizes, spacing } from '@shared/theme';

interface TripSummaryRowProps {
  label: string;
  value: string;
  isTotal?: boolean;
  showDivider?: boolean;
  style?: ViewStyle;
}

export const TripSummaryRow = memo(function TripSummaryRow({
  label,
  value,
  isTotal = false,
  showDivider = false,
  style,
}: TripSummaryRowProps): React.JSX.Element {
  return (
    <View style={[styles.wrap, style]}>
      <Text
        style={[styles.label, isTotal && styles.labelTotal]}
      >
        {label}
      </Text>
      <Text
        style={[styles.value, isTotal && styles.valueTotal]}
      >
        {value}
      </Text>
      {showDivider && <View style={styles.divider} />}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  labelTotal: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.textPrimary,
  },
  value: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  valueTotal: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h3,
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.lg,
  },
});
