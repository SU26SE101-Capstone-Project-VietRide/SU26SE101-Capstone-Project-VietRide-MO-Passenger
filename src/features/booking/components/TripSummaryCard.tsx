import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bus } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import type { BusTrip } from '../../types';

interface TripSummaryCardProps {
  trip?: BusTrip;
  seats: { label: string }[];
  totalPrice: number;
  formatPrice?: (price: number) => string;
}

const DEFAULT_FORMAT = (price: number) => `${price.toLocaleString('vi-VN')}đ`;

export const TripSummaryCard = ({
  trip,
  seats,
  totalPrice,
  formatPrice = DEFAULT_FORMAT,
}: TripSummaryCardProps): React.JSX.Element => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>Trip Summary</Text>

    {/* Route info */}
    <View style={styles.tripRouteRow}>
      <View style={styles.tripRouteIcon}>
        <Bus size={20} weight="fill" color={colors.primary} />
      </View>
      <View style={styles.tripRouteInfo}>
        <View style={styles.tripCityRow}>
          <Text style={styles.tripCity}>{trip?.departureCity || 'HCM'}</Text>
          <Text style={styles.tripArrow}> → </Text>
          <Text style={styles.tripCity}>{trip?.arrivalCity || 'Da Lat'}</Text>
        </View>
        <Text style={styles.tripDateTime}>
          {trip?.date || 'Oct 24'} • {trip?.departureTime || '22:30'} PM -{' '}
          {trip?.arrivalTime || '05:00'} AM
        </Text>
      </View>
    </View>

    <View style={styles.divider} />

    {/* Passengers */}
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>Passenger ({seats.length}x)</Text>
      <Text style={styles.summaryValue}>{seats.map((s) => s.label).join(', ')}</Text>
    </View>

    <View style={styles.divider} />

    {/* Total */}
    <View style={styles.summaryRow}>
      <Text style={styles.totalLabel}>Total Price</Text>
      <Text style={styles.totalValue}>{formatPrice(totalPrice)}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  cardTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  tripRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripRouteIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  tripRouteInfo: {
    flex: 1,
  },
  tripCityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripCity: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  tripArrow: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  tripDateTime: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  totalLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.textPrimary,
  },
  totalValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h3,
    color: colors.primary,
  },
});
