/**
 * TripSummaryRow — Single key/value row with optional divider, used inside
 * the Trip Summary card on the Payment screen.
 */

import React, { memo } from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

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
  const styles = useThemedStyles(createStyles);

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
      {showDivider ? <View style={styles.divider} /> : null}
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: theme.colors.textSecondary,
  },
  labelTotal: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: theme.colors.textPrimary,
  },
  value: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  valueTotal: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h3,
    color: theme.colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: spacing.lg,
  },
});
