import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from 'phosphor-react-native';
import { useShallow } from 'zustand/react/shallow';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import {
  getBookingStepConfiguration,
  OUTBOUND_STEPS,
} from '../utils/bookingSteps';

interface BookingProgressBarProps {
  step: number;
  totalSteps?: number;
  onStepPress?: (step: number) => void;
}

const getStepLabelKey = (step: number, isRoundTrip: boolean): string => {
  if (isRoundTrip) {
    switch (step) {
      case 1: return 'booking.steps.outboundTrip';
      case 2: return 'booking.steps.outboundSeats';
      case 3: return 'booking.steps.outboundPickup';
      case 4: return 'booking.steps.outboundDropoff';
      case 5: return 'booking.steps.returnTrip';
      case 6: return 'booking.steps.returnSeats';
      case 7: return 'booking.steps.returnPickup';
      case 8: return 'booking.steps.returnDropoff';
      case 9: return 'booking.steps.checkout';
      case 10: return 'booking.steps.payment';
      default: return 'booking.steps.unknown';
    }
  } else {
    switch (step) {
      case 1: return 'booking.steps.trip';
      case 2: return 'booking.steps.seats';
      case 3: return 'booking.steps.pickup';
      case 4: return 'booking.steps.dropoff';
      case 5: return 'booking.steps.checkout';
      case 6: return 'booking.steps.payment';
      default: return 'booking.steps.unknown';
    }
  }
};

export const BookingProgressBar = ({
  step,
  totalSteps: propTotalSteps,
  onStepPress
}: BookingProgressBarProps): React.JSX.Element => {
  const { t } = useTranslation();
  const { isRoundTrip, highestStepReached } = useBookingStore(useShallow((state) => ({
    isRoundTrip: state.searchParams.isRoundTrip ?? false,
    highestStepReached: state.highestStepReached,
  })));
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const stepConfiguration = getBookingStepConfiguration(isRoundTrip);
  const totalSteps = propTotalSteps ?? stepConfiguration.totalSteps;
  const { checkoutStep, paymentStep } = stepConfiguration;
  const maxAccessibleStep = Math.min(step, highestStepReached);
  const progressPercent = totalSteps > 1
    ? ((step - 1) / (totalSteps - 1)) * 100
    : 100;

  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);
  const stepLabel = t(getStepLabelKey(step, isRoundTrip));

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
              { width: `${progressPercent}%` },
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
            const isPending = !isActive && !isCompleted;
            const isDisabled = !onStepPress || s > maxAccessibleStep;
            return (
              <Pressable
                key={`step-${s}`}
                accessibilityRole="button"
                accessibilityLabel={t('booking.steps.accessibilityLabel', {
                  current: s,
                  total: totalSteps,
                  label: t(getStepLabelKey(s, isRoundTrip)),
                })}
                accessibilityState={{
                  selected: isActive,
                  disabled: isDisabled,
                }}
                style={({ pressed }) => [
                  styles.stepBubbleContainer,
                  pressed && !isDisabled ? styles.stepBubblePressed : null,
                ]}
                disabled={isDisabled}
                onPress={() => onStepPress?.(s)}
              >
                <View
                  style={[
                    styles.stepBubble,
                    isPending && isReturn && styles.stepBubbleReturn,
                    isPending && isCheckout && styles.stepBubbleCheckout,
                    isPending && isPayment && styles.stepBubblePayment,
                    isCompleted && styles.stepBubbleCompleted,
                    isActive && styles.stepBubbleActive,
                  ]}
                >
                  {isCompleted ? (
                    <Check size={12} color={theme.colors.textInverse} weight="bold" />
                  ) : (
                    <Text
                      style={[
                        styles.stepText,
                        isPending && isReturn && styles.stepTextReturn,
                        isPending && isCheckout && styles.stepTextCheckout,
                        isPending && isPayment && styles.stepTextPayment,
                        isActive && styles.stepTextActive,
                      ]}
                    >
                      {s}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) => ({
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
    color: theme.colors.primary,
    textAlign: 'center',
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.effects.contentSurfaceSoft,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBarActive: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
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
  stepBubblePressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  stepBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.effects.contentSurfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.effects.contentBorder,
  },
  stepBubbleActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorderStrong : theme.colors.primaryFaded,
    ...theme.effects.cardShadow,
  },
  stepBubbleCompleted: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorderStrong : theme.colors.primaryFaded,
  },
  // Return leg steps (5-8) - muted styling
  stepBubbleReturn: {
    backgroundColor: theme.effects.contentSurface,
    borderColor: theme.effects.contentBorder,
  },
  // Checkout step (9)
  stepBubbleCheckout: {
    backgroundColor: theme.effects.contentSurface,
    borderColor: theme.effects.contentBorder,
  },
  // Payment step (10)
  stepBubblePayment: {
    backgroundColor: theme.effects.contentSurface,
    borderColor: theme.effects.contentBorder,
  },
  stepText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  stepTextActive: {
    color: theme.colors.textInverse,
  },
  stepTextReturn: {
    color: theme.colors.textTertiary,
  },
  stepTextCheckout: {
    color: theme.colors.textTertiary,
  },
  stepTextPayment: {
    color: theme.colors.textTertiary,
  },
});
