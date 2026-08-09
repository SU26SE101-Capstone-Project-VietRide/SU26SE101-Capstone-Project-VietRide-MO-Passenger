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
import {
  FloatingActionBar,
  ShuttlePickupSheet,
  ShuttleServiceCard,
  StopOption,
} from '../components';
import { useShuttleServiceAvailability } from '../hooks/useShuttleServiceAvailability';
import { buildSeatBadgeItems } from '../utils/seatPresentation';
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
  const seatBadges = useMemo(
    () => buildSeatBadgeItems(selectedSeats, {
      scope: searchParams.isRoundTrip ? currentLeg : 'trip',
      tripId: selectedTrip?.id,
    }),
    [currentLeg, searchParams.isRoundTrip, selectedSeats, selectedTrip?.id],
  );
  const styles = useThemedStyles(createStyles);
  const [isShuttleSheetVisible, setIsShuttleSheetVisible] = useState(false);
  const shuttleAvailability = useShuttleServiceAvailability({
    direction: 'pickup',
    trip: selectedTrip,
    point: selectedPickUp,
  });
  const refetchStation = shuttleAvailability.refetch;

  React.useEffect(() => {
    setHighestStep(currentLeg === 'outbound' ? 3 : 7);
  }, [setHighestStep, currentLeg]);

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
        disabledReasonKey={item.disabledReasonKey}
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
          seatBadges={seatBadges}
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
            direction="pickup"
            visible={isShuttleSheetVisible}
            stationId={selectedTrip.originStationId}
            stationName={selectedTrip.departureStation}
            stationLatitude={shuttleAvailability.stationLatitude}
            stationLongitude={shuttleAvailability.stationLongitude}
            onClose={closeShuttleSheet}
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
