/** CheckoutScreen — Contact info + pick-up point + drop-off point selection
 *
 * Visual style: matches Parcel flow (gradient bg, mint palette, card surfaces)
 * Added: pick-up point selector (in addition to existing drop-off)
 */

import React, { useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { PencilSimple } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
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
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const {
    contactInfo,
    selectedSeats,
    totalPrice,
    searchParams,
    outboundState,
    returnState,
    setHighestStep,
  } = useBookingStore();

  React.useEffect(() => {
    const checkoutStep = searchParams.isRoundTrip ? 9 : 5;
    setHighestStep(checkoutStep); // Checkout step depends on trip type
  }, [setHighestStep, searchParams.isRoundTrip]);

  const handleNext = useCallback(() => {
    const nextStep = searchParams.isRoundTrip ? 10 : 6; // Payment step
    onNext(nextStep);
  }, [onNext, searchParams.isRoundTrip]);

  const renderLegSummary = (
    title: string,
    trip: any,
    seats: any[],
    pickUp: any,
    dropOff: any,
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
        <InfoRow label="Seats" value={seats?.map((s: any) => s.label || s.id || '?').join(', ')} showDivider />

        <View style={{ marginTop: spacing.md }}>
          <View style={styles.pickupDisplay}>
            <View style={styles.pickupIconBox}>
              <Text style={{ fontSize: 16 }}>📍</Text>
            </View>
            <View style={styles.pickupTextWrap}>
              <Text style={styles.pickupLabel}>Boarding at {pickUp?.time || ''}</Text>
              <Text style={styles.pickupValue}>{pickUp?.name || 'Select pick-up point'}</Text>
            </View>
          </View>
          <Text style={styles.pickupHint}>{pickUp?.address || ''}</Text>
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <View style={styles.pickupDisplay}>
            <View style={styles.pickupIconBox}>
              <Text style={{ fontSize: 16 }}>📍</Text>
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
        >
          {/* Contact Info Card */}
          <SectionCard>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Contact Info</Text>
              <Pressable style={({ pressed }) => [styles.editButton, pressed ? styles.editButtonPressed : null]}>
                <PencilSimple size={14} weight="bold" color={theme.colors.primary} />
              </Pressable>
            </View>

            <InfoRow label="Full Name" value={contactInfo.fullName} />
            <InfoRow
              label="Phone Number"
              value={contactInfo.phone}
              showDivider
            />
            <InfoRow label="Email Address" value={contactInfo.email} />
          </SectionCard>

          {/* Outbound Leg */}
          {outboundState && (
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
          selectedSeats={selectedSeats}
          totalPrice={totalPrice()}
          ctaLabel="Next"
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
    paddingBottom: 220,
  },
  cardTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h3,
    color: theme.colors.textPrimary,
    marginBottom: spacing.xl,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
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
  pickupDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1.2,
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
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    marginBottom: 2,
  },
  pickupValue: {
    fontFamily: fontFamilies.medium,
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
