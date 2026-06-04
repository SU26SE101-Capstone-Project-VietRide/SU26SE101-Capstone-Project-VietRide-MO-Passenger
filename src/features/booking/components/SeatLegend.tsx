import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';

interface SeatLegendProps {
  items?: { label: string; color: string; borderColor?: string }[];
}

const DEFAULT_ITEMS = [
  { label: 'Available', color: colors.surface, borderColor: colors.border },
  { label: 'Selected', color: colors.primary, borderColor: colors.primary },
  { label: 'Sold', color: colors.surfaceAlt, borderColor: colors.divider },
];

export const SeatLegend = ({ items = DEFAULT_ITEMS }: SeatLegendProps): React.JSX.Element => (
  <View style={styles.legend}>
    {items.map((item) => (
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

const styles = StyleSheet.create({
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
    color: colors.textSecondary,
  },
});
