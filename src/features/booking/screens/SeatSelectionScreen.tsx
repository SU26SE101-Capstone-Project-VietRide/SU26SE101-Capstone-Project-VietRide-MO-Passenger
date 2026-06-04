/**
 * SeatSelectionScreen — Interactive seat map for choosing seats
 *
 * Shows route info card, legend, interactive seat grid,
 * and floating bottom bar with seat summary + price + CTA.
 *
 * Refactored: uses ScreenHeader for consistent top chrome,
 * SeatLegend for the inline legend block.
 */

import React, { useEffect, useCallback } from 'react';
import { StyleSheet, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing } from '@shared/theme';
import { ScreenHeader, FloatingActionBar, RouteProgressRow, SeatLegend } from '../components';
import { useBookingStore } from '../store/useBookingStore';
import { SeatGrid } from '../components/SeatGrid';
import type { BookingStackParamList } from '@app/navigation/types';

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'SeatSelection'>;

export function SeatSelectionScreen(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const {
    selectedTrip,
    seatMap,
    selectedSeats,
    toggleSeat,
    initSeatMap,
    totalPrice,
  } = useBookingStore();

  useEffect(() => {
    initSeatMap();
  }, [initSeatMap]);

  const handleBookNow = useCallback(() => {
    navigation.navigate('BookingConfirmation', { bookingId: 'checkout' });
  }, [navigation]);

  const trip = selectedTrip;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header with AmbientGlow */}
      <ScreenHeader
        title="Select Seat"
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Route Info Card — uses shared RouteProgressRow */}
        <RouteProgressRow
          departureCode={trip?.departureCity?.substring(0, 3).toUpperCase() || 'HCM'}
          departureTime={trip?.departureTime || '22:30'}
          arrivalCode={trip?.arrivalCity?.substring(0, 5) || 'Da Lat'}
          arrivalTime={trip?.arrivalTime || '04:30'}
          durationHours={trip?.durationHours || 6.5}
        />

        {/* Legend */}
        <SeatLegend />

        {/* Seat Grid */}
        <SeatGrid seatMap={seatMap} onSeatPress={toggleSeat} />
      </ScrollView>

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedSeats={selectedSeats}
        totalPrice={totalPrice()}
        ctaLabel="Book Now"
        onPress={handleBookNow}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 220,
  },
});
