import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

interface SeatLegendProps {
  items?: { label: string; color: string; borderColor?: string }[];
}

export const SeatLegend = ({ items }: SeatLegendProps): React.JSX.Element => {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const legendItems = items ?? [
    {
      label: t('booking.seats.available'),
      color: theme.effects.contentSurfaceElevated,
      borderColor: theme.effects.contentBorderStrong,
    },
    { label: t('booking.seats.selected'), color: theme.colors.primary, borderColor: theme.colors.primary },
    {
      label: t('booking.seats.sold'),
      color: theme.effects.contentSurfaceSoft,
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
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.md,
    backgroundColor: theme.effects.contentSurfaceSoft,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: theme.effects.contentBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: borderRadius.xs,
    borderWidth: 1.2,
  },
  legendText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
});
