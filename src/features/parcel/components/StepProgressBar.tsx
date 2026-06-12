import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowLeft, Sliders, X, Check } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';

export interface StepProgressBarProps {
  step: number;
  highestStepReached?: number;
  onStepPress?: (step: number) => void;
  onCancel: () => void;
  onFilter?: () => void;
}

const STEP_LABELS = ['Origin', 'Dest', 'Item', 'Pay'];

export const StepProgressBar = ({ step, highestStepReached = 1, onStepPress, onCancel, onFilter = () => {} }: StepProgressBarProps): React.JSX.Element => {
  const handleFilter = onFilter;

  return (
    <View style={styles.navbar}>
      {/* Row 1: Header Controls */}
      <View style={styles.navHeaderRow}>
        <TouchableOpacity style={styles.navButtonLeft} onPress={onCancel} activeOpacity={0.7}>
          <ArrowLeft size={18} color={colors.primary} />
        </TouchableOpacity>

        <View style={styles.navHeaderTitleContainer}>
          {(step === 1 || step === 2) ? (
            <>
              <Text style={styles.navSubtitleTeal}>3 Stations</Text>
              <Text style={styles.navTitleLarge}>Ho Chi Minh ➔ Sapa</Text>
            </>
          ) : (
            <View style={styles.navTitleCenter} />
          )}
        </View>

        {(step === 1 || step === 2) ? (
          <TouchableOpacity style={styles.navButtonRight} onPress={handleFilter} activeOpacity={0.7}>
            <Sliders size={18} color={colors.textInverse} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.navButtonCancel} onPress={onCancel} activeOpacity={0.7}>
            <X size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Row 2: Compact Steps Tracker */}
      <View style={styles.progressContainerInsideNavbar}>
        <View style={styles.progressBarBgInsideNavbar}>
          <View
            style={[
              styles.progressBarActiveInsideNavbar,
              { width: `${((step - 1) / 3) * 100}%` },
            ]}
          />
        </View>
        <View style={styles.stepsRowInsideNavbar}>
          {[1, 2, 3, 4].map((s) => {
            const isActive = s === step;
            const isCompleted = s < step;
            return (
              <TouchableOpacity 
                key={`step-${s}`} 
                style={styles.stepBubbleContainerInsideNavbar}
                activeOpacity={0.7}
                disabled={!onStepPress || s > highestStepReached}
                onPress={() => onStepPress && onStepPress(s)}
              >
                <View
                  style={[
                    styles.stepBubbleInsideNavbar,
                    isActive && styles.stepBubbleActiveInsideNavbar,
                    isCompleted && styles.stepBubbleCompletedInsideNavbar,
                  ]}
                >
                  {isCompleted ? (
                    <Check size={12} color={colors.textInverse} weight="bold" />
                  ) : (
                    <Text
                      style={[
                        styles.stepTextInsideNavbar,
                        isActive && styles.stepTextActiveInsideNavbar,
                        isCompleted && styles.stepTextCompletedInsideNavbar,
                      ]}
                    >
                      {s}
                    </Text>
                  )}
                </View>
                <Text style={[styles.stepSubtext, isActive && styles.stepSubtextActive]}>
                  {STEP_LABELS[s - 1]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  navHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navButtonLeft: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.primaryFaded,
  },
  navButtonRight: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.primary,
  },
  navButtonCancel: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.primaryFaded,
  },
  navHeaderTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  navTitleCenter: {
    height: 20,
  },
  navTitleLarge: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.primaryDark,
  },
  navSubtitleTeal: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    color: colors.primary,
    marginBottom: 2,
  },
  progressContainerInsideNavbar: {
    marginTop: spacing.xs,
  },
  progressBarBgInsideNavbar: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBarActiveInsideNavbar: {
    height: '100%',
    borderRadius: 1.5,
    backgroundColor: colors.textInverse,
  },
  stepsRowInsideNavbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: -10, // overlap with progress bar line
  },
  stepBubbleContainerInsideNavbar: {
    alignItems: 'center',
    width: 44, // give fixed width to center text
  },
  stepBubbleInsideNavbar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.textInverse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBubbleActiveInsideNavbar: {
    backgroundColor: colors.primaryDark,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  stepBubbleCompletedInsideNavbar: {
    backgroundColor: colors.primaryDark,
  },
  stepTextInsideNavbar: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: colors.primary,
  },
  stepTextActiveInsideNavbar: {
    color: colors.textInverse,
  },
  stepTextCompletedInsideNavbar: {
    color: colors.textInverse,
  },
  stepSubtext: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    color: colors.primary,
    marginTop: 4,
    opacity: 0.7,
  },
  stepSubtextActive: {
    fontFamily: fontFamilies.bold,
    opacity: 1,
  },
});
