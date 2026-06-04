/**
 * TripResultsScreen — Search results list with loading/error/empty states
 *
 * Shows trip cards for the selected route, or a themed empty/error
 * state with mascot illustrations.
 *
 * Refactored: uses AmbientGlow + AppHeader + shared LoadingState/EmptyState/ErrorState
 * components instead of duplicating inline state UI.
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { SlidersHorizontal } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing } from '@shared/theme';
import { AmbientGlow, AppHeader, LoadingState, EmptyState, ErrorState } from '../components';
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
    selectedTrip,
  } = useBookingStore();

  useEffect(() => {
    searchTrips();
  }, [searchTrips]);

  const handleTripPress = useCallback(
    (trip: BusTrip) => {
      selectTrip(trip);
      navigation.navigate('SeatSelection', { tripId: trip.id });
    },
    [navigation, selectTrip],
  );

  const handleRetry = useCallback(() => {
    searchTrips();
  }, [searchTrips]);

  const renderContent = () => {
    if (tripResultsStatus === 'loading') {
      return <LoadingState />;
    }

    if (tripResultsStatus === 'error') {
      return <ErrorState onRetry={handleRetry} />;
    }

    if (tripResultsStatus === 'empty') {
      return (
        <EmptyState
          title="No rides found today"
          subtitle="Try adjusting your filters or checking a different date."
          actionLabel="Clear Filters"
          onAction={handleRetry}
        />
      );
    }

    return (
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TripCard
            trip={item}
            onPress={handleTripPress}
            isSelected={selectedTrip?.id === item.id}
          />
        )}
      />
    );
  };

  const routeInfoCenter = (
    <View style={styles.headerCenterStack}>
      <Text style={styles.headerPassengers}>1 Passenger</Text>
      <View style={styles.routeRow}>
        <Text style={styles.headerCity}>{departureId}</Text>
        <Text style={styles.headerArrow}> → </Text>
        <Text style={styles.headerCity}>{destinationId}</Text>
      </View>
      <Text style={styles.headerDate}>Tomorrow, 24 Oct</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <AmbientGlow />
      <AppHeader
        centerElement={routeInfoCenter}
        onBackPress={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity style={styles.filterButton} activeOpacity={0.7}>
            <SlidersHorizontal size={20} weight="bold" color={colors.textPrimary} />
          </TouchableOpacity>
        }
      />
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#E6F4F3',
  },
  headerCenterStack: {
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
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
  },
  headerArrow: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  headerDate: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  filterButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: 100,
  },
});
