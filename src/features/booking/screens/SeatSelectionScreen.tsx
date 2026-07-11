/** SeatSelectionScreen — Interactive seat map for choosing seats
 *
 * Visual style: matches Parcel flow (gradient bg, mint palette, card surfaces)
 */

import React, { useEffect, useCallback } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { FloatingActionBar, RouteProgressRow, SeatLegend } from '../components';
import { useBookingStore } from '../store/useBookingStore';
import { SeatGrid } from '../components/SeatGrid';

interface SeatSelectionStepProps {
  onNext: (step: number) => void;
}

export function SeatSelectionScreen({
  onNext,
}: SeatSelectionStepProps): React.JSX.Element {
  const selectedTrip = useBookingStore(state => state.selectedTrip);
  const seatMap = useBookingStore(state => state.seatMap);
  const selectedSeats = useBookingStore(state => state.selectedSeats);
  const toggleSeat = useBookingStore(state => state.toggleSeat);
  const initSeatMap = useBookingStore(state => state.initSeatMap);
  const initTripDetail = useBookingStore(state => state.initTripDetail);
  const getTotalPrice = useBookingStore(state => state.totalPrice);
  const currentLeg = useBookingStore(state => state.currentLeg);
  const isRoundTrip = useBookingStore(
    state => state.searchParams.isRoundTrip ?? false,
  );
  const setHighestStep = useBookingStore(state => state.setHighestStep);
  const styles = useThemedStyles(createStyles);

  useEffect(() => {
    initSeatMap();
    initTripDetail();
    setHighestStep(currentLeg === 'outbound' ? 2 : 6);
  }, [initSeatMap, initTripDetail, setHighestStep, currentLeg]);

  const handleBookNow = useCallback(() => {
    // Outbound: step 2 -> step 3; Return: step 6 -> step 7
    const nextStep = currentLeg === 'outbound' ? 3 : 7;
    onNext(nextStep);
  }, [onNext, currentLeg]);

  const trip = selectedTrip;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isRoundTrip
            ? currentLeg === 'outbound'
              ? 'Select Outbound Seat'
              : 'Select Return Seat'
            : 'Select Seat'}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Route Info Card */}
        <RouteProgressRow
          departureCode={trip?.departureCity ?? ''}
          departureTime={trip?.departureTime ?? ''}
          arrivalCode={trip?.arrivalCity ?? ''}
          arrivalTime={trip?.arrivalTime ?? ''}
          durationHours={trip?.durationHours}
          style={styles.routeSummary}
        />

        {/* Seat Legend */}
        <View style={styles.legendWrap}>
          <SeatLegend />
        </View>

        {/* Seat Grid */}
        <View style={styles.seatWrap}>
          <SeatGrid
            seatMap={seatMap}
            selectedSeats={selectedSeats}
            onSeatPress={toggleSeat}
          />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <FloatingActionBar
        selectedSeats={selectedSeats}
        totalPrice={getTotalPrice()}
        ctaLabel="Continue"
        onPress={handleBookNow}
      />
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
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
    color: theme.colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  routeSummary: {
    marginBottom: spacing.md,
  },
  legendWrap: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  seatWrap: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  bottomSpacer: {
    height: 220,
  },
});
