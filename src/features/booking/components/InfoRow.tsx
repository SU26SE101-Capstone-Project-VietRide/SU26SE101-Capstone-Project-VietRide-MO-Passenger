/**
 * InfoRow — label/value pair with optional divider
 *
 * Used inside SectionCard for contact info rows.
 */

import React, { memo } from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

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
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {showDivider ? <View style={styles.divider} /> : null}
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  wrap: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    marginBottom: spacing.xs,
  },
  value: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
    lineHeight: fontSizes.sm * 1.45,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginTop: spacing.lg,
  },
});
