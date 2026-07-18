/** PickUpScreen — Dedicated screen to choose a pick-up point
 *
 * Visual style: matches Parcel flow (clean lists, vivid selection states)
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import { useStationDetail } from '@features/trip/hooks';
import {
  FloatingActionBar,
  ShuttlePickupSheet,
  ShuttleServiceCard,
  type ShuttleServiceStatus,
  StopOption,
} from '../components';
import { getShuttleEligibility } from '../utils/shuttle';

interface PickUpStepProps {
  onNext: (step: number) => void;
}

export function PickUpScreen({ onNext }: PickUpStepProps): React.JSX.Element {
  const {
    pickUpPoints,
    selectedPickUp,
    selectPickUp,
    selectedSeats,
    totalPrice,
    currentLeg,
    searchParams,
    setHighestStep,
    selectedTrip,
    selectedShuttlePickup,
    setSelectedShuttlePickup,
  } = useBookingStore(useShallow((state) => ({
    pickUpPoints: state.pickUpPoints,
    selectedPickUp: state.selectedPickUp,
    selectPickUp: state.selectPickUp,
    selectedSeats: state.selectedSeats,
    totalPrice: state.totalPrice,
    currentLeg: state.currentLeg,
    searchParams: state.searchParams,
    setHighestStep: state.setHighestStep,
    selectedTrip: state.selectedTrip,
    selectedShuttlePickup: state.selectedShuttlePickup,
    setSelectedShuttlePickup: state.setSelectedShuttlePickup,
  })));
  const styles = useThemedStyles(createStyles);
  const [isShuttleSheetVisible, setIsShuttleSheetVisible] = useState(false);
  const stationQuery = useStationDetail(
    selectedTrip?.originStationId,
    Boolean(selectedTrip?.originStationId),
  );

  React.useEffect(() => {
    setHighestStep(currentLeg === 'outbound' ? 3 : 7);
  }, [setHighestStep, currentLeg]);

  const shuttleAvailability = useMemo<{
    status: ShuttleServiceStatus;
    reason?: string;
  }>(() => {
    if (!selectedTrip || !selectedPickUp) {
      return { status: 'unavailable', reason: 'Select a trip and boarding point first.' };
    }

    if (
      selectedPickUp.stationId !== selectedTrip.originStationId
      || selectedPickUp.stopId
    ) {
      return {
        status: 'unavailable',
        reason: 'Shuttle pickup is available only when boarding at the departure station.',
      };
    }

    if (stationQuery.isPending) return { status: 'loading' };
    if (stationQuery.isError || !stationQuery.data) return { status: 'error' };

    const eligibility = getShuttleEligibility(
      selectedTrip,
      selectedPickUp,
      stationQuery.data,
    );
    if (eligibility.eligible) return { status: 'available' };

    const reasons: Record<Exclude<typeof eligibility.reason, null>, string> = {
      BOARDING_POINT: 'Shuttle pickup is available only at the departure station.',
      TRIP_STATUS: 'This trip is no longer accepting Shuttle pickup requests.',
      TRIP_SCHEDULE: 'Shuttle availability cannot be verified for this trip.',
      CUTOFF: 'Shuttle requests close 30 minutes before departure.',
      STATION_INACTIVE: 'The departure station is currently inactive.',
      STATION_UNSUPPORTED: 'This departure station does not support Shuttle pickup.',
      STATION_COORDINATES: 'Shuttle availability cannot be verified for this station.',
    };

    return { status: 'unavailable', reason: reasons[eligibility.reason] };
  }, [selectedPickUp, selectedTrip, stationQuery.data, stationQuery.isError, stationQuery.isPending]);

  useEffect(() => {
    if (selectedShuttlePickup && shuttleAvailability.status === 'unavailable') {
      setSelectedShuttlePickup(null);
      setIsShuttleSheetVisible(false);
    }
  }, [selectedShuttlePickup, setSelectedShuttlePickup, shuttleAvailability.status]);

  const handleShuttleToggle = useCallback((enabled: boolean) => {
    if (!enabled) {
      setSelectedShuttlePickup(null);
      setIsShuttleSheetVisible(false);
      return;
    }

    if (shuttleAvailability.status === 'available') {
      setIsShuttleSheetVisible(true);
    }
  }, [setSelectedShuttlePickup, shuttleAvailability.status]);

  const handleNext = useCallback(() => {
    // Outbound: step 3 -> step 4; Return: step 7 -> step 8
    const nextStep = currentLeg === 'outbound' ? 4 : 8;
    onNext(nextStep);
  }, [onNext, currentLeg]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {searchParams.isRoundTrip
            ? (currentLeg === 'outbound' ? 'Select Outbound Pick-up' : 'Select Return Pick-up')
            : 'Select Pick-up Point'}
        </Text>
      </View>

        {/* Content */}
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {pickUpPoints.map((point) => (
            <StopOption
              key={point.id}
              id={point.id}
              name={point.name}
              address={point.address}
              time={point.time}
              status={point.status}
              refundAmount={point.refundAmount}
              disabledReason={point.disabledReason}
              isSelected={selectedPickUp?.id === point.id}
              onPress={() => selectPickUp(point)}
              icon="📍"
            />
          ))}

          <ShuttleServiceCard
            status={shuttleAvailability.status}
            value={selectedShuttlePickup}
            stationName={selectedTrip?.departureStation}
            unavailableReason={shuttleAvailability.reason}
            onToggle={handleShuttleToggle}
            onEdit={() => setIsShuttleSheetVisible(true)}
            onRetry={() => stationQuery.refetch().catch(() => undefined)}
          />
        </ScrollView>

        <FloatingActionBar
          selectedSeats={selectedSeats}
          totalPrice={totalPrice()}
          ctaLabel="Next"
          onPress={handleNext}
          disabled={Boolean(
            selectedShuttlePickup
            && shuttleAvailability.status !== 'available',
          )}
        />

        {selectedTrip ? (
          <ShuttlePickupSheet
            visible={isShuttleSheetVisible}
            stationId={selectedTrip.originStationId}
            stationName={selectedTrip.departureStation}
            initialValue={selectedShuttlePickup}
            onClose={() => setIsShuttleSheetVisible(false)}
            onSave={setSelectedShuttlePickup}
          />
        ) : null}
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
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  scroll: {
    flex: 1,
  },
});
