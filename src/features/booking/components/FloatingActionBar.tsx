/**
 * FloatingActionBar — Sticky bottom bar for transactional flows
 *
 * Shows selected seats summary, total price, and a CTA button.
 * Reused across Seat Selection, Checkout, and Payment screens.
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { formatVnd } from '@shared/utils/format';
import type { SeatBadgeItem } from '../utils/seatPresentation';

const MAX_VISIBLE_SEAT_BADGES = 4;

interface FloatingActionBarProps {
  seatBadges: readonly SeatBadgeItem[];
  totalPrice: number;
  ctaLabel: string;
  onPress: () => void;
  disabled?: boolean;
}

export function FloatingActionBar({
  seatBadges,
  totalPrice,
  ctaLabel,
  onPress,
  disabled = false,
}: FloatingActionBarProps): React.JSX.Element {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const visibleSeatBadges = seatBadges.slice(0, MAX_VISIBLE_SEAT_BADGES);
  const hiddenSeatCount = seatBadges.length - visibleSeatBadges.length;

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, spacing.lg) },
      ]}
    >
      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={styles.seatsInfo}>
          <Text style={styles.seatsLabel}>{t('booking.seats.selected')}</Text>
          <View style={styles.seatBadges}>
            {visibleSeatBadges.map((seat) => (
              <View key={seat.key} style={styles.seatBadge}>
                <Text style={styles.seatBadgeText}>{seat.label}</Text>
              </View>
            ))}
            {hiddenSeatCount > 0 ? (
              <View style={styles.seatBadge}>
                <Text style={styles.seatBadgeText}>+{hiddenSeatCount}</Text>
              </View>
            ) : null}
            {seatBadges.length === 0 ? (
              <Text style={styles.noSeatsText}>{t('common.none')}</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.priceInfo}>
          <Text style={styles.priceLabel}>{t('booking.totalPrice')}</Text>
          <Text style={styles.priceValue}>
            {formatVnd(totalPrice, { clampNegative: true })}
          </Text>
        </View>
      </View>

      {/* CTA Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
        accessibilityState={{ disabled: disabled || seatBadges.length === 0 }}
        onPress={onPress}
        disabled={disabled || seatBadges.length === 0}
        style={({ pressed }) => [
          styles.ctaButton,
          (disabled || seatBadges.length === 0) && styles.ctaDisabled,
          pressed && !(disabled || seatBadges.length === 0) ? styles.ctaPressed : null,
        ]}
      >
        <Text style={styles.ctaText}>{ctaLabel}</Text>
        <Text style={styles.ctaArrow}>→</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: {
    ...theme.components.actionBar,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  seatsInfo: {
    flex: 1,
    minWidth: 0,
  },
  seatsLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginBottom: spacing.xs,
  },
  seatBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  seatBadge: {
    backgroundColor: theme.colors.primaryFaded,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  seatBadgeText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  noSeatsText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginBottom: spacing.xs,
  },
  priceValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.primary,
  },
  ctaButton: {
    ...theme.components.primaryButton,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  ctaText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textInverse,
    marginRight: spacing.sm,
  },
  ctaArrow: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textInverse,
  },
});
