/**
 * FloatingActionBar — Sticky bottom bar for transactional flows
 *
 * Shows selected seats summary, total price, and a CTA button.
 * Reused across Seat Selection, Checkout, and Payment screens.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
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
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        disabled={disabled || selectedSeats.length === 0}
        style={[
          styles.ctaButton,
          (disabled || selectedSeats.length === 0) && styles.ctaDisabled,
        ]}
      >
        <Text style={styles.ctaText}>{ctaLabel}</Text>
        <Text style={styles.ctaArrow}>→</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    ...shadows.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  seatsInfo: {
    flex: 1,
  },
  seatsLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  seatBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  seatBadge: {
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  seatBadgeText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: colors.primary,
  },
  noSeatsText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textTertiary,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  priceValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h3,
    color: colors.primary,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.textInverse,
    marginRight: spacing.sm,
  },
  ctaArrow: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.textInverse,
  },
});
