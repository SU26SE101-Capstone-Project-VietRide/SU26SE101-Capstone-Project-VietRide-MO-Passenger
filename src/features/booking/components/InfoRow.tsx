/**
 * InfoRow — label/value pair with optional divider
 *
 * Used inside SectionCard for contact info rows.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, fontFamilies, fontSizes, spacing } from '@shared/theme';

interface InfoRowProps {
  label: string;
  value: string;
  showDivider?: boolean;
  style?: ViewStyle;
}

export const InfoRow = memo(function InfoRow({
  label,
  value,
  showDivider = false,
  style,
}: InfoRowProps): React.JSX.Element {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {showDivider && <View style={styles.divider} />}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  value: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginTop: spacing.lg,
  },
});
