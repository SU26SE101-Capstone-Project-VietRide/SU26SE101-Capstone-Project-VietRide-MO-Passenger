/** CheckoutScreen — Contact info + pick-up point + drop-off point selection
 *
 * Visual style: matches Parcel flow (gradient bg, mint palette, card surfaces)
 * Added: pick-up point selector (in addition to existing drop-off)
 */

import React, { useCallback, useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import type { RootStackParamList } from '@app/navigation/types';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useResponsiveLayout, useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { isUuid } from '@shared/utils/pathSegment';
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

type CheckoutNavigation = NativeStackNavigationProp<RootStackParamList>;

export function CheckoutScreen({
  onNext,
  onGoToStep,
}: CheckoutStepProps): React.JSX.Element {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const { contentPaddingHorizontal } = useResponsiveLayout();
  const navigation = useNavigation<CheckoutNavigation>();
  const {
    selectedSeats,
    selectedTrip,
    selectedPickUp,
    selectedDropOff,
    selectedShuttlePickup,
    selectedShuttleDropoff,
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
    selectedShuttleDropoff: state.selectedShuttleDropoff,
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
    shuttleDropoff: selectedShuttleDropoff,
  }), [
    selectedDropOff,
    selectedPickUp,
    selectedSeats,
    selectedShuttleDropoff,
    selectedShuttlePickup,
    selectedTrip,
  ]);

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
    setHighestStep(checkoutStep);
  }, [setHighestStep, searchParams.isRoundTrip]);

  const handleNext = useCallback(() => {
    const nextStep = searchParams.isRoundTrip ? 10 : 6;
    onNext(nextStep);
  }, [onNext, searchParams.isRoundTrip]);
  const editOneWay = useCallback((step: number) => onGoToStep(step), [onGoToStep]);
  const editOutbound = useCallback((step: number) => {
    restoreLegForEdit('outbound');
    onGoToStep(step);
  }, [onGoToStep, restoreLegForEdit]);
  const editReturn = useCallback((step: number) => {
    restoreLegForEdit('return');
    onGoToStep(step);
  }, [onGoToStep, restoreLegForEdit]);
  const openOperatorPolicies = useCallback((
    operatorId: string | undefined,
    operatorName: string | undefined,
  ) => {
    if (!operatorId || !isUuid(operatorId)) return;
    navigation.navigate('PolicyList', {
      operatorId,
      ...(operatorName ? { operatorName } : {}),
    });
  }, [navigation]);
  const openOneWayPolicies = useCallback(() => {
    openOperatorPolicies(selectedTrip?.operatorId, selectedTrip?.operatorBadge);
  }, [openOperatorPolicies, selectedTrip?.operatorBadge, selectedTrip?.operatorId]);
  const openOutboundPolicies = useCallback(() => {
    openOperatorPolicies(
      outboundState?.trip?.operatorId,
      outboundState?.trip?.operatorBadge,
    );
  }, [
    openOperatorPolicies,
    outboundState?.trip?.operatorBadge,
    outboundState?.trip?.operatorId,
  ]);
  const openReturnPolicies = useCallback(() => {
    openOperatorPolicies(
      returnState?.trip?.operatorId,
      returnState?.trip?.operatorBadge,
    );
  }, [
    openOperatorPolicies,
    returnState?.trip?.operatorBadge,
    returnState?.trip?.operatorId,
  ]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingHorizontal: contentPaddingHorizontal }]}>
        <Text style={styles.headerTitle}>{t('booking.checkout.title')}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: contentPaddingHorizontal },
        ]}
        contentInsetAdjustmentBehavior="automatic"
      >
        {!searchParams.isRoundTrip ? (
          <BookingLegSummaryCard
            title={t('booking.checkout.departureTrip')}
            leg={oneWayLeg}
            onEditTrip={() => editOneWay(1)}
            onEditSeats={() => editOneWay(2)}
            onEditPickup={() => editOneWay(3)}
            onEditDropoff={() => editOneWay(4)}
            onViewPolicies={
              selectedTrip?.operatorId && isUuid(selectedTrip.operatorId)
                ? openOneWayPolicies
                : undefined
            }
          />
        ) : null}

        {searchParams.isRoundTrip && outboundState ? (
          <BookingLegSummaryCard
            title={t('booking.checkout.departureTrip')}
            leg={outboundState}
            onEditTrip={() => editOutbound(1)}
            onEditSeats={() => editOutbound(2)}
            onEditPickup={() => editOutbound(3)}
            onEditDropoff={() => editOutbound(4)}
            onViewPolicies={
              outboundState.trip?.operatorId
                && isUuid(outboundState.trip.operatorId)
                ? openOutboundPolicies
                : undefined
            }
          />
        ) : null}

        {searchParams.isRoundTrip && returnState ? (
          <BookingLegSummaryCard
            title={t('booking.checkout.returnTrip')}
            leg={returnState}
            onEditTrip={() => editReturn(5)}
            onEditSeats={() => editReturn(6)}
            onEditPickup={() => editReturn(7)}
            onEditDropoff={() => editReturn(8)}
            onViewPolicies={
              returnState.trip?.operatorId && isUuid(returnState.trip.operatorId)
                ? openReturnPolicies
                : undefined
            }
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  scroll: {
    flex: 1,
  },
});
