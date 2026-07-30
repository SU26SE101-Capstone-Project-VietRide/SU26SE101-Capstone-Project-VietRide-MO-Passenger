import React, { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, FunnelSimple } from 'phosphor-react-native';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import { fontFamilies, fontSizes, spacing, type AppTheme } from '@shared/theme';

export interface StepProgressBarProps {
  step: number;
  highestStepReached?: number;
  onStepPress?: (step: number) => void;
  onCancel: () => void;
  title: string;
  subtitle?: string;
  onFilter?: () => void;
}

const STEP_LABEL_KEYS = [
  'parcel.progress.origin',
  'parcel.progress.destination',
  'parcel.progress.item',
  'parcel.progress.payment',
] as const;

function StepProgressBarComponent({
  step,
  highestStepReached = 1,
  onStepPress,
  onCancel,
  title,
  subtitle,
  onFilter,
}: StepProgressBarProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.navbar}>
      <View style={styles.navHeaderRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('parcel.actions.goBack')}
          hitSlop={8}
          style={({ pressed }) => [
            styles.navButtonLeft,
            pressed ? styles.pressed : null,
          ]}
          onPress={onCancel}
        >
          <ArrowLeft size={18} color={theme.colors.primary} />
        </Pressable>

        <View style={styles.navHeaderTitleContainer}>
          {subtitle ? (
            <Text style={styles.navSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
          <Text style={styles.navTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {onFilter ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('parcel.stations.filterAccessibility')}
            hitSlop={8}
            style={({ pressed }) => [
              styles.navButtonRight,
              pressed ? styles.pressed : null,
            ]}
            onPress={onFilter}
          >
            <FunnelSimple
              size={19}
              weight="bold"
              color={theme.colors.textInverse}
            />
          </Pressable>
        ) : (
          <View style={styles.navButtonPlaceholder} />
        )}
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarActive,
              { width: `${((step - 1) / 3) * 100}%` },
            ]}
          />
        </View>
        <View style={styles.stepsRow}>
          {STEP_LABEL_KEYS.map((labelKey, index) => {
            const stepNumber = index + 1;
            const label = t(labelKey);
            const isActive = stepNumber === step;
            const isCompleted = stepNumber < step;
            const isDisabled = !onStepPress || stepNumber > highestStepReached;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('parcel.progress.stepAccessibility', {
                  label,
                  step: stepNumber,
                  total: STEP_LABEL_KEYS.length,
                })}
                accessibilityState={{
                  selected: isActive,
                  disabled: isDisabled,
                }}
                key={labelKey}
                style={styles.stepContainer}
                disabled={isDisabled}
                onPress={() => onStepPress?.(stepNumber)}
              >
                <View
                  style={[
                    styles.stepBubble,
                    isActive ? styles.stepBubbleActive : null,
                    isCompleted ? styles.stepBubbleCompleted : null,
                  ]}
                >
                  {isCompleted ? (
                    <Check
                      size={12}
                      color={theme.colors.textInverse}
                      weight="bold"
                    />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        isActive ? styles.stepNumberActive : null,
                      ]}
                    >
                      {stepNumber}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    isActive ? styles.stepLabelActive : null,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export const StepProgressBar = memo(StepProgressBarComponent);

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
  navButtonPlaceholder: {
    width: 36,
    height: 36,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  navHeaderTitleContainer: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  navTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.primaryDark,
    maxWidth: '100%',
  },
  navSubtitle: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
    marginBottom: 2,
    maxWidth: '100%',
  },
  progressContainer: {
    marginTop: spacing.xs,
  },
  progressBarBackground: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceSoft
      : theme.colors.surfaceAlt,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBarActive: {
    height: '100%',
    borderRadius: 1.5,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSheen
      : theme.colors.primary,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: -10,
  },
  stepContainer: {
    alignItems: 'center',
    width: 44,
  },
  stepBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceStrong
      : theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBubbleActive: {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  stepBubbleCompleted: {
    backgroundColor: theme.colors.primary,
  },
  stepNumber: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  stepNumberActive: {
    color: theme.colors.textInverse,
  },
  stepLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    color: theme.colors.primary,
    marginTop: 4,
    opacity: 0.7,
  },
  stepLabelActive: {
    fontFamily: fontFamilies.bold,
    opacity: 1,
  },
});
