import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import { OUTBOUND_STEPS, RETURN_STEPS, CHECKOUT_STEP, PAYMENT_STEP } from '../store/useBookingStore';

export interface BookingProgressBarProps {
  step: number;
  totalSteps?: number;
  onStepPress?: (step: number) => void;
}

export const BookingProgressBar = ({
  step,
  totalSteps: propTotalSteps,
  onStepPress
}: BookingProgressBarProps): React.JSX.Element => {
  const { searchParams, highestStepReached } = useBookingStore();
  const isRoundTrip = searchParams.isRoundTrip ?? false;

  // Calculate total steps based on trip type
  const totalSteps = propTotalSteps ?? (isRoundTrip ? OUTBOUND_STEPS + RETURN_STEPS + 2 : OUTBOUND_STEPS + 2);

  // Determine checkout and payment step numbers based on trip type
  const checkoutStep = isRoundTrip ? CHECKOUT_STEP : OUTBOUND_STEPS + 2; // 9 or 5
  const paymentStep = isRoundTrip ? PAYMENT_STEP : OUTBOUND_STEPS + 3; // 10 or 6

  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  // Determine leg for visual styling
  const isReturnStep = (s: number) => isRoundTrip && s > OUTBOUND_STEPS && s < checkoutStep;
  const isCheckoutStep = (s: number) => s === checkoutStep;
  const isPaymentStep = (s: number) => s === paymentStep;

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
            const isReturn = isReturnStep(s);
            const isCheckout = isCheckoutStep(s);
            const isPayment = isPaymentStep(s);
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
                    isReturn && styles.stepBubbleReturn,
                    isActive && isReturn && styles.stepBubbleActiveReturn,
                    isCompleted && isReturn && styles.stepBubbleCompletedReturn,
                    isCheckout && styles.stepBubbleCheckout,
                    isActive && isCheckout && styles.stepBubbleActiveCheckout,
                    isPayment && styles.stepBubblePayment,
                    isActive && isPayment && styles.stepBubbleActivePayment,
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
                        isReturn && styles.stepTextReturn,
                        isCheckout && styles.stepTextCheckout,
                        isPayment && styles.stepTextPayment,
                      ]}
                    >
                      {s}
                    </Text>
                  )}
                </View>
                {/* Show labels only for Checkout and Payment steps */}
                {(isCheckout || isPayment) && (
                  <Text style={styles.finalStepLabel}>
                    {isCheckout ? 'Checkout' : 'Payment'}
                  </Text>
                )}
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
    backgroundColor: colors.primary,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: -16,
  },
  stepBubbleContainer: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingTop: 8,
  },
  stepBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E6F4F3',
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
  // Return leg steps (5-8) - muted styling
  stepBubbleReturn: {
    backgroundColor: colors.surface,
    borderColor: colors.divider,
  },
  stepBubbleActiveReturn: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryFaded,
  },
  stepBubbleCompletedReturn: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryFaded,
  },
  // Checkout step (9)
  stepBubbleCheckout: {
    backgroundColor: colors.surface,
    borderColor: colors.divider,
  },
  stepBubbleActiveCheckout: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryFaded,
  },
  // Payment step (10)
  stepBubblePayment: {
    backgroundColor: colors.surface,
    borderColor: colors.divider,
  },
  stepBubbleActivePayment: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryFaded,
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
  stepTextReturn: {
    color: colors.textTertiary,
  },
  stepTextCheckout: {
    color: colors.textTertiary,
  },
  stepTextPayment: {
    color: colors.textTertiary,
  },
  // Final step labels
  finalStepLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    marginTop: 2,
    textAlign: 'center',
    width: 50,
  },
});
