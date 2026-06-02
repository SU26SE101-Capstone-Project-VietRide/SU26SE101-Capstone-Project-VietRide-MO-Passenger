/**
 * SeatGrid — Interactive bus seat map
 *
 * Renders rows of seats with aisle spacing. Each seat can be
 * available (white), selected (teal, scaled), or sold (gray, disabled).
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import type { SeatRow, Seat } from '../types';

interface SeatGridProps {
  seatMap: SeatRow[];
  onSeatPress: (seatId: string) => void;
}

function SeatButton({
  seat,
  onPress,
}: {
  seat: Seat;
  onPress: (id: string) => void;
}): React.JSX.Element {
  const isSelected = seat.status === 'selected';
  const isSold = seat.status === 'sold';

  return (
    <TouchableOpacity
      activeOpacity={isSold ? 1 : 0.7}
      onPress={() => !isSold && onPress(seat.id)}
      style={[
        styles.seat,
        seat.status === 'available' && styles.seatAvailable,
        isSelected && styles.seatSelected,
        isSold && styles.seatSold,
        isSelected && { transform: [{ scale: 1.05 }] },
      ]}
    >
      <Text
        style={[
          styles.seatLabel,
          isSelected && styles.seatLabelSelected,
          isSold && styles.seatLabelSold,
        ]}
      >
        {seat.label}
      </Text>
    </TouchableOpacity>
  );
}

export function SeatGrid({ seatMap, onSeatPress }: SeatGridProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      {/* Steering wheel indicator */}
      <View style={styles.steeringRow}>
        <View style={styles.steeringSpacer} />
        <View style={styles.steeringIcon}>
          <Text style={styles.steeringEmoji}>🔘</Text>
        </View>
      </View>

      {seatMap.map((row) => (
        <View key={row.rowLabel} style={styles.row}>
          {/* Left pair */}
          <View style={styles.seatPair}>
            {row.leftSeats.map((seat) => (
              <SeatButton key={seat.id} seat={seat} onPress={onSeatPress} />
            ))}
          </View>

          {/* Aisle */}
          <View style={styles.aisle} />

          {/* Right pair */}
          <View style={styles.seatPair}>
            {row.rightSeats.map((seat) => (
              <SeatButton key={seat.id} seat={seat} onPress={onSeatPress} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    ...shadows.md,
  },
  steeringRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.lg,
    paddingRight: spacing.xs,
  },
  steeringSpacer: {
    flex: 1,
  },
  steeringIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  steeringEmoji: {
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  seatPair: {
    flexDirection: 'row',
    flex: 1,
    gap: spacing.lg,
  },
  aisle: {
    width: 56,
  },
  seat: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  seatAvailable: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  seatSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.md,
  },
  seatSold: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.divider,
  },
  seatLabel: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  seatLabelSelected: {
    color: colors.textInverse,
  },
  seatLabelSold: {
    color: colors.textDisabled,
  },
});
