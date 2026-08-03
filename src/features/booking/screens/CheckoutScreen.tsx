/** CheckoutScreen — Contact info + pick-up point + drop-off point selection
 *
 * Visual style: matches Parcel flow (gradient bg, mint palette, card surfaces)
 * Added: pick-up point selector (in addition to existing drop-off)
 */

import React, { useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MapPinLine, PencilSimple, Van } from 'phosphor-react-native';
import { useShallow } from 'zustand/react/shallow';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import type {
  BusTrip,
  DropOffPoint,
  PickUpPoint,
  Seat,
  ShuttlePickupDraft,
} from '../types';
import {
  FloatingActionBar,
  SectionCard,
  InfoRow,
} from '../components';

interface CheckoutStepProps {
  onNext: (step: number) => void;
  onGoToStep: (step: number) => void;
}

export function CheckoutScreen({
  onNext,
  onGoToStep,
}: CheckoutStepProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
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
  const checkoutSeats = React.useMemo(() => {
    if (!searchParams.isRoundTrip) {
      return selectedSeats;
    }

    return [...(outboundState?.seats ?? []), ...(returnState?.seats ?? [])];
  }, [outboundState?.seats, returnState?.seats, searchParams.isRoundTrip, selectedSeats]);

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

  const renderLegSummary = (
    title: string,
    trip: BusTrip | null,
    seats: Seat[],
    pickUp: PickUpPoint | null,
    dropOff: DropOffPoint | null,
    shuttlePickup: ShuttlePickupDraft | null | undefined,
    onEdit: () => void
  ) => {
    if (!trip) return null;

    return (
      <SectionCard>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('booking.checkout.editLeg', { leg: title })}
            style={({ pressed }) => [styles.editButton, pressed ? styles.editButtonPressed : null]}
            onPress={onEdit}
          >
            <PencilSimple size={14} weight="bold" color={theme.colors.primary} />
          </Pressable>
        </View>

        <InfoRow
          label={t('booking.checkout.route')}
          value={`${trip.departureCity || t('common.notAvailable')} → ${trip.arrivalCity || t('common.notAvailable')}`}
        />
        <InfoRow
          label={t('booking.checkout.departureTime')}
          value={trip.departureTime || t('common.notAvailable')}
        />
        <InfoRow
          label={t('booking.checkout.seats')}
          value={seats.map((seat) => seat.label || seat.id).join(', ') || t('common.none')}
          showDivider
        />

        {shuttlePickup ? (
          <View style={styles.shuttleBlock}>
            <View style={styles.pickupIconBox}>
              <Van size={18} weight="duotone" color={theme.colors.primary} />
            </View>
            <View style={styles.pickupTextWrap}>
              <Text style={styles.pickupLabel}>{t('booking.checkout.shuttleRequest')}</Text>
              <Text style={styles.pickupValue}>{shuttlePickup.address}</Text>
              <Text style={styles.shuttleHint}>{t('booking.checkout.shuttleAwaiting')}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.locationBlock}>
          <View style={styles.pickupDisplay}>
            <View style={styles.pickupIconBox}>
              <MapPinLine size={18} weight="duotone" color={theme.colors.primary} />
            </View>
            <View style={styles.pickupTextWrap}>
              <Text style={styles.pickupLabel}>
                {t('booking.checkout.boardingAt', {
                  time: pickUp?.time || t('common.notAvailable'),
                })}
              </Text>
              <Text style={styles.pickupValue}>
                {pickUp?.name || t('booking.checkout.selectPickup')}
              </Text>
            </View>
          </View>
          <Text style={styles.pickupHint}>{pickUp?.address || ''}</Text>
        </View>

        <View style={styles.locationBlockLarge}>
          <View style={styles.pickupDisplay}>
            <View style={styles.pickupIconBox}>
              <MapPinLine size={18} weight="duotone" color={theme.colors.primary} />
            </View>
            <View style={styles.pickupTextWrap}>
              <Text style={styles.pickupLabel}>
                {t('booking.checkout.alightingAt', {
                  time: dropOff?.time || t('common.notAvailable'),
                })}
              </Text>
              <Text style={styles.pickupValue}>
                {dropOff?.name || t('booking.checkout.selectDropoff')}
              </Text>
            </View>
          </View>
          <Text style={styles.pickupHint}>{dropOff?.address || ''}</Text>
        </View>
      </SectionCard>
    );
  };

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
          {!searchParams.isRoundTrip && (
            renderLegSummary(
              t('booking.checkout.departureTrip'),
              selectedTrip,
              selectedSeats,
              selectedPickUp,
              selectedDropOff,
              selectedShuttlePickup,
              handleEditOneWay
            )
          )}

          {/* Outbound Leg */}
          {searchParams.isRoundTrip && outboundState && (
            renderLegSummary(
              t('booking.checkout.departureTrip'),
              outboundState.trip,
              outboundState.seats,
              outboundState.pickUp,
              outboundState.dropOff,
              outboundState.shuttlePickup,
              handleEditOutbound
            )
          )}

          {/* Return Leg */}
          {searchParams.isRoundTrip && returnState && (
            renderLegSummary(
              t('booking.checkout.returnTrip'),
              returnState.trip,
              returnState.seats,
              returnState.pickUp,
              returnState.dropOff,
              returnState.shuttlePickup,
              handleEditReturn
            )
          )}
        </ScrollView>

        <FloatingActionBar
          selectedSeats={checkoutSeats}
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
  cardTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.94 }],
  },
  locationBlock: {
    marginTop: spacing.md,
  },
  shuttleBlock: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.primaryFaded,
  },
  shuttleHint: {
    marginTop: spacing.xxs,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  locationBlockLarge: {
    marginTop: spacing.lg,
  },
  pickupDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: theme.effects.contentSurfaceSoft,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: theme.effects.contentBorder,
  },
  pickupIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupTextWrap: {
    flex: 1,
  },
  pickupLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    marginBottom: 2,
  },
  pickupValue: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  pickupHint: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
});
