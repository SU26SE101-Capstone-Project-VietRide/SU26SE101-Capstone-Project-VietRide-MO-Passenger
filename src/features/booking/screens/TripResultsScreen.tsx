/**
 * TripResultsScreen — Shows bus trip search results
 *
 * Handles 4 states: loading (mascot spinner), success (trip list),
 * empty (no rides), and error (WiFi lost).
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import { TripCard } from '../components/TripCard';
import type { BookingStackParamList } from '@app/navigation/types';
import type { BusTrip } from '../types';

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'RouteResults'>;
type RoutePropType = RouteProp<BookingStackParamList, 'RouteResults'>;

export function TripResultsScreen(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { departureId, destinationId } = route.params;

  const {
    tripResultsStatus,
    trips,
    searchTrips,
    selectTrip,
  } = useBookingStore();

  useEffect(() => {
    searchTrips();
  }, [searchTrips]);

  const handleTripPress = useCallback((trip: BusTrip) => {
    selectTrip(trip);
    navigation.navigate('SeatSelection', { tripId: trip.id });
  }, [navigation, selectTrip]);

  const handleRetry = useCallback(() => {
    searchTrips();
  }, [searchTrips]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FF" />

      {/* Ambient glow */}
      <View style={styles.ambientGlow} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerPassengers}>1 Passenger</Text>
          <View style={styles.routeRow}>
            <Text style={styles.headerCity}>{departureId}</Text>
            <Text style={styles.headerArrow}> → </Text>
            <Text style={styles.headerCity}>{destinationId}</Text>
          </View>
          <Text style={styles.headerDate}>Tomorrow, 24 Oct</Text>
        </View>

        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {tripResultsStatus === 'loading' && (
        <View style={styles.stateContainer}>
          <View style={styles.mascotContainer}>
            <View style={styles.mascotBorder}>
              <View style={styles.mascotInner}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            </View>
          </View>
          <Text style={styles.stateTitle}>Finding the best routes...</Text>
          <Text style={styles.stateSubtitle}>
            Our tiny buses are speeding your way!
          </Text>
        </View>
      )}

      {tripResultsStatus === 'error' && (
        <View style={styles.stateContainer}>
          <View style={styles.illustrationContainer}>
            <View style={styles.illustrationCircle}>
              <Text style={styles.illustrationEmoji}>📡</Text>
            </View>
          </View>
          <Text style={styles.stateTitle}>Oops! Lost Connection</Text>
          <Text style={styles.stateSubtitle}>
            We can't find any rides without the internet. Please check your
            signal and try again.
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleRetry}
            style={styles.retryButton}
          >
            <Text style={styles.retryIcon}>🔄</Text>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {tripResultsStatus === 'empty' && (
        <View style={styles.stateContainer}>
          <View style={styles.illustrationContainer}>
            <View style={styles.illustrationCircle}>
              <Text style={styles.illustrationEmoji}>🚌</Text>
            </View>
          </View>
          <Text style={styles.stateTitle}>No rides found today</Text>
          <Text style={styles.stateSubtitle}>
            Try adjusting your filters or checking a different date.
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleRetry}
            style={styles.retryButton}
          >
            <Text style={styles.retryIcon}>🔄</Text>
            <Text style={styles.retryText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      )}

      {tripResultsStatus === 'success' && (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TripCard trip={item} onPress={handleTripPress} />
          )}
        />
      )}
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerPassengers: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCity: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xxl,
    color: colors.textPrimary,
  },
  headerArrow: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.lg,
    color: colors.textSecondary,
  },
  headerDate: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIcon: {
    fontSize: 18,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: 100,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 80,
  },
  mascotContainer: {
    marginBottom: spacing.xxl,
  },
  mascotBorder: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.xl,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  mascotInner: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  illustrationContainer: {
    marginBottom: spacing.xxl,
  },
  illustrationCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationEmoji: {
    fontSize: 64,
  },
  stateTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  stateSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSizes.md * 1.6,
    maxWidth: 300,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxxl,
    marginTop: spacing.xxl,
    ...shadows.lg,
  },
  retryIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  retryText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.textInverse,
  },
});
