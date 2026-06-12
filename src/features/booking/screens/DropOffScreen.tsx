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
  const { dropOffPoints, selectedDropOff, selectDropOff, selectedSeats, totalPrice, currentLeg, searchParams, saveOutboundLeg, setHighestStep } = useBookingStore();

  React.useEffect(() => {
    setHighestStep(4);
  }, [setHighestStep]);

  const handleNext = useCallback(() => {
    if (searchParams.isRoundTrip && currentLeg === 'outbound') {
      saveOutboundLeg();
      onNext(1);
    } else {
      onNext(5);
    }
  }, [searchParams, currentLeg, saveOutboundLeg, onNext]);

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
              disabledReason={point.disabledReason}
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
