/** PickUpScreen — Dedicated screen to choose a pick-up point
 *
 * Visual style: matches Parcel flow (clean lists, vivid selection states)
 */

import React, { useCallback } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import { FloatingActionBar, StopOption } from '../components';

interface PickUpStepProps {
  onNext: (step: number) => void;
}

export function PickUpScreen({ onNext }: PickUpStepProps): React.JSX.Element {
  const {
    pickUpPoints,
    selectedPickUp,
    selectPickUp,
    selectedSeats,
    totalPrice,
    currentLeg,
    searchParams,
    setHighestStep,
  } = useBookingStore();
  const styles = useThemedStyles(createStyles);

  React.useEffect(() => {
    setHighestStep(currentLeg === 'outbound' ? 3 : 7);
  }, [setHighestStep, currentLeg]);

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
            ? (currentLeg === 'outbound' ? 'Select Outbound Pick-up' : 'Select Return Pick-up')
            : 'Select Pick-up Point'}
        </Text>
      </View>

        {/* Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {pickUpPoints.map((point) => (
            <StopOption
              key={point.id}
              id={point.id}
              name={point.name}
              address={point.address}
              time={point.time}
              status={point.status}
              refundAmount={point.refundAmount}
              disabledReason={point.disabledReason}
              isSelected={selectedPickUp?.id === point.id}
              onPress={() => selectPickUp(point)}
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
    paddingBottom: 200,
  },
});
