/**
 * TripCard — Displays a single bus trip result
 *
 * Shows operator badge, price, departure/arrival times with progress bar,
 * bus type label, and seats left indicator.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bus, Van, Bed } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import type { BusTrip } from '../types';

interface TripCardProps {
  trip: BusTrip;
  onPress: (trip: BusTrip) => void;
  isSelected?: boolean;
}

export function TripCard({ trip, onPress, isSelected = false }: TripCardProps): React.JSX.Element {
  const progress = (trip.totalSeats - trip.seatsLeft) / trip.totalSeats;
  const seatsUrgent = trip.seatsLeft <= 5;

  const formatPrice = (price: number) => {
    return `₫ ${Math.round(price / 1000)}K`;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(trip)}
      style={[styles.card, isSelected && styles.cardSelected]}
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
            <Bus size={16} weight="fill" color={colors.primary} />
          </View>
        </View>

        {/* Arrival */}
        <View style={[styles.timeBlock, styles.timeBlockRight]}>
          <Text style={styles.timeText}>{trip.arrivalTime}</Text>
          <Text style={[styles.stationText, { textAlign: 'right' }]}>{trip.arrivalStation}</Text>
        </View>
      </View>

      {/* Bottom row: bus type + seats */}
      <View style={styles.bottomRow}>
        <View style={styles.busTypeContainer}>
          <View style={styles.busTypeIconWrapper}>
            {trip.busType === 'sleeper' ? (
              <Bed size={18} weight="fill" color={colors.primary} />
            ) : trip.busType === 'limousine' ? (
              <Van size={18} weight="fill" color={colors.primary} />
            ) : (
              <Bus size={18} weight="fill" color={colors.primary} />
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
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    ...shadows.md,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F4FBFB',
    borderWidth: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  badge: {
    backgroundColor: colors.primaryFaded,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  badgeText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.primary,
  },
  price: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.primary,
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
    color: colors.textPrimary,
  },
  stationText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  progressContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    marginTop: 6,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: colors.divider,
    borderRadius: 2,
    marginTop: 10,
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  busIconContainer: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    ...shadows.md,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
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
    color: colors.textPrimary,
  },
  seatsLeftBadge: {
    backgroundColor: colors.primaryFaded,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  seatsLeftUrgent: {
    backgroundColor: colors.errorLight,
  },
  seatsLeftText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.primary,
  },
  seatsLeftTextUrgent: {
    color: colors.error,
  },
});
