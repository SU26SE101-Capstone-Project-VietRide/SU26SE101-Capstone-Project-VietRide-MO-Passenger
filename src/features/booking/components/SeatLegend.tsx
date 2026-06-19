import React from 'react';
import { View, Text } from 'react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

interface SeatLegendProps {
  items?: { label: string; color: string; borderColor?: string }[];
}

export const SeatLegend = ({ items }: SeatLegendProps): React.JSX.Element => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const legendItems = items ?? [
    {
      label: 'Available',
      color: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surface,
      borderColor: theme.effects.isLiquid ? theme.effects.glassBorderStrong : theme.colors.border,
    },
    { label: 'Selected', color: theme.colors.primary, borderColor: theme.colors.primary },
    {
      label: 'Sold',
      color: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
      borderColor: theme.colors.divider,
    },
  ];

  return (
    <View style={styles.legend}>
      {legendItems.map((item) => (
        <View key={item.label} style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: item.color, borderColor: item.borderColor ?? item.color },
            ]}
          />
          <Text style={styles.legendText}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
};

const createStyles = (theme: AppTheme) => ({
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xxl,
    marginBottom: spacing.xl,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.xs,
    borderWidth: 1.5,
  },
  legendText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
});
