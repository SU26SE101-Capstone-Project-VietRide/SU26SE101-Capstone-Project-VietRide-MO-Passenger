import React, { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Check,
  FunnelSimple,
  MapPin,
  PencilSimple,
} from 'phosphor-react-native';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useResponsiveLayout, useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';

export interface StepProgressBarProps {
  step: number;
  highestStepReached?: number;
  onStepPress?: (step: number) => void;
  onCancel: () => void;
  title: string;
  subtitle?: string;
  onFilter?: () => void;
  routeSummary?: {
    from: string;
    to: string;
    onPress: () => void;
  };
}

const STEP_LABEL_KEYS = [
  'parcel.progress.stationDate',
  'parcel.progress.item',
  'parcel.progress.delivery',
  'parcel.progress.confirm',
] as const;

function StepProgressBarComponent({
  step,
  highestStepReached = 1,
  onStepPress,
  onCancel,
  title,
  subtitle,
  onFilter,
  routeSummary,
}: StepProgressBarProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const { isCompact } = useResponsiveLayout();

  return (
    <View style={[styles.navbar, isCompact ? styles.navbarCompact : null]}>
      <View style={styles.navHeaderRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
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

          {routeSummary?.from && routeSummary?.to ? (
            <Pressable
              testID="parcel-header-route-button"
              accessibilityRole="button"
              accessibilityLabel={t('parcel.route.summaryAccessibility', {
                from: routeSummary.from,
                to: routeSummary.to,
              })}
              accessibilityHint={t('parcel.route.summaryAccessibilityHint')}
              onPress={routeSummary.onPress}
              style={({ pressed }) => [
                styles.headerRoutePill,
                pressed ? styles.pressed : null,
              ]}
            >
              <MapPin size={14} color={theme.colors.primary} weight="fill" />
              <View style={styles.headerRouteStack}>
                <Text
                  testID="parcel-header-route-origin"
                  style={styles.headerRouteText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {routeSummary.from}
                </Text>
                <Text
                  testID="parcel-header-route-arrow"
                  style={styles.headerRouteArrow}
                  accessible={false}
                >
                  →
                </Text>
                <Text
                  testID="parcel-header-route-destination"
                  style={styles.headerRouteText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {routeSummary.to}
                </Text>
              </View>
              <View style={styles.headerEditAction}>
                <Text style={styles.headerEditActionText}>
                  {t('parcel.actions.changeRouteShort')}
                </Text>
                <PencilSimple
                  size={13}
                  color={theme.colors.primary}
                  weight="bold"
                />
              </View>
            </Pressable>
          ) : null}
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
            testID="parcel-step-progress-fill"
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
                  ellipsizeMode="tail"
                  numberOfLines={2}
                  style={[
                    styles.stepLabel,
                    isCompact ? styles.stepLabelCompact : null,
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
  navbarCompact: {
    paddingHorizontal: spacing.md,
  },
  navHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navButtonLeft: {
    width: 44,
    height: 44,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: theme.colors.primaryFaded,
  },
  navButtonRight: {
    width: 44,
    height: 44,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
  },
  navButtonPlaceholder: {
    width: 44,
    height: 44,
    flexShrink: 0,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  navHeaderTitleContainer: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
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
  headerRoutePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: theme.colors.primaryFaded,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 4,
    width: '100%',
    maxWidth: '100%',
  },
  headerRouteStack: {
    flex: 1,
    minWidth: 0,
    gap: 0,
  },
  headerRouteText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.primaryDark,
    width: '100%',
    minWidth: 0,
  },
  headerRouteArrow: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs - 2,
    lineHeight: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  headerEditAction: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingLeft: spacing.sm,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
  },
  headerEditActionText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs - 1,
    color: theme.colors.primary,
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
    marginHorizontal: '12.5%',
    marginBottom: spacing.sm,
  },
  progressBarActive: {
    height: '100%',
    borderRadius: 1.5,
    backgroundColor: theme.colors.primary,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stepContainer: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  stepBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceSoft
      : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepBubbleActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    transform: [{ scale: 1.08 }],
  },
  stepBubbleCompleted: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  stepNumber: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs - 2,
    color: theme.colors.textSecondary,
  },
  stepNumberActive: {
    color: theme.colors.textInverse,
  },
  stepLabel: {
    width: '100%',
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs - 2,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 12,
  },
  stepLabelCompact: {
    fontSize: 9,
    lineHeight: 11,
  },
  stepLabelActive: {
    fontFamily: fontFamilies.bold,
    color: theme.colors.primary,
  },
});
