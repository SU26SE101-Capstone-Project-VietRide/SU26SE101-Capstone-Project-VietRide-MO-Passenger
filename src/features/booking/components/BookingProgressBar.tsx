import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import { OUTBOUND_STEPS, RETURN_STEPS, CHECKOUT_STEP, PAYMENT_STEP } from '../store/useBookingStore';

interface BookingProgressBarProps {
  step: number;
  totalSteps?: number;
  onStepPress?: (step: number) => void;
}

const getStepLabel = (step: number, isRoundTrip: boolean): string => {
  if (isRoundTrip) {
    switch (step) {
      case 1: return 'Outbound Trip Selection';
      case 2: return 'Outbound Seat Selection';
      case 3: return 'Outbound Pick-up';
      case 4: return 'Outbound Drop-off';
      case 5: return 'Return Trip Selection';
      case 6: return 'Return Seat Selection';
      case 7: return 'Return Pick-up';
      case 8: return 'Return Drop-off';
      case 9: return 'Checkout';
      case 10: return 'Payment';
      default: return '';
    }
  } else {
    switch (step) {
      case 1: return 'Trip Selection';
      case 2: return 'Seat Selection';
      case 3: return 'Pick-up';
      case 4: return 'Drop-off';
      case 5: return 'Checkout';
      case 6: return 'Payment';
      default: return '';
    }
  }
};

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
  const stepLabel = getStepLabel(step, isRoundTrip);

  // Determine leg for visual styling
  const isReturnStep = (s: number) => isRoundTrip && s > OUTBOUND_STEPS && s < checkoutStep;
  const isCheckoutStep = (s: number) => s === checkoutStep;
  const isPaymentStep = (s: number) => s === paymentStep;

  return (
    <View style={styles.container}>
      <View style={styles.progressContainer}>
        {/* Current step label */}
        <View style={styles.stepLabelContainer}>
          <Text style={styles.stepLabel}>{stepLabel}</Text>
        </View>

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
  stepLabelContainer: {
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  stepLabel: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: colors.primary,
    textAlign: 'center',
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
});
