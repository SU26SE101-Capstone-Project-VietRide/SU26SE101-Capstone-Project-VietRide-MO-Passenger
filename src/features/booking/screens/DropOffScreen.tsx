/** DropOffScreen — Dedicated screen to choose a drop-off point
 *
 * Visual style: matches Parcel flow (clean lists, vivid selection states)
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import { FloatingActionBar, StopOption } from '../components';

interface DropOffStepProps {
  onNext: (step: number) => void;
}

export function DropOffScreen({ onNext }: DropOffStepProps): React.JSX.Element {
  const { dropOffPoints, selectedDropOff, selectDropOff, selectedSeats, totalPrice, currentLeg, searchParams, saveOutboundLeg, saveReturnLeg, setHighestStep, selectedTrip, selectedPickUp } = useBookingStore();

  React.useEffect(() => {
    if (searchParams.isRoundTrip) {
      setHighestStep(currentLeg === 'outbound' ? 4 : 8);
    } else {
      setHighestStep(4); // One-way always outbound
    }
  }, [setHighestStep, currentLeg, searchParams.isRoundTrip]);

  const handleNext = useCallback(() => {
    if (searchParams.isRoundTrip) {
      if (currentLeg === 'outbound') {
        saveOutboundLeg();
        onNext(5); // Navigate to return TripResults (step 5)
      } else {
        // currentLeg === 'return'
        saveReturnLeg();
        onNext(9); // Navigate to Checkout (step 9)
      }
    } else {
      // One-way: save outbound state and stay on outbound leg
      useBookingStore.setState({
        outboundState: {
          trip: selectedTrip,
          seats: selectedSeats,
          pickUp: selectedPickUp,
          dropOff: selectedDropOff,
        },
        currentLeg: 'outbound',
        highestStepReached: 5,
      });
      onNext(5); // Go to Checkout (step 5)
    }
  }, [searchParams, currentLeg, saveOutboundLeg, saveReturnLeg, onNext, selectedTrip, selectedSeats, selectedPickUp, selectedDropOff]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {searchParams.isRoundTrip
            ? (currentLeg === 'outbound' ? 'Select Outbound Drop-off' : 'Select Return Drop-off')
            : 'Select Drop-off Point'}
        </Text>
      </View>

        {/* Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {dropOffPoints.map((point) => (
            <StopOption
              key={point.id}
              id={point.id}
              name={point.name}
              address={point.address}
              time={point.time}
              status={point.status}
              refundAmount={point.refundAmount}
              isSelected={selectedDropOff?.id === point.id}
              onPress={() => selectDropOff(point)}
              icon="📍"
            />
          ))}
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
    paddingTop: spacing.sm,
    paddingBottom: 200,
  },
});
