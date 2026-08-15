/** TripResultsScreen — Search results list with loading/error/empty states
 *
 * Visual style: matches Parcel home (gradient bg, card surfaces, mint palette)
 */

import React, { useEffect, useCallback } from 'react';
import { ActivityIndicator, Pressable, View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FlashList } from '@shopify/flash-list';
import { useShallow } from 'zustand/react/shallow';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useThemedStyles } from '@shared/hooks';
import { useTheme } from '@shared/contexts/ThemeContext';
import type { AppTheme } from '@shared/theme';
import { LoadingState, EmptyState, ErrorState } from '../components';
import { TripCard } from '../components/TripCard';
import { useBookingStore } from '../store/useBookingStore';
import type { BusTrip, TripFilterState } from '../types';

interface TripResultsStepProps {
  onNext: (step: number) => void;
  autoSearchEnabled: boolean;
  filters?: TripFilterState;
  onClearFilters?: () => void;
}

export function TripResultsScreen({
  onNext,
  autoSearchEnabled,
}: TripResultsStepProps): React.JSX.Element {
  const { t } = useTranslation();
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
  const theme = useTheme();
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
    if (tripResultsStatus === 'error' && !hasLoadedTrips) {
      return <ErrorState onRetry={handleRetry} />;
    }
    if (tripResultsStatus === 'empty') {
      return (
        <EmptyState
          title={t('booking.results.noRidesTitle')}
          subtitle={t('booking.results.noRidesDescription')}
          actionLabel={t('booking.results.searchAgain')}
          onAction={handleRetry}
        />
      );
    }
    if (trips.length === 0) {
      return (
        <EmptyState
          title={t('booking.results.noRidesTitle')}
          subtitle={t('booking.results.noRidesDescription')}
          actionLabel={t('booking.results.searchAgain')}
          onAction={handleRetry}
        />
      );
    }

    return (
      <FlashList
        data={trips}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={renderTrip}
        ListHeaderComponent={tripResultsStatus === 'loading' || tripResultsStatus === 'error' ? (
          <View style={styles.refreshBanner} accessibilityRole="alert">
            {tripResultsStatus === 'loading' ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : null}
            <Text style={styles.refreshText}>
              {tripResultsStatus === 'loading'
                ? t('booking.results.refreshing')
                : t('booking.results.refreshFailed')}
            </Text>
            {tripResultsStatus === 'error' ? (
              <Pressable accessibilityRole="button" onPress={handleRetry} hitSlop={8}>
                <Text style={styles.refreshAction}>{t('common.retry')}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Leg Title */}
      <View style={styles.legTitleContainer}>
        <Text style={styles.legTitle}>
          {searchParams.isRoundTrip
            ? (currentLeg === 'outbound'
              ? t('booking.results.selectOutbound')
              : t('booking.results.selectReturn'))
            : t('booking.results.selectTrip')}
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
  refreshBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 14,
    backgroundColor: theme.colors.primaryFaded,
  },
  refreshText: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  refreshAction: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
});
