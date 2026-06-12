/** SeatSelectionScreen — Interactive seat map for choosing seats
 *
 * Visual style: matches Parcel flow (gradient bg, mint palette, card surfaces)
 */

import React, { useEffect, useCallback } from 'react';
import { StyleSheet, ScrollView, StatusBar, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { ArrowLeft } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
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
    <View style={styles.root}>
      {/* Gradient background */}
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="300" width="100%">
          <Defs>
            <LinearGradient id="seatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#2AC1BC" stopOpacity={0.1} />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#seatGrad)" />
        </Svg>
      </View>

      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        {/* Header with back bubble */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            style={styles.backBtn}
          >
            <View style={styles.backBubble}>
              <ArrowLeft size={20} color={colors.primary} weight="bold" />
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Seat</Text>
          <View style={{ width: 40 }} />
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

          <View style={{ height: 160 }} />
        </ScrollView>

        <FloatingActionBar
          selectedSeats={selectedSeats}
          totalPrice={totalPrice()}
          ctaLabel="Book Now"
          onPress={handleBookNow}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#E6F4F3',
  },
  gradientContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    zIndex: 0,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.divider,
    ...shadows.sm,
  },
  backBubble: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
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
