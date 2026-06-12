/** CheckoutScreen — Contact info + pick-up point + drop-off point selection
 *
 * Visual style: matches Parcel flow (gradient bg, mint palette, card surfaces)
 * Added: pick-up point selector (in addition to existing drop-off)
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { PencilSimple } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
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

export function CheckoutScreen({ onNext, onGoToStep }: CheckoutStepProps): React.JSX.Element {
  const {
    contactInfo,
    selectedSeats,
    totalPrice,
    selectedDropOff,
    selectDropOff,
    pickUpPoints,
    selectedPickUp,
    selectPickUp,
    searchParams,
    outboundState,
    selectedTrip,
    setHighestStep,
  } = useBookingStore();

  React.useEffect(() => {
    setHighestStep(5);
  }, [setHighestStep]);

  const handleNext = useCallback(() => {
    onNext(6);
  }, [onNext]);

  const renderLegSummary = (title: string, trip: any, seats: any[], pickUp: any, dropOff: any, onEdit: () => void) => {
    if (!trip) return null;
    return (
      <SectionCard>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>{title}</Text>
          <TouchableOpacity style={styles.editButton} onPress={onEdit}>
            <PencilSimple size={14} weight="bold" color={colors.primary} />
          </TouchableOpacity>
        </View>

        <InfoRow label="Route" value={`${trip.departure} → ${trip.destination}`} />
        <InfoRow label="Departure Time" value={`${trip.date} • ${trip.time}`} />
        <InfoRow label="Seats" value={seats.map((s: any) => s.id).join(', ')} showDivider />

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
              <TouchableOpacity style={styles.editButton}>
                <PencilSimple size={14} weight="bold" color={colors.primary} />
              </TouchableOpacity>
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
          {outboundState ? (
            renderLegSummary('Departure Trip', outboundState.trip, outboundState.seats, outboundState.pickUp, outboundState.dropOff, () => {
              useBookingStore.setState({ currentLeg: 'outbound', outboundState: null, highestStepReached: 1 });
              onGoToStep(1);
            })
          ) : (
            renderLegSummary(searchParams.isRoundTrip ? 'Departure Trip' : 'Trip Details', selectedTrip, selectedSeats, selectedPickUp, selectedDropOff, () => {
              onGoToStep(1);
            })
          )}

          {/* Return Leg */}
          {searchParams.isRoundTrip && outboundState && (
            renderLegSummary('Return Trip', selectedTrip, selectedSeats, selectedPickUp, selectedDropOff, () => {
              useBookingStore.setState({ currentLeg: 'return' });
              onGoToStep(1);
            })
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

const styles = StyleSheet.create({
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
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 220,
  },
  cardTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h3,
    color: colors.textPrimary,
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
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1.2,
    borderColor: colors.divider,
  },
  pickupIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupTextWrap: {
    flex: 1,
  },
  pickupLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  pickupValue: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  pickupHint: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
});
