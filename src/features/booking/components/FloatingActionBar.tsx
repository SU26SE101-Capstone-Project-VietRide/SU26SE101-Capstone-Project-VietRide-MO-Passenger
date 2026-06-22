/**
 * FloatingActionBar — Sticky bottom bar for transactional flows
 *
 * Shows selected seats summary, total price, and a CTA button.
 * Reused across Seat Selection, Checkout, and Payment screens.
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import type { Seat } from '../types';

interface FloatingActionBarProps {
  selectedSeats: Seat[];
  totalPrice: number;
  ctaLabel: string;
  onPress: () => void;
  disabled?: boolean;
}

export function FloatingActionBar({
  selectedSeats,
  totalPrice,
  ctaLabel,
  onPress,
  disabled = false,
}: FloatingActionBarProps): React.JSX.Element {
  const styles = useThemedStyles(createStyles);
  const formatPrice = (price: number) => {
    return `${price.toLocaleString('vi-VN')}đ`;
  };

  return (
    <View style={styles.container}>
      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={styles.seatsInfo}>
          <Text style={styles.seatsLabel}>Selected Seats</Text>
          <View style={styles.seatBadges}>
            {selectedSeats.map((seat) => (
              <View key={seat.id} style={styles.seatBadge}>
                <Text style={styles.seatBadgeText}>{seat.label}</Text>
              </View>
            ))}
            {selectedSeats.length === 0 && (
              <Text style={styles.noSeatsText}>None</Text>
            )}
          </View>
        </View>
        <View style={styles.priceInfo}>
          <Text style={styles.priceLabel}>Total Price</Text>
          <Text style={styles.priceValue}>{formatPrice(totalPrice)}</Text>
        </View>
      </View>

      {/* CTA Button */}
      <Pressable
        onPress={onPress}
        disabled={disabled || selectedSeats.length === 0}
        style={({ pressed }) => [
          styles.ctaButton,
          (disabled || selectedSeats.length === 0) && styles.ctaDisabled,
          pressed && !(disabled || selectedSeats.length === 0) ? styles.ctaPressed : null,
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    ...theme.components.actionBar,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
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
