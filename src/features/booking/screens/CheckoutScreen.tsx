/** CheckoutScreen — Contact info + pick-up point + drop-off point selection
 *
 * Visual style: matches Parcel flow (gradient bg, mint palette, card surfaces)
 * Added: pick-up point selector (in addition to existing drop-off)
 */

import React, { useCallback, useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import {
  BookingLegSummaryCard,
  FloatingActionBar,
} from '../components';
import { buildBookingSeatBadges } from '../utils/seatPresentation';

interface CheckoutStepProps {
  onNext: (step: number) => void;
  onGoToStep: (step: number) => void;
}

export function CheckoutScreen({
  onNext,
  onGoToStep,
}: CheckoutStepProps): React.JSX.Element {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const {
    selectedSeats,
    selectedTrip,
    selectedPickUp,
    selectedDropOff,
    selectedShuttlePickup,
    totalPrice,
    searchParams,
    outboundState,
    returnState,
    setHighestStep,
    restoreLegForEdit,
  } = useBookingStore(useShallow((state) => ({
    selectedSeats: state.selectedSeats,
    selectedTrip: state.selectedTrip,
    selectedPickUp: state.selectedPickUp,
    selectedDropOff: state.selectedDropOff,
    selectedShuttlePickup: state.selectedShuttlePickup,
    totalPrice: state.totalPrice,
    searchParams: state.searchParams,
    outboundState: state.outboundState,
    returnState: state.returnState,
    setHighestStep: state.setHighestStep,
    restoreLegForEdit: state.restoreLegForEdit,
  })));
  const oneWayLeg = useMemo(() => ({
    trip: selectedTrip,
    seats: selectedSeats,
    pickUp: selectedPickUp,
    dropOff: selectedDropOff,
    shuttlePickup: selectedShuttlePickup,
  }), [selectedDropOff, selectedPickUp, selectedSeats, selectedShuttlePickup, selectedTrip]);

  const checkoutSeatBadges = useMemo(() => {
    return buildBookingSeatBadges({
      isRoundTrip: Boolean(searchParams.isRoundTrip),
      oneWay: { seats: selectedSeats, tripId: selectedTrip?.id },
      outbound: outboundState
        ? { seats: outboundState.seats, tripId: outboundState.trip?.id }
        : undefined,
      returnLeg: returnState
        ? { seats: returnState.seats, tripId: returnState.trip?.id }
        : undefined,
      outboundLabel: t('booking.header.outbound'),
      returnLabel: t('booking.header.return'),
    });
  }, [
    outboundState,
    returnState,
    searchParams.isRoundTrip,
    selectedSeats,
    selectedTrip?.id,
    t,
  ]);

  React.useEffect(() => {
    const checkoutStep = searchParams.isRoundTrip ? 9 : 5;
    setHighestStep(checkoutStep); // Checkout step depends on trip type
  }, [setHighestStep, searchParams.isRoundTrip]);

  const handleNext = useCallback(() => {
    const nextStep = searchParams.isRoundTrip ? 10 : 6; // Payment step
    onNext(nextStep);
  }, [onNext, searchParams.isRoundTrip]);
  const handleEditOneWay = useCallback(() => onGoToStep(1), [onGoToStep]);
  const handleEditOutbound = useCallback(() => {
    restoreLegForEdit('outbound');
    onGoToStep(1);
  }, [onGoToStep, restoreLegForEdit]);
  const handleEditReturn = useCallback(() => {
    restoreLegForEdit('return');
    onGoToStep(5);
  }, [onGoToStep, restoreLegForEdit]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('booking.checkout.title')}</Text>
      </View>

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="automatic"
        >
          {!searchParams.isRoundTrip ? (
            <BookingLegSummaryCard
              title={t('booking.checkout.departureTrip')}
              leg={oneWayLeg}
              onEdit={handleEditOneWay}
            />
          ) : null}

          {/* Outbound Leg */}
          {searchParams.isRoundTrip && outboundState ? (
            <BookingLegSummaryCard
              title={t('booking.checkout.departureTrip')}
              leg={outboundState}
              onEdit={handleEditOutbound}
            />
          ) : null}

          {/* Return Leg */}
          {searchParams.isRoundTrip && returnState ? (
            <BookingLegSummaryCard
              title={t('booking.checkout.returnTrip')}
              leg={returnState}
              onEdit={handleEditReturn}
            />
          ) : null}
        </ScrollView>

        <FloatingActionBar
          seatBadges={checkoutSeatBadges}
          totalPrice={totalPrice()}
          ctaLabel={t('common.continue')}
          onPress={handleNext}
        />
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
    paddingBottom: spacing.lg,
  },
  scroll: {
    flex: 1,
  },
});
