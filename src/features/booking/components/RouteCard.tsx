import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';

interface RouteCardProps {
  from: string;
  to: string;
  price: string;
}

export const RouteCard = ({ from, to, price }: RouteCardProps): React.JSX.Element => (
  <View style={styles.routeCard}>
    <View style={styles.routeGradient}>
      <View style={styles.routeBadge}>
        <Text style={styles.routeBadgeText}>🔥 Hot</Text>
      </View>
    </View>
    <View style={styles.routeInfo}>
      <Text style={styles.routeName}>
        {from}
        <Text style={styles.routeArrow}> → </Text>
        {to}
      </Text>
      <Text style={styles.routePrice}>{price}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  routeCard: {
    width: 150,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.md,
    overflow: 'hidden',
  },
  routeGradient: {
    height: 96,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'flex-end',
    padding: spacing.sm,
  },
  routeBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  routeBadgeText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: colors.textInverse,
  },
  routeInfo: {
    padding: spacing.lg,
  },
  routeName: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  routeArrow: {
    color: colors.textSecondary,
  },
  routePrice: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
});
