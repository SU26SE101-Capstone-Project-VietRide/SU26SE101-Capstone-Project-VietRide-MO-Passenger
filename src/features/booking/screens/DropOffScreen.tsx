/** DropOffScreen — Dedicated screen to choose a drop-off point
 *
 * Visual style: matches Parcel flow (clean lists, vivid selection states)
 */

import React, { useCallback } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import { FloatingActionBar, StopOption } from '../components';

interface DropOffStepProps {
  onNext: (step: number) => void;
}

export function DropOffScreen({ onNext }: DropOffStepProps): React.JSX.Element {
  const {
    dropOffPoints,
    selectedDropOff,
    selectDropOff,
    selectedSeats,
    totalPrice,
    currentLeg,
    isRoundTrip,
    saveOutboundLeg,
    saveReturnLeg,
    saveOneWayLeg,
    setHighestStep,
  } = useBookingStore(useShallow((state) => ({
    dropOffPoints: state.dropOffPoints,
    selectedDropOff: state.selectedDropOff,
    selectDropOff: state.selectDropOff,
    selectedSeats: state.selectedSeats,
    totalPrice: state.totalPrice,
    currentLeg: state.currentLeg,
    isRoundTrip: state.searchParams.isRoundTrip ?? false,
    saveOutboundLeg: state.saveOutboundLeg,
    saveReturnLeg: state.saveReturnLeg,
    saveOneWayLeg: state.saveOneWayLeg,
    setHighestStep: state.setHighestStep,
  })));
  const styles = useThemedStyles(createStyles);

  React.useEffect(() => {
    if (isRoundTrip) {
      setHighestStep(currentLeg === 'outbound' ? 4 : 8);
    } else {
      setHighestStep(4); // One-way always outbound
    }
  }, [setHighestStep, currentLeg, isRoundTrip]);

  const handleNext = useCallback(() => {
    if (isRoundTrip) {
      if (currentLeg === 'outbound') {
        saveOutboundLeg();
        onNext(5); // Navigate to return TripResults (step 5)
      } else {
        // currentLeg === 'return'
        saveReturnLeg();
        onNext(9); // Navigate to Checkout (step 9)
      }
    } else {
      saveOneWayLeg();
      onNext(5); // Go to Checkout (step 5)
    }
  }, [currentLeg, isRoundTrip, onNext, saveOneWayLeg, saveOutboundLeg, saveReturnLeg]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isRoundTrip
            ? (currentLeg === 'outbound' ? 'Select Outbound Drop-off' : 'Select Return Drop-off')
            : 'Select Drop-off Point'}
        </Text>
      </View>

        {/* Content */}
        <ScrollView
          style={styles.scroll}
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
