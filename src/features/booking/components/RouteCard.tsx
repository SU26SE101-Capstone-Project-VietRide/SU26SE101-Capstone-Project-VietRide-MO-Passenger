import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

interface RouteCardProps {
  from: string;
  to: string;
  price: string;
  onPress?: () => void;
}

export const RouteCard = ({ from, to, price, onPress }: RouteCardProps): React.JSX.Element => {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.routeCard, pressed ? styles.pressed : null]}
    >
      <View style={styles.cardSheen} pointerEvents="none" />
      <View style={styles.cardRim} pointerEvents="none" />

      <View style={styles.routeVisual}>
        <View style={styles.routeGlow} />
        <View style={styles.routeLine}>
          <View style={styles.routeDot} />
          <View style={styles.routeTrack} />
          <View style={styles.routeDot} />
        </View>
        <View style={styles.routeBadge}>
          <Text style={styles.routeBadgeText}>Popular</Text>
        </View>
      </View>

      <View style={styles.routeInfo}>
        <Text style={styles.routeName}>
          {from}
          <Text style={styles.routeArrow}> to </Text>
          {to}
        </Text>
        <Text style={styles.routePrice}>{price}</Text>
      </View>
    </Pressable>
  );
};

const createStyles = (theme: AppTheme) => ({
  routeCard: {
    width: 150,
    position: 'relative',
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurface : theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  cardSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 58,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSheen : 'transparent',
  },
  cardRim: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: borderRadius.lg - 1,
    borderWidth: theme.effects.isLiquid ? 1 : 0,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : 'transparent',
  },
  routeVisual: {
    height: 96,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    backgroundColor: theme.colors.primaryFaded,
    justifyContent: 'space-between',
    padding: spacing.sm,
  },
  routeGlow: {
    position: 'absolute',
    top: -18,
    right: -28,
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassTint : 'transparent',
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  routeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassHighlight : theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
  },
  routeTrack: {
    flex: 1,
    height: 1,
    marginHorizontal: spacing.xs,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassHighlight : theme.colors.primaryLight,
  },
  routeBadge: {
    backgroundColor: theme.effects.glassOverlay,
    borderWidth: 1,
    borderColor: theme.effects.glassStroke,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  routeBadgeText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.primaryDark,
  },
  routeInfo: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  routeName: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
    marginBottom: spacing.xs,
  },
  routeArrow: {
    color: theme.colors.textSecondary,
  },
  routePrice: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
});
