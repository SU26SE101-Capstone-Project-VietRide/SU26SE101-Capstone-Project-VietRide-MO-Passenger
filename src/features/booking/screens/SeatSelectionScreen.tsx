/**
 * SeatSelectionScreen — Interactive seat map for choosing seats
 *
 * Shows route info card, legend, interactive seat grid,
 * and floating bottom bar with seat summary + price + CTA.
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import { SeatGrid } from '../components/SeatGrid';
import { FloatingActionBar } from '../components/FloatingActionBar';
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
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FF" />
      <View style={styles.ambientGlow} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Seat</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Route Info Card */}
        <View style={styles.routeCard}>
          <View style={styles.routeEndpoint}>
            <Text style={styles.routeCode}>
              {trip?.departureCity?.substring(0, 3).toUpperCase() || 'HCM'}
            </Text>
            <Text style={styles.routeTime}>{trip?.departureTime || '22:30'}</Text>
          </View>

          <View style={styles.routeCenter}>
            <View style={styles.routeLine}>
              <View style={styles.routeLineBar} />
              <View style={styles.routeIconBubble}>
                <Text style={styles.routeIconText}>✈️</Text>
              </View>
            </View>
            <Text style={styles.routeDuration}>
              {trip?.durationHours || 6.5}h
            </Text>
          </View>

          <View style={[styles.routeEndpoint, styles.routeEndpointRight]}>
            <Text style={styles.routeCode}>
              {trip?.arrivalCity?.substring(0, 5) || 'Da Lat'}
            </Text>
            <Text style={styles.routeTime}>{trip?.arrivalTime || '04:30'}</Text>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendAvailable]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendSelected]} />
            <Text style={styles.legendText}>Selected</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendSold]} />
            <Text style={styles.legendText}>Sold</Text>
          </View>
        </View>

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
    backgroundColor: '#F7F9FF',
  },
  ambientGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(42, 193, 188, 0.12)',
    width: 585,
    height: 585,
    borderRadius: 9999,
    top: -176.8,
    left: -97.5,
    zIndex: 0,
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: colors.textPrimary,
    fontFamily: fontFamilies.bold,
  },
  headerTitle: {
    flex: 1,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 220,
  },
  routeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  routeEndpoint: {
    flex: 1,
  },
  routeEndpointRight: {
    alignItems: 'flex-end',
  },
  routeCode: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xxl,
    color: colors.textPrimary,
  },
  routeTime: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  routeCenter: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 96,
  },
  routeLineBar: {
    flex: 1,
    height: 2,
    backgroundColor: colors.divider,
  },
  routeIconBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: '50%',
    marginLeft: -14,
  },
  routeIconText: {
    fontSize: 12,
  },
  routeDuration: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xxl,
    marginBottom: spacing.xl,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.xs,
    borderWidth: 1.5,
  },
  legendAvailable: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  legendSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  legendSold: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.divider,
  },
  legendText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
});
