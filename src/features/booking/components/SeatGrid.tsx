/**
 * SeatGrid — Interactive bus seat map
 *
 * Renders rows of seats with aisle spacing. Each seat can be
 * available (white), selected (teal, scaled), or sold (gray, disabled).
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import type { SeatRow, Seat } from '../types';

interface SeatGridProps {
  seatMap: SeatRow[];
  onSeatPress: (seatId: string) => void;
}

function SeatButton({
  seat,
  onPress,
  styles,
}: {
  seat: Seat;
  onPress: (id: string) => void;
  styles: any;
}): React.JSX.Element {
  const isSelected = seat.status === 'selected';
  const isSold = seat.status === 'sold';

  return (
    <Pressable
      onPress={() => !isSold && onPress(seat.id)}
      style={({ pressed }) => [
        styles.seat,
        seat.status === 'available' && styles.seatAvailable,
        isSelected && styles.seatSelected,
        isSold && styles.seatSold,
        isSelected && { transform: [{ scale: 1.05 }] },
        pressed && !isSold && { opacity: 0.82 },
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
    </Pressable>
  );
}

export function SeatGrid({ seatMap, onSeatPress }: SeatGridProps): React.JSX.Element {
  const styles = useThemedStyles(createStyles);

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
              <SeatButton key={seat.id} seat={seat} onPress={onSeatPress} styles={styles} />
            ))}
          </View>

          {/* Aisle */}
          <View style={styles.aisle} />

          {/* Right pair */}
          <View style={styles.seatPair}>
            {row.rightSeats.map((seat) => (
              <SeatButton key={seat.id} seat={seat} onPress={onSeatPress} styles={styles} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: {
    ...theme.components.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
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
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
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
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surface,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorderStrong : theme.colors.border,
  },
  seatSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    ...theme.effects.floatingShadow,
  },
  seatSold: {
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderColor: theme.colors.divider,
  },
  seatLabel: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  seatLabelSelected: {
    color: theme.colors.textInverse,
  },
  seatLabelSold: {
    color: theme.colors.textDisabled,
  },
});
