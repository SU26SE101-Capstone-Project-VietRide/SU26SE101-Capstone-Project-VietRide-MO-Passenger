/**
 * TripCard — Displays a single bus trip result
 *
 * Shows operator badge, price, departure/arrival times with progress bar,
 * bus type label, and seats left indicator.
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Bus, Van, Bed } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import type { BusTrip } from '../types';

interface TripCardProps {
  trip: BusTrip;
  onPress: (trip: BusTrip) => void;
  isSelected?: boolean;
}

export function TripCard({ trip, onPress, isSelected = false }: TripCardProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const progress = 0.5; //Suy nghi lai cho nay
  const seatsUrgent = trip.seatsLeft <= 5;

  const formatPrice = (price: number) => {
    return `₫ ${Math.round(price / 1000)}K`;
  };

  return (
    <Pressable
      onPress={() => onPress(trip)}
      style={({ pressed }) => [
        styles.card,
        isSelected ? styles.cardSelected : null,
        pressed ? styles.pressed : null,
      ]}
    >
      {/* Top row: badge + price */}
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{trip.operatorBadge}</Text>
        </View>
        <Text style={styles.price}>{formatPrice(trip.price)}</Text>
      </View>

      {/* Time row: departure → arrival with progress */}
      <View style={styles.timeRow}>
        {/* Departure */}
        <View style={styles.timeBlock}>
          <Text style={styles.timeText}>{trip.departureTime}</Text>
          <Text style={styles.stationText}>{trip.departureStation}</Text>
        </View>

        {/* Bus icon separator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <View style={styles.busIconContainer}>
            <Bus size={16} weight="fill" color={theme.colors.primary} />
          </View>
        </View>

        {/* Arrival */}
        <View style={[styles.timeBlock, styles.timeBlockRight]}>
          <Text style={styles.timeText}>{trip.arrivalTime}</Text>
          <Text style={[styles.stationText, styles.stationTextRight]}>{trip.arrivalStation}</Text>
        </View>
      </View>

      {/* Bottom row: bus type + seats */}
      <View style={styles.bottomRow}>
        <View style={styles.busTypeContainer}>
          <View style={styles.busTypeIconWrapper}>
            {trip.busType === 'sleeper' ? (
              <Bed size={18} weight="fill" color={theme.colors.primary} />
            ) : trip.busType === 'limousine' ? (
              <Van size={18} weight="fill" color={theme.colors.primary} />
            ) : (
              <Bus size={18} weight="fill" color={theme.colors.primary} />
            )}
          </View>
          <View style={styles.busTypeLabelContainer}>
            <Text style={styles.busTypeText}>{trip.busLabel}</Text>
          </View>
        </View>
        <View style={[styles.seatsLeftBadge, seatsUrgent && styles.seatsLeftUrgent]}>
          <Text style={[styles.seatsLeftText, seatsUrgent && styles.seatsLeftTextUrgent]}>
            {trip.seatsLeft} Seats Left
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) => ({
  card: {
    ...theme.components.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    marginBottom: spacing.md,
  },
  cardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryFaded,
    borderWidth: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  badge: {
    backgroundColor: theme.colors.primaryFaded,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  badgeText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
  price: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.primary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  timeBlock: {
    flex: 1,
  },
  timeBlockRight: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: theme.colors.textPrimary,
  },
  stationText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  stationTextRight: {
    textAlign: 'right',
  },
  progressContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    height: 24,
    marginTop: 2,
    position: 'relative',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: theme.colors.divider,
    borderRadius: 2,
  },
  progressFill: {
    height: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  busIconContainer: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surface,
    borderWidth: theme.effects.isLiquid ? 1 : 0,
    borderColor: theme.effects.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    top: -2,
    ...theme.effects.cardShadow,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    paddingTop: spacing.lg,
  },
  busTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  busTypeIconWrapper: {
    marginRight: spacing.sm,
    width: 20,
    alignItems: 'center',
  },
  busTypeLabelContainer: {
    flex: 1,
  },
  busTypeText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  seatsLeftBadge: {
    backgroundColor: theme.colors.primaryFaded,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  seatsLeftUrgent: {
    backgroundColor: theme.colors.errorLight,
  },
  seatsLeftText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
  seatsLeftTextUrgent: {
    color: theme.colors.error,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
});
