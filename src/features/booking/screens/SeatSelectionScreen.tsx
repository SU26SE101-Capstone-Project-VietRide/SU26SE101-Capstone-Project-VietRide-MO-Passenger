/**
 * SeatSelectionScreen — Interactive seat map for choosing seats
 *
 * Shows route info card, legend, interactive seat grid,
 * and floating bottom bar with seat summary + price + CTA.
 */

import React, { useEffect, useCallback } from 'react';
import { StyleSheet, ScrollView, StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, shadows } from '@shared/theme';
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

      {/* Header */}
      <ScreenHeader
        title="Select Seat"
        onBackPress={() => navigation.goBack()}
      />

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

        {/* Seat Grid — seatWrap must NOT constrain width (no alignItems center) so rows spread into 2-2 layout */}
        <View style={styles.seatWrap}>
          <SeatGrid seatMap={seatMap} onSeatPress={toggleSeat} />
        </View>

        <View style={{ height: 160 }} />
      </ScrollView>

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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    ...shadows.md,
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
