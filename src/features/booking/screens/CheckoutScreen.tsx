/** CheckoutScreen — Contact info + pick-up point + drop-off point selection
 *
 * Visual style: matches Parcel flow (gradient bg, mint palette, card surfaces)
 * Added: pick-up point selector (in addition to existing drop-off)
 */

import React, { useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { MapPinLine, PencilSimple } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import type { BusTrip, DropOffPoint, PickUpPoint, Seat } from '../types';
import {
  FloatingActionBar,
  SectionCard,
  InfoRow,
  ContactInfoModal,
} from '../components';

interface CheckoutStepProps {
  onNext: (step: number) => void;
  onGoToStep: (step: number) => void;
}

export function CheckoutScreen({
  onNext,
  onGoToStep,
}: CheckoutStepProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const {
    contactInfo,
    selectedSeats,
    selectedTrip,
    selectedPickUp,
    selectedDropOff,
    totalPrice,
    searchParams,
    outboundState,
    returnState,
    setHighestStep,
  } = useBookingStore();

  const [isContactModalVisible, setIsContactModalVisible] = React.useState(false);
  const [contactWarning, setContactWarning] = React.useState<string | null>(null);

  const isContactComplete = React.useMemo(
    () => Boolean(contactInfo.fullName.trim() && contactInfo.phone.trim() && contactInfo.idNumber.trim()),
    [contactInfo.fullName, contactInfo.idNumber, contactInfo.phone],
  );

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

  React.useEffect(() => {
    if (isContactComplete) {
      setContactWarning(null);
    }
  }, [isContactComplete]);

  const handleNext = useCallback(() => {
    if (!isContactComplete) {
      setContactWarning('Full name, phone number and ID number are required before payment.');
      setIsContactModalVisible(true);
      return;
    }

    const nextStep = searchParams.isRoundTrip ? 10 : 6; // Payment step
    onNext(nextStep);
  }, [isContactComplete, onNext, searchParams.isRoundTrip]);

  const renderLegSummary = (
    title: string,
    trip: BusTrip | null,
    seats: Seat[],
    pickUp: PickUpPoint | null,
    dropOff: DropOffPoint | null,
    onEdit: () => void
  ) => {
    if (!trip) return null;

    return (
      <SectionCard>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Pressable style={({ pressed }) => [styles.editButton, pressed ? styles.editButtonPressed : null]} onPress={onEdit}>
            <PencilSimple size={14} weight="bold" color={theme.colors.primary} />
          </Pressable>
        </View>

        <InfoRow label="Route" value={`${trip.departureCity || ''} → ${trip.arrivalCity || ''}`} />
        <InfoRow label="Departure Time" value={trip.departureTime || ''} />
        <InfoRow label="Seats" value={seats.map((seat) => seat.label || seat.id).join(', ')} showDivider />

        <View style={styles.locationBlock}>
          <View style={styles.pickupDisplay}>
            <View style={styles.pickupIconBox}>
              <MapPinLine size={18} weight="duotone" color={theme.colors.primary} />
            </View>
            <View style={styles.pickupTextWrap}>
              <Text style={styles.pickupLabel}>Boarding at {pickUp?.time || ''}</Text>
              <Text style={styles.pickupValue}>{pickUp?.name || 'Select pick-up point'}</Text>
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
              <Text style={styles.pickupLabel}>Alighting at {dropOff?.time || ''}</Text>
              <Text style={styles.pickupValue}>{dropOff?.name || 'Select drop-off point'}</Text>
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
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="automatic"
        >
          {/* Contact Info Card */}
          <SectionCard>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Contact Info</Text>
              <Pressable 
                onPress={() => setIsContactModalVisible(true)}
                style={({ pressed }) => [styles.editButton, pressed ? styles.editButtonPressed : null]}
              >
                <PencilSimple size={14} weight="bold" color={theme.colors.primary} />
              </Pressable>
            </View>

            <InfoRow label="Full Name" value={contactInfo.fullName} />
            <InfoRow
              label="Phone Number"
              value={contactInfo.phone}
              showDivider
            />
            <InfoRow label="Email Address" value={contactInfo.email} showDivider />
            <InfoRow label="ID Number" value={contactInfo.idNumber || 'Required'} />
            {contactWarning ? (
              <Text style={styles.contactWarning}>{contactWarning}</Text>
            ) : null}
          </SectionCard>

          {!searchParams.isRoundTrip && (
            renderLegSummary(
              'Departure Trip',
              selectedTrip,
              selectedSeats,
              selectedPickUp,
              selectedDropOff,
              () => onGoToStep(1)
            )
          )}

          {/* Outbound Leg */}
          {searchParams.isRoundTrip && outboundState && (
            renderLegSummary(
              'Departure Trip',
              outboundState.trip,
              outboundState.seats,
              outboundState.pickUp,
              outboundState.dropOff,
              () => {
                useBookingStore.setState({ currentLeg: 'outbound', outboundState: null, highestStepReached: 1 });
                onGoToStep(1);
              }
            )
          )}

          {/* Return Leg */}
          {searchParams.isRoundTrip && returnState && (
            renderLegSummary(
              'Return Trip',
              returnState.trip,
              returnState.seats,
              returnState.pickUp,
              returnState.dropOff,
              () => {
                useBookingStore.setState({ currentLeg: 'return', returnState: null });
                onGoToStep(5);
              }
            )
          )}
        </ScrollView>

        <FloatingActionBar
          selectedSeats={checkoutSeats}
          totalPrice={totalPrice()}
          ctaLabel={isContactComplete ? 'Next' : 'Add Contact Info'}
          onPress={handleNext}
        />

        <ContactInfoModal 
          visible={isContactModalVisible} 
          onClose={() => setIsContactModalVisible(false)} 
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
    paddingBottom: 220,
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
  contactWarning: {
    marginTop: spacing.sm,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.error,
    lineHeight: 18,
  },
  locationBlock: {
    marginTop: spacing.md,
  },
  locationBlockLarge: {
    marginTop: spacing.lg,
  },
  pickupDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
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
