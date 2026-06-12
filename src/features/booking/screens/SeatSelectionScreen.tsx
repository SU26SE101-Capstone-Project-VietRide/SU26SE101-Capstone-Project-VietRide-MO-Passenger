/** SeatSelectionScreen — Interactive seat map for choosing seats
 *
 * Visual style: matches Parcel flow (gradient bg, mint palette, card surfaces)
 */

import React, { useEffect, useCallback } from 'react';
import { StyleSheet, ScrollView, View, Text } from 'react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { FloatingActionBar, RouteProgressRow, SeatLegend } from '../components';
import { useBookingStore } from '../store/useBookingStore';
import { SeatGrid } from '../components/SeatGrid';

interface SeatSelectionStepProps {
  onNext: (step: number) => void;
}

export function SeatSelectionScreen({ onNext }: SeatSelectionStepProps): React.JSX.Element {
  const {
    selectedTrip,
    seatMap,
    selectedSeats,
    toggleSeat,
    initSeatMap,
    totalPrice,
    currentLeg,
    paymentMethod,
    searchParams,
    setHighestStep,
  } = useBookingStore();

  useEffect(() => {
    initSeatMap();
    setHighestStep(2);
  }, [initSeatMap, setHighestStep]);

  const handleBookNow = useCallback(() => {
    onNext(3);
  }, [onNext]);

  const trip = selectedTrip;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {searchParams.isRoundTrip
            ? (currentLeg === 'outbound' ? 'Select Outbound Seat' : 'Select Return Seat')
            : 'Select Seat'}
        </Text>
      </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Route Info Card */}
          <View style={styles.card}>
            <RouteProgressRow
              departureCode={trip?.departureCity ?? ''}
              departureTime={trip?.departureTime ?? ''}
              arrivalCode={trip?.arrivalCity ?? ''}
              arrivalTime={trip?.arrivalTime ?? ''}
              durationHours={trip?.durationHours}
            />
          </View>

          {/* Seat Legend */}
          <View style={styles.legendWrap}>
            <SeatLegend />
          </View>

          {/* Seat Grid */}
          <View style={styles.seatWrap}>
            <SeatGrid seatMap={seatMap} onSeatPress={toggleSeat} />
          </View>

          <View style={{ height: 220 }} />
        </ScrollView>

        <FloatingActionBar
          selectedSeats={selectedSeats}
          totalPrice={totalPrice()}
          ctaLabel="Continue"
          onPress={handleBookNow}
        />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: spacing.xxl,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.lg,
  },
  legendWrap: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  seatWrap: {
    marginTop: spacing.md,
  },
});
