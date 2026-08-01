/**
 * AuthProgressBar — Step indicator for auth flow
 *
 * Mirrors Parcel's StepProgressBar layout (back button | title | cancel)
 * plus a compact 3-step bubble tracker underneath.
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowLeft, X } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';

export interface AuthProgressBarProps {
  step: number;
  totalSteps: number;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  onCancel?: () => void;
}

export const AuthProgressBar = ({
  step,
  totalSteps,
  title,
  subtitle,
  onBack,
  onCancel,
}: AuthProgressBarProps): React.JSX.Element => {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.root}>
    {/* Row 1: controls */}
    <View style={styles.controlsRow}>
      {onBack ? (
        <TouchableOpacity
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
          onPress={onBack}
          activeOpacity={0.7}
          style={styles.iconBtn}
        >
          <ArrowLeft size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconBtn} />
      )}

      <View style={styles.titleWrap}>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {title ? <Text style={styles.title}>{title}</Text> : null}
      </View>

      {onCancel ? (
        <TouchableOpacity
          accessibilityLabel={t('common.cancel')}
          accessibilityRole="button"
          onPress={onCancel}
          activeOpacity={0.7}
          style={styles.iconBtn}
        >
          <X size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconBtn} />
      )}
    </View>

    {/* Row 2: step bubbles + progress track */}
    <View style={styles.progressRow}>
      <View style={styles.trackBg}>
        <View style={[styles.trackFill, { width: `${((step - 1) / (totalSteps - 1)) * 100}%` }]} />
      </View>
      <View style={styles.bubblesRow}>
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => {
          const isActive = s === step;
          const isDone = s < step;
          return (
            <View key={s} style={styles.bubbleWrap}>
              <View
                style={[
                  styles.bubble,
                  isActive && styles.bubbleActive,
                  isDone && styles.bubbleDone,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleLabel,
                    (isActive || isDone) && styles.bubbleLabelInverse,
                  ]}
                >
                  {isDone ? '✓' : s}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) => ({
  root: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
  },
  titleWrap: { alignItems: 'center', flex: 1 },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    color: theme.colors.primary,
    marginBottom: 2,
  },
  progressRow: { marginTop: spacing.xs },
  trackBg: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  trackFill: {
    height: '100%',
    borderRadius: 1.5,
    backgroundColor: theme.colors.primary,
  },
  bubblesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bubbleWrap: { alignItems: 'center' },
  bubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  bubbleActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    ...theme.effects.cardShadow,
  },
  bubbleDone: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  bubbleLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  bubbleLabelInverse: { color: theme.colors.textInverse },
});
