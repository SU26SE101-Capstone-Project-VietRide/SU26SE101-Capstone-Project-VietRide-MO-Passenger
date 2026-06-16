/** TripResultsScreen — Search results list with loading/error/empty states
 *
 * Visual style: matches Parcel home (gradient bg, card surfaces, mint palette)
 */

import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { colors, fontFamilies, fontSizes, spacing } from '@shared/theme';
import { LoadingState, EmptyState, ErrorState } from '../components';
import { TripCard } from '../components/TripCard';
import { useBookingStore } from '../store/useBookingStore';
import type { BusTrip } from '../types';

interface TripResultsStepProps {
  onNext: (step: number) => void;
}

export function TripResultsScreen({ onNext }: TripResultsStepProps): React.JSX.Element {
  const {
    tripResultsStatus,
    trips,
    searchTrips,
    selectTrip,
    selectedTrip,
    currentLeg,
    searchParams,
  } = useBookingStore();

  useEffect(() => {
    searchTrips();
  }, [searchTrips]);

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

  return (
    <View style={styles.container}>
      {/* Header Info */}
      {searchParams.from && searchParams.to ? (
        <View style={styles.headerRow}>
          <View style={styles.headerCenter}>
            <Text style={styles.headerRoute}>
              {currentLeg === 'outbound' ? `${searchParams.from} → ${searchParams.to}` : `${searchParams.to} → ${searchParams.from}`}
            </Text>
          </View>
        </View>
      ) : null}

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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerRoute: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: 100,
  },
  legTitleContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  legTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.textPrimary,
  },
});
