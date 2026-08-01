/**
 * TripCard — Displays a single bus trip result
 *
 * Shows operator badge, price, departure/arrival times with progress bar,
 * bus type label, and seats left indicator.
 */

import React, { memo, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Bus, Van, Bed, Clock } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { formatVnd } from '@shared/utils/format';
import type { BusTrip } from '../types';

interface TripCardProps {
  trip: BusTrip;
  onPress: (trip: BusTrip) => void;
  isSelected?: boolean;
}

export const TripCard = memo(function TripCardComponent({
  trip,
  onPress,
  isSelected = false,
}: TripCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const seatsUrgent = trip.seatsLeft <= 5;
  const handlePress = useCallback(() => onPress(trip), [onPress, trip]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('booking.tripCard.accessibilityLabel', {
        operator: trip.operatorBadge,
        departure: trip.departureTime,
        arrival: trip.arrivalTime,
      })}
      accessibilityState={{ selected: isSelected }}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        isSelected ? styles.cardSelected : null,
        pressed ? styles.pressed : null,
      ]}
    >
      {/* Top row: badge + price */}
      <View style={styles.topRow}>
        <View style={styles.operatorBlock}>
          <View style={styles.badge}>
            <Text style={styles.badgeText} numberOfLines={1}>
              {trip.operatorBadge}
            </Text>
          </View>
          {trip.busLabel ? (
            <Text style={styles.busLabelText} numberOfLines={1}>
              {trip.busLabel}
            </Text>
          ) : null}
        </View>
        <View style={styles.priceBlock}>
          <Text style={styles.priceLabel}>{t('booking.tripCard.from')}</Text>
          <Text style={styles.price}>
            {formatVnd(trip.price, { clampNegative: true })}
          </Text>
        </View>
      </View>

      {/* Time row: departure → arrival with progress */}
      <View style={styles.timeRow}>
        {/* Departure */}
        <View style={styles.timeBlock}>
          <Text style={styles.timeText}>{trip.departureTime}</Text>
          <Text style={styles.stationText} numberOfLines={2}>
            {trip.departureStation}
          </Text>
        </View>

        {/* Route separator; this is not a live journey-progress indicator. */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack} />
          <View style={styles.busIconContainer}>
            <Bus size={16} weight="fill" color={theme.colors.primary} />
          </View>
        </View>

        {/* Arrival */}
        <View style={[styles.timeBlock, styles.timeBlockRight]}>
          <Text style={styles.timeText}>{trip.arrivalTime}</Text>
          <Text style={[styles.stationText, styles.stationTextRight]} numberOfLines={2}>
            {trip.arrivalStation}
          </Text>
        </View>
      </View>

      {/* Bottom row: bus type + duration + seats */}
      <View style={styles.bottomRow}>
        {trip.busType ? (
          <View style={styles.metaChip}>
            {trip.busType === 'sleeper' ? (
              <Bed size={15} weight="fill" color={theme.colors.primary} />
            ) : trip.busType === 'limousine' ? (
              <Van size={15} weight="fill" color={theme.colors.primary} />
            ) : (
              <Bus size={15} weight="fill" color={theme.colors.primary} />
            )}
            <Text style={styles.metaText}>
              {trip.busType === 'sleeper'
                ? t('booking.busType.sleeper')
                : trip.busType === 'limousine'
                  ? t('booking.busType.limousine')
                  : t('booking.busType.standard')}
            </Text>
          </View>
        ) : null}
        <View style={styles.metaChip}>
          <Clock size={15} weight="bold" color={theme.colors.textSecondary} />
          <Text style={styles.metaText}>
            {t('booking.tripCard.durationHours', { value: trip.durationHours })}
          </Text>
        </View>
        <View style={[styles.seatsLeftBadge, seatsUrgent && styles.seatsLeftUrgent]}>
          <Text style={[styles.seatsLeftText, seatsUrgent && styles.seatsLeftTextUrgent]}>
            {t('booking.tripCard.seatsLeft', { count: trip.seatsLeft })}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

const createStyles = (theme: AppTheme) => ({
  card: {
    ...theme.components.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryFaded,
    borderWidth: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  operatorBlock: {
    flex: 1,
    minWidth: 0,
  },
  badge: {
    backgroundColor: theme.colors.primaryFaded,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  badgeText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  busLabelText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    marginBottom: 1,
  },
  price: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.primary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  timeBlock: {
    flex: 1,
  },
  timeBlockRight: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xxl,
    color: theme.colors.textPrimary,
  },
  stationText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: fontSizes.sm * 1.45,
    marginTop: spacing.xs,
  },
  stationTextRight: {
    textAlign: 'right',
  },
  progressContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    height: 34,
    marginTop: 2,
    position: 'relative',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.divider,
    borderRadius: 2,
  },
  progressFill: {
    height: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  busIconContainer: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorderStrong : theme.colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    top: 2,
    ...theme.effects.cardShadow,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    paddingTop: spacing.md,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
  },
  metaText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
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
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
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
