import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';

export interface BookingProgressBarProps {
  step: number;
  totalSteps?: number;
  onStepPress?: (step: number) => void;
}

export const BookingProgressBar = ({ step, totalSteps = 6, onStepPress }: BookingProgressBarProps): React.JSX.Element => {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);
  const highestStepReached = useBookingStore(state => state.highestStepReached);

  return (
    <View style={styles.container}>
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarActive,
              { width: `${((step - 1) / (totalSteps - 1)) * 100}%` },
            ]}
          />
        </View>
        <View style={styles.stepsRow}>
          {steps.map((s) => {
            const isActive = s === step;
            const isCompleted = s < step;
            return (
              <TouchableOpacity
                key={`step-${s}`}
                style={styles.stepBubbleContainer}
                activeOpacity={0.7}
                disabled={!onStepPress || s > highestStepReached}
                onPress={() => onStepPress && onStepPress(s)}
              >
                <View
                  style={[
                    styles.stepBubble,
                    isActive && styles.stepBubbleActive,
                    isCompleted && styles.stepBubbleCompleted,
                  ]}
                >
                  {isCompleted ? (
                    <Check size={12} color={colors.textInverse} weight="bold" />
                  ) : (
                    <Text
                      style={[
                        styles.stepText,
                        isActive && styles.stepTextActive,
                        isCompleted && styles.stepTextCompleted,
                      ]}
                    >
                      {s}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  progressContainer: {
    marginTop: spacing.xs,
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBarActive: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.primary, // Using primary color for booking flow
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -16, // pull up to overlap with line
  },
  stepBubbleContainer: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  stepBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E6F4F3', // match background to create gap effect
  },
  stepBubbleActive: {
    backgroundColor: colors.primary,
    borderColor: '#E6F4F3',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  stepBubbleCompleted: {
    backgroundColor: colors.primary,
    borderColor: '#E6F4F3',
  },
  stepText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  stepTextActive: {
    color: colors.textInverse,
  },
  stepTextCompleted: {
    color: colors.textInverse,
  },
});
