import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
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

const STEP_SLOT_WIDTH = 48;

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
  const scrollRef = useRef<ScrollView>(null);
  const viewportWidthRef = useRef(0);
  const contentWidthRef = useRef(0);

  const scrollCurrentStepIntoView = useCallback(() => {
    const viewportWidth = viewportWidthRef.current;
    const contentWidth = contentWidthRef.current;
    if (viewportWidth <= 0 || contentWidth <= 0 || totalSteps <= 0) {
      return;
    }

    const slotWidth = contentWidth / totalSteps;
    const target = (step - 0.5) * slotWidth - viewportWidth / 2;
    const maxOffset = Math.max(0, contentWidth - viewportWidth);
    scrollRef.current?.scrollTo({
      x: Math.min(maxOffset, Math.max(0, target)),
      animated: true,
    });
  }, [step, totalSteps]);

  useEffect(() => {
    scrollCurrentStepIntoView();
  }, [scrollCurrentStepIntoView]);

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

        <ScrollView
          ref={scrollRef}
          horizontal
          nestedScrollEnabled
          bounces={false}
          overScrollMode="never"
          showsHorizontalScrollIndicator={isRoundTrip}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.trackContent}
          onLayout={(event) => {
            viewportWidthRef.current = event.nativeEvent.layout.width;
            scrollCurrentStepIntoView();
          }}
          onContentSizeChange={(width) => {
            contentWidthRef.current = width;
            scrollCurrentStepIntoView();
          }}
        >
        <View
          style={[
            styles.trackInner,
            { minWidth: totalSteps * STEP_SLOT_WIDTH },
          ]}
        >
        {isRoundTrip ? (
          <View style={styles.legLabels} accessibilityRole="summary">
            <Text style={[styles.legLabel, styles.legLabelMain]}>
              {t('booking.header.outbound')}
            </Text>
            <Text style={[styles.legLabel, styles.legLabelMain]}>
              {t('booking.header.return')}
            </Text>
            <Text style={styles.legLabel}>{t('booking.steps.checkout')}</Text>
          </View>
        ) : null}

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
        </ScrollView>
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
  trackContent: {
    flexGrow: 1,
    paddingTop: spacing.xs,
  },
  trackInner: {
    flexGrow: 1,
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
  legLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  legLabel: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  legLabelMain: { flex: 2 },
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
    width: STEP_SLOT_WIDTH,
    minWidth: STEP_SLOT_WIDTH,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
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
