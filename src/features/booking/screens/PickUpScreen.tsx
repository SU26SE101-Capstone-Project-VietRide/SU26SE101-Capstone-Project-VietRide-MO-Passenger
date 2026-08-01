/** PickUpScreen — Dedicated screen to choose a pick-up point
 *
 * Visual style: matches Parcel flow (clean lists, vivid selection states)
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
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
import type { PickUpPoint } from '../types';

interface PickUpStepProps {
  onNext: (step: number) => void;
}

export function PickUpScreen({ onNext }: PickUpStepProps): React.JSX.Element {
  const { t } = useTranslation();
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
  const refetchStation = stationQuery.refetch;

  React.useEffect(() => {
    setHighestStep(currentLeg === 'outbound' ? 3 : 7);
  }, [setHighestStep, currentLeg]);

  const shuttleAvailability = useMemo<{
    status: ShuttleServiceStatus;
    reason?: string;
  }>(() => {
    if (!selectedTrip || !selectedPickUp) {
      return {
        status: 'unavailable',
        reason: t('booking.shuttle.reasons.selectTripAndBoarding'),
      };
    }

    if (
      selectedPickUp.stationId !== selectedTrip.originStationId
      || selectedPickUp.stopId
    ) {
      return {
        status: 'unavailable',
        reason: t('booking.shuttle.reasons.departureStationOnly'),
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
      BOARDING_POINT: t('booking.shuttle.reasons.departureStationOnly'),
      TRIP_STATUS: t('booking.shuttle.reasons.tripStatus'),
      TRIP_SCHEDULE: t('booking.shuttle.reasons.tripSchedule'),
      CUTOFF: t('booking.shuttle.reasons.cutoff'),
      STATION_INACTIVE: t('booking.shuttle.reasons.stationInactive'),
      STATION_UNSUPPORTED: t('booking.shuttle.reasons.stationUnsupported'),
      STATION_COORDINATES: t('booking.shuttle.reasons.stationCoordinates'),
    };

    return { status: 'unavailable', reason: reasons[eligibility.reason] };
  }, [selectedPickUp, selectedTrip, stationQuery.data, stationQuery.isError, stationQuery.isPending, t]);

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

  const pointsById = useMemo(
    () => new Map(pickUpPoints.map(point => [point.id, point])),
    [pickUpPoints],
  );
  const handlePickUpPress = useCallback((id: string) => {
    const point = pointsById.get(id);
    if (point) {
      selectPickUp(point);
    }
  }, [pointsById, selectPickUp]);
  const openShuttleSheet = useCallback(() => setIsShuttleSheetVisible(true), []);
  const closeShuttleSheet = useCallback(() => setIsShuttleSheetVisible(false), []);
  const retryShuttleAvailability = useCallback(() => {
    refetchStation().catch(() => undefined);
  }, [refetchStation]);
  const keyExtractor = useCallback((item: PickUpPoint) => item.id, []);
  const renderPickUpPoint = useCallback(
    ({ item }: ListRenderItemInfo<PickUpPoint>) => (
      <StopOption
        id={item.id}
        name={item.name}
        address={item.address}
        time={item.time}
        status={item.status}
        refundAmount={item.refundAmount}
        disabledReason={item.disabledReason}
        isSelected={selectedPickUp?.id === item.id}
        onPress={handlePickUpPress}
      />
    ),
    [handlePickUpPress, selectedPickUp?.id],
  );

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
            ? (currentLeg === 'outbound'
              ? t('booking.stops.selectOutboundPickup')
              : t('booking.stops.selectReturnPickup'))
            : t('booking.stops.selectPickup')}
        </Text>
      </View>

        {/* Content */}
        <FlashList
          data={pickUpPoints}
          keyExtractor={keyExtractor}
          renderItem={renderPickUpPoint}
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={<ShuttleServiceCard
            status={shuttleAvailability.status}
            value={selectedShuttlePickup}
            stationName={selectedTrip?.departureStation}
            unavailableReason={shuttleAvailability.reason}
            onToggle={handleShuttleToggle}
            onEdit={openShuttleSheet}
            onRetry={retryShuttleAvailability}
          />}
        />

        <FloatingActionBar
          selectedSeats={selectedSeats}
          totalPrice={totalPrice()}
          ctaLabel={t('common.continue')}
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
            onClose={closeShuttleSheet}
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
