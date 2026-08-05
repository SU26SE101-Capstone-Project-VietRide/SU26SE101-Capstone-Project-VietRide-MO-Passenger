import React, { memo } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '@shared/contexts/ThemeContext';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';

export type StatusChipTone = 'success' | 'error' | 'warning' | 'info' | 'neutral';

interface StatusChipProps {
  label: string;
  tone?: StatusChipTone;
  style?: ViewStyle;
}

const getPalette = (
  theme: AppTheme,
  tone: StatusChipTone,
): { backgroundColor: string; color: string } => {
  const palettes: Record<StatusChipTone, { backgroundColor: string; color: string }> = {
    success: { backgroundColor: theme.colors.successLight, color: theme.colors.success },
    error: { backgroundColor: theme.colors.errorLight, color: theme.colors.error },
    warning: { backgroundColor: theme.colors.warningLight, color: theme.colors.textPrimary },
    info: { backgroundColor: theme.colors.infoLight, color: theme.colors.primary },
    neutral: { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.textSecondary },
  };
  return palettes[tone];
};

export const StatusChip = memo(function StatusChip({
  label,
  tone = 'info',
  style,
}: StatusChipProps): React.JSX.Element {
  const theme = useTheme();
  const palette = getPalette(theme, tone);

  return (
    <View style={[styles.chip, { backgroundColor: palette.backgroundColor }, style]}>
      <Text style={[styles.label, { color: palette.color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  chip: {
    maxWidth: '100%',
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 1,
  },
  label: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
  },
});
