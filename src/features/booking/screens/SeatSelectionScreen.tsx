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
  const styles = useThemedStyles(createStyles);

  useEffect(() => {
    initSeatMap();
    setHighestStep(currentLeg === 'outbound' ? 2 : 6);
  }, [initSeatMap, setHighestStep, currentLeg]);

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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  card: {
    ...theme.components.card,
    borderRadius: 28,
    padding: spacing.xxl,
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
