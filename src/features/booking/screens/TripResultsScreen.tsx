/** TripResultsScreen — Search results list with loading/error/empty states
 *
 * Visual style: matches Parcel home (gradient bg, card surfaces, mint palette)
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import { View, Text } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useShallow } from 'zustand/react/shallow';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { LoadingState, EmptyState, ErrorState } from '../components';
import { TripCard } from '../components/TripCard';
import { useBookingStore } from '../store/useBookingStore';
import type { BusTrip, TripFilterState, TripPriceRange, TripTimeSlot } from '../types';

interface TripResultsStepProps {
  onNext: (step: number) => void;
  autoSearchEnabled: boolean;
  filters?: TripFilterState;
  onClearFilters?: () => void;
}

const defaultFilters: TripFilterState = {
  operatorBadge: 'all',
  timeSlot: 'all',
  priceRange: 'all',
};

const isFilterActive = (filters: TripFilterState): boolean => {
  return filters.operatorBadge !== 'all'
    || filters.timeSlot !== 'all'
    || filters.priceRange !== 'all';
};

const parseDepartureHour = (time: string): number => {
  const [hour] = time.split(':');
  return Number.parseInt(hour, 10);
};

const matchesTimeSlot = (trip: BusTrip, timeSlot: TripTimeSlot): boolean => {
  if (timeSlot === 'all') {
    return true;
  }

  const hour = parseDepartureHour(trip.departureTime);

  if (Number.isNaN(hour)) {
    return true;
  }

  switch (timeSlot) {
    case 'morning':
      return hour >= 5 && hour < 12;
    case 'afternoon':
      return hour >= 12 && hour < 17;
    case 'evening':
      return hour >= 17 && hour < 22;
    case 'night':
      return hour >= 22 || hour < 5;
    default:
      return true;
  }
};

const matchesPriceRange = (trip: BusTrip, priceRange: TripPriceRange): boolean => {
  switch (priceRange) {
    case 'under_350k':
      return trip.price < 350000;
    case '350k_450k':
      return trip.price >= 350000 && trip.price <= 450000;
    case 'over_450k':
      return trip.price > 450000;
    default:
      return true;
  }
};

const filterTrips = (trips: BusTrip[], filters: TripFilterState): BusTrip[] => {
  return trips.filter((trip) => {
    const matchesOperator = filters.operatorBadge === 'all'
      || trip.operatorBadge === filters.operatorBadge;
    return matchesOperator
      && matchesTimeSlot(trip, filters.timeSlot)
      && matchesPriceRange(trip, filters.priceRange);
  });
};

export function TripResultsScreen({
  onNext,
  autoSearchEnabled,
  filters = defaultFilters,
  onClearFilters,
}: TripResultsStepProps): React.JSX.Element {
  const {
    tripResultsStatus,
    trips,
    searchTrips,
    selectTrip,
    selectedTrip,
    currentLeg,
    searchParams,
  } = useBookingStore(useShallow((state) => ({
    tripResultsStatus: state.tripResultsStatus,
    trips: state.trips,
    searchTrips: state.searchTrips,
    selectTrip: state.selectTrip,
    selectedTrip: state.selectedTrip,
    currentLeg: state.currentLeg,
    searchParams: state.searchParams,
  })));
  const styles = useThemedStyles(createStyles);
  const hasActiveFilters = isFilterActive(filters);
  const visibleTrips = useMemo(() => filterTrips(trips, filters), [filters, trips]);
  const hasLoadedTrips = trips.length > 0;

  useEffect(() => {
    if (autoSearchEnabled) searchTrips();
  }, [autoSearchEnabled, currentLeg, searchTrips]);

  const handleTripPress = useCallback(
    (trip: BusTrip) => {
      selectTrip(trip);
      // Outbound: step 1 -> step 2; Return: step 5 -> step 6
      const nextStep = currentLeg === 'outbound' ? 2 : 6;
      onNext(nextStep);
    },
    [selectTrip, onNext, currentLeg],
  );

  const handleRetry = useCallback(() => {
    searchTrips();
  }, [searchTrips]);

  const keyExtractor = useCallback((item: BusTrip) => item.id, []);
  const renderTrip = useCallback(
    ({ item }: { item: BusTrip }) => (
      <TripCard
        trip={item}
        onPress={handleTripPress}
        isSelected={selectedTrip?.id === item.id}
      />
    ),
    [handleTripPress, selectedTrip?.id],
  );

  const renderContent = () => {
    if (tripResultsStatus === 'loading' && !hasLoadedTrips) {
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
    if (visibleTrips.length === 0) {
      return (
        <EmptyState
          title={hasActiveFilters ? 'No trips match your filters' : 'No rides found today'}
          subtitle={hasActiveFilters
            ? 'Try another operator, time window, or fare range.'
            : 'Try adjusting your filters or checking a different date.'}
          actionLabel={hasActiveFilters ? 'Clear Filters' : 'Search Again'}
          onAction={hasActiveFilters && onClearFilters ? onClearFilters : handleRetry}
        />
      );
    }

    return (
      <FlashList
        data={visibleTrips}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={renderTrip}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Leg Title */}
      <View style={styles.legTitleContainer}>
        <Text style={styles.legTitle}>
          {searchParams.isRoundTrip
            ? (currentLeg === 'outbound' ? 'Select Outbound Trip' : 'Select Return Trip')
            : 'Select Trip'}
        </Text>
      </View>

      {renderContent()}
    </View>
  );
};

const createStyles = (theme: AppTheme) => ({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: 120,
  },
  legTitleContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  legTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: theme.colors.textPrimary,
  },
});
