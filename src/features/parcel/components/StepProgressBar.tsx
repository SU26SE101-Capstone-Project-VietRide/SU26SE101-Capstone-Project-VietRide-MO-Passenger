import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ArrowLeft, FunnelSimple, X, Check } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

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
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.navbar}>
      {/* Row 1: Header Controls */}
      <View style={styles.navHeaderRow}>
        <Pressable style={({ pressed }) => [styles.navButtonLeft, pressed ? styles.pressed : null]} onPress={onCancel}>
          <ArrowLeft size={18} color={theme.colors.primary} />
        </Pressable>

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
          <Pressable style={({ pressed }) => [styles.navButtonRight, pressed ? styles.pressed : null]} onPress={handleFilter}>
            <FunnelSimple size={19} weight="bold" color={theme.colors.textInverse} />
          </Pressable>
        ) : (
          <Pressable style={({ pressed }) => [styles.navButtonCancel, pressed ? styles.pressed : null]} onPress={onCancel}>
            <X size={18} color={theme.colors.primary} />
          </Pressable>
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
              <Pressable
                key={`step-${s}`} 
                style={styles.stepBubbleContainerInsideNavbar}
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
                    <Check size={12} color={theme.colors.textInverse} weight="bold" />
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
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) => ({
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
    backgroundColor: theme.colors.primaryFaded,
  },
  navButtonRight: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
  },
  navButtonCancel: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: theme.colors.primaryFaded,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
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
    color: theme.colors.primaryDark,
  },
  navSubtitleTeal: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    color: theme.colors.primary,
    marginBottom: 2,
  },
  progressContainerInsideNavbar: {
    marginTop: spacing.xs,
  },
  progressBarBgInsideNavbar: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBarActiveInsideNavbar: {
    height: '100%',
    borderRadius: 1.5,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSheen : theme.colors.primary,
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
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBubbleActiveInsideNavbar: {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  stepBubbleCompletedInsideNavbar: {
    backgroundColor: theme.colors.primary,
  },
  stepTextInsideNavbar: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  stepTextActiveInsideNavbar: {
    color: theme.colors.textInverse,
  },
  stepTextCompletedInsideNavbar: {
    color: theme.colors.textInverse,
  },
  stepSubtext: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    color: theme.colors.primary,
    marginTop: 4,
    opacity: 0.7,
  },
  stepSubtextActive: {
    fontFamily: fontFamilies.bold,
    opacity: 1,
  },
});
